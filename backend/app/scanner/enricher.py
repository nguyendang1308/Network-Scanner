import asyncio
import logging
import socket
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone

from app.scanner.arp_scanner import ARPScanner
from app.scanner.ping_scanner import PingScanner
from app.scanner.oui_lookup import OUILookup
from app.scanner.ping_sweep import ping_and_enrich

logger = logging.getLogger(__name__)


class Enricher:
    """Combines ARP scanning, OUI lookup, and hostname resolution."""

    def __init__(self):
        self.arp = ARPScanner()
        self.ping = PingScanner()
        self.oui = OUILookup()

    @staticmethod
    def _resolve_hostname(ip: str) -> str | None:
        """Blocking hostname resolution."""
        try:
            hostname, _, _ = socket.gethostbyaddr(ip)
            if hostname and hostname != ip:
                return hostname
        except Exception:
            pass

        try:
            fqdn = socket.getfqdn(ip)
            if fqdn and fqdn != ip:
                return fqdn
        except Exception:
            pass

        return None

    async def enrich_device(self, ip: str, mac: str) -> dict:
        """Enrich a single device with vendor, hostname, and timestamps.

        Returns dict with keys: ip, mac, vendor, hostname, first_seen, last_seen
        """
        logger.debug("Enriching device %s / %s", ip, mac)

        vendor = self.oui.get_vendor(mac)
        logger.debug("Vendor for %s: %s", mac, vendor)

        try:
            hostname = await asyncio.wait_for(
                asyncio.to_thread(self._resolve_hostname, ip), timeout=2.0
            )
        except asyncio.TimeoutError:
            hostname = None
        if hostname:
            logger.debug("Hostname for %s: %s", ip, hostname)
        else:
            logger.debug("No hostname resolved for %s", ip)

        now = datetime.now(timezone.utc).isoformat()

        return {
            "ip": ip,
            "mac": mac,
            "vendor": vendor,
            "hostname": hostname,
            "first_seen": now,
            "last_seen": now,
        }

    async def scan_and_enrich(
        self,
        cidr: str,
        on_progress: Callable[[int, int], Awaitable[None]] | None = None,
    ) -> list[dict]:
        """Scan a subnet and enrich all discovered devices.

        Returns list of enriched device dicts.
        """
        logger.info("Starting scan-and-enrich for %s", cidr)
        devices: list[dict] = []
        try:
            devices = await self.arp.scan_subnet(cidr, on_progress=on_progress)
        except RuntimeError as exc:
            logger.warning("ARP scan unavailable (%s), falling back to ping sweep", exc)
        except Exception as exc:
            logger.warning("ARP scan failed (%s), falling back to ping sweep", exc)

        if not devices:
            logger.info("ARP returned no devices; trying ping sweep for %s", cidr)
            devices = await self.ping.scan_subnet(cidr, on_progress=on_progress)

        if not devices:
            logger.info("No devices found in %s", cidr)
            return []

        # Enrich devices concurrently with semaphore to limit load
        sem = asyncio.Semaphore(20)

        async def _enrich(dev: dict) -> dict:
            async with sem:
                info = await self.enrich_device(dev["ip"], dev["mac"])
                info["latency_ms"] = dev.get("latency_ms", 0.0)
                info["timestamp"] = dev.get("timestamp", info["last_seen"])
                return info

        enriched = await asyncio.gather(*[_enrich(dev) for dev in devices])

        # OS detection via ICMP TTL fingerprinting
        enriched = await ping_and_enrich(enriched)

        logger.info("Scan-and-enrich complete for %s: %d devices", cidr, len(enriched))
        return enriched
