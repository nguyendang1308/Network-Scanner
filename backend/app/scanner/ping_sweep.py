import subprocess
import re
import asyncio
from typing import Optional


def _parse_ttl_from_ping(stdout: str) -> Optional[int]:
    """Parse TTL from Windows ping output."""
    # Windows output: Reply from 192.168.1.1: bytes=32 time=1ms TTL=64
    match = re.search(r'TTL[=\s](\d+)', stdout, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return None


def _ttl_to_os(ttl: int) -> str:
    """Map TTL to OS guess."""
    if ttl >= 250:
        return 'Router/Cisco'
    elif ttl >= 120:
        return 'Windows'
    elif ttl >= 60:
        return 'Linux / Mac / Android'
    elif ttl >= 30:
        return 'Mobile / Embedded'
    return 'Unknown'


async def ping_host(ip: str, timeout_ms: int = 1000) -> Optional[int]:
    """Ping a host and return TTL."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _ping_sync, ip, timeout_ms)


def _ping_sync(ip: str, timeout_ms: int) -> Optional[int]:
    try:
        result = subprocess.run(
            ['ping', '-n', '1', '-w', str(timeout_ms), ip],
            capture_output=True,
            text=True,
            timeout=timeout_ms / 1000 + 2,
        )
        if result.returncode != 0:
            return None
        return _parse_ttl_from_ping(result.stdout)
    except Exception:
        return None


async def ping_and_enrich(devices: list[dict], max_concurrent: int = 20) -> list[dict]:
    """Ping all devices and add os_guess based on TTL."""
    sem = asyncio.Semaphore(max_concurrent)

    async def _enrich_one(dev: dict) -> dict:
        async with sem:
            ttl = await ping_host(dev['ip'])
            if ttl is not None:
                dev['os_guess'] = _ttl_to_os(ttl)
            return dev

    return await asyncio.gather(*[_enrich_one(d) for d in devices])
