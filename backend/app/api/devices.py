import json
import logging
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal, get_db
from app import models, schemas
from app.config import settings
from app.scanner.enricher import Enricher
from app.api.websocket import broadcast_to_network
from app.api.notifications import add_event

logger = logging.getLogger(__name__)
router = APIRouter(tags=["devices"])


def _snapshot_payload(devices_data: list[dict]) -> str:
    return json.dumps(
        {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "devices": devices_data,
            "edges": [],
        }
    )


async def _cleanup_old_snapshots(db: AsyncSession, network_id: int) -> None:
    """Keep only the last 50 snapshots per network."""
    subq = (
        select(models.Snapshot.id)
        .where(models.Snapshot.network_id == network_id)
        .order_by(models.Snapshot.captured_at.desc())
        .offset(50)
        .subquery()
    )
    await db.execute(delete(models.Snapshot).where(models.Snapshot.id.in_(select(subq.c.id))))
    await db.commit()


async def run_scan_job(network_id: int, job_id: str | None = None) -> None:
    """Background scan job: scan a network CIDR, upsert devices, create snapshot."""
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(
                select(models.Network).where(models.Network.id == network_id)
            )
            network = result.scalar_one_or_none()
            if not network:
                logger.warning("Network %s not found for scan job %s", network_id, job_id)
                return

            prev_result = await db.execute(
                select(models.Device).where(models.Device.network_id == network_id)
            )
            prev_devices = prev_result.scalars().all()
            prev_by_mac = {d.mac: d for d in prev_devices if d.mac}

            await broadcast_to_network(network_id, {"event": "scan_start"})

            enricher = Enricher()

            async def _progress(done: int, total: int) -> None:
                percent = int(100 * done / total) if total else 0
                await broadcast_to_network(
                    network_id, {"event": "scan_progress", "percent": percent}
                )

            devices_data = await enricher.scan_and_enrich(network.cidr, on_progress=_progress)
            now = datetime.utcnow()

            current_macs = {d.get("mac") for d in devices_data if d.get("mac")}

            for dev in devices_data:
                mac = dev.get("mac")
                if not mac:
                    continue
                prev = prev_by_mac.get(mac)
                if not prev:
                    await broadcast_to_network(
                        network_id, {"event": "new_device", "device": dev}
                    )
                    await add_event("new_device", dev)
                elif not prev.is_online:
                    await broadcast_to_network(
                        network_id, {"event": "device_online", "mac": mac}
                    )

            for mac, prev in prev_by_mac.items():
                if mac and mac not in current_macs and prev.is_online:
                    await broadcast_to_network(
                        network_id, {"event": "device_offline", "mac": mac}
                    )
                    await add_event("device_offline", {"mac": mac, "ip": prev.ip})

            for dev in devices_data:
                mac = dev.get("mac")
                if not mac:
                    continue
                res = await db.execute(
                    select(models.Device).where(models.Device.mac == mac)
                )
                existing = res.scalar_one_or_none()
                if existing:
                    existing.ip = dev.get("ip", existing.ip)
                    existing.hostname = dev.get("hostname", existing.hostname)
                    existing.vendor = dev.get("vendor", existing.vendor)
                    existing.last_seen = now
                    existing.is_online = True
                else:
                    new_device = models.Device(
                        ip=dev.get("ip"),
                        mac=mac,
                        hostname=dev.get("hostname"),
                        vendor=dev.get("vendor"),
                        first_seen=now,
                        last_seen=now,
                        is_online=True,
                        network_id=network_id,
                    )
                    db.add(new_device)

            snapshot = models.Snapshot(
                network_id=network_id,
                topology_json=_snapshot_payload(devices_data),
            )
            db.add(snapshot)
            await db.commit()

            await _cleanup_old_snapshots(db, network_id)

            offline_threshold = now - timedelta(seconds=settings.scan_interval_seconds * 2)
            await db.execute(
                update(models.Device)
                .where(
                    models.Device.last_seen < offline_threshold,
                    models.Device.is_online == True,
                )
                .values(is_online=False)
            )
            await db.commit()

            await broadcast_to_network(
                network_id, {"event": "scan_complete", "devices_found": len(devices_data)}
            )
            logger.info(
                "Scan job %s complete for network %s (%s): %d devices",
                job_id,
                network_id,
                network.cidr,
                len(devices_data),
            )
    except Exception as exc:
        logger.exception("Scan job %s failed", job_id)
        await broadcast_to_network(network_id, {"event": "scan_complete", "error": str(exc)})

@router.get("/devices", response_model=list[schemas.DeviceRead])
async def list_devices(
    online_only: bool = False,
    network_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> list[models.Device]:
    stmt = select(models.Device)
    if online_only:
        stmt = stmt.where(models.Device.is_online == True)
    if network_id is not None:
        stmt = stmt.where(models.Device.network_id == network_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


@router.get("/devices/{device_id}", response_model=schemas.DeviceRead)
async def get_device(
    device_id: int,
    db: AsyncSession = Depends(get_db),
) -> models.Device:
    result = await db.execute(
        select(models.Device).where(models.Device.id == device_id)
    )
    device = result.scalar_one_or_none()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device


@router.post("/networks/{network_id}/scan")
async def trigger_scan(
    network_id: int,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(models.Network).where(models.Network.id == network_id)
    )
    network = result.scalar_one_or_none()
    if not network:
        raise HTTPException(status_code=404, detail="Network not found")

    job_id = str(uuid.uuid4())
    background_tasks.add_task(run_scan_job, network_id, job_id)
    return {"accepted": True, "job_id": job_id}


@router.get("/snapshots", response_model=list[schemas.SnapshotRead])
async def list_snapshots(
    limit: int = 20,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
) -> list[models.Snapshot]:
    result = await db.execute(
        select(models.Snapshot)
        .limit(limit)
        .offset(offset)
        .order_by(models.Snapshot.captured_at.desc())
    )
    return list(result.scalars().all())


@router.get("/snapshots/latest", response_model=schemas.SnapshotRead)
async def get_latest_snapshot(
    network_id: int | None = None,
    db: AsyncSession = Depends(get_db),
) -> models.Snapshot:
    stmt = select(models.Snapshot).order_by(models.Snapshot.captured_at.desc())
    if network_id is not None:
        stmt = stmt.where(models.Snapshot.network_id == network_id)
    result = await db.execute(stmt.limit(1))
    snapshot = result.scalar_one_or_none()
    if not snapshot:
        raise HTTPException(status_code=404, detail="No snapshots found")
    return snapshot


@router.get("/snapshots/{snapshot_id}/diff", response_model=schemas.SnapshotDiff)
async def diff_snapshots(
    snapshot_id: int,
    compare_to: int,
    db: AsyncSession = Depends(get_db),
) -> schemas.SnapshotDiff:
    result = await db.execute(
        select(models.Snapshot).where(models.Snapshot.id.in_([snapshot_id, compare_to]))
    )
    snaps = {s.id: s for s in result.scalars().all()}

    if snapshot_id not in snaps:
        raise HTTPException(status_code=404, detail="Snapshot not found")
    if compare_to not in snaps:
        raise HTTPException(status_code=404, detail="Compare-to snapshot not found")

    newer = json.loads(snaps[snapshot_id].topology_json)
    older = json.loads(snaps[compare_to].topology_json)

    newer_devices = {d.get("mac"): d for d in newer.get("devices", []) if d.get("mac")}
    older_devices = {d.get("mac"): d for d in older.get("devices", []) if d.get("mac")}

    added = []
    removed = []
    changed = []

    for mac, dev in newer_devices.items():
        if mac not in older_devices:
            added.append(dev)
        else:
            old = older_devices[mac]
            if any(
                dev.get(k) != old.get(k)
                for k in ("ip", "hostname", "vendor", "is_online")
            ):
                changed.append({"current": dev, "previous": old})

    for mac, dev in older_devices.items():
        if mac not in newer_devices:
            removed.append(dev)

    return schemas.SnapshotDiff(added=added, removed=removed, changed=changed)
