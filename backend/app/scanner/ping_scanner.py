import asyncio
import ipaddress
import logging
import platform
import re
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any

logger = logging.getLogger(__name__)


class PingScanner:
    """ICMP ping sweep fallback for environments without raw socket support.

    Discovers live hosts via OS ping command and enriches with ARP/neighbour table.
    """

    def __init__(self, timeout_ms: int = 800, max_concurrent: int = 50):
        self.timeout_ms = timeout_ms
        self.max_concurrent = max_concurrent
        self._is_windows = platform.system() == "Windows"

    async def _ping_host(self, ip: str) -> bool:
        """Return True if host responds to ICMP ping."""
        if self._is_windows:
            # -n count, -w timeout_ms
            cmd = ["ping", "-n", "1", "-w", str(self.timeout_ms), ip]
        else:
            # -c count, -W timeout_sec
            cmd = ["ping", "-c", "1", "-W", str(max(1, self.timeout_ms // 1000)), ip]

        try:
            proc = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.DEVNULL,
                stderr=asyncio.subprocess.DEVNULL,
            )
            returncode = await asyncio.wait_for(proc.wait(), timeout=self.timeout_ms / 1000 + 2)
            return returncode == 0
        except Exception:
            return False

    async def _arp_table(self) -> dict[str, str]:
        """Return mapping ip -> mac from OS ARP/neighbour table."""
        ip_to_mac: dict[str, str] = {}
        try:
            if self._is_windows:
                proc = await asyncio.create_subprocess_exec(
                    "arp", "-a",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await proc.communicate()
                text = stdout.decode("utf-8", errors="ignore")
                # Windows arp -a format:
                #   192.168.1.1           00-11-22-33-44-55     dynamic
                for line in text.splitlines():
                    parts = line.split()
                    if len(parts) >= 2:
                        ip_raw = parts[0]
                        mac_raw = parts[1]
                        if re.match(r"\d+\.\d+\.\d+\.\d+", ip_raw) and "-" in mac_raw:
                            ip_to_mac[ip_raw] = mac_raw.replace("-", ":").lower()
            else:
                proc = await asyncio.create_subprocess_exec(
                    "ip", "neigh", "show",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )
                stdout, _ = await proc.communicate()
                text = stdout.decode("utf-8", errors="ignore")
                # Linux ip neigh format:
                #   192.168.1.1 dev eth0 lladdr 00:11:22:33:44:55 REACHABLE
                for line in text.splitlines():
                    parts = line.split()
                    if len(parts) >= 5 and parts[2] == "lladdr":
                        ip_to_mac[parts[0]] = parts[4].lower()
        except Exception as exc:
            logger.warning("Failed to read ARP table: %s", exc)
        return ip_to_mac

    async def scan_subnet(
        self,
        cidr: str,
        on_progress: Callable[[int, int], Awaitable[None]] | None = None,
    ) -> list[dict]:
        """Ping sweep a subnet and return devices with MAC where available."""
        logger.info("Starting ping sweep for subnet: %s", cidr)
        try:
            network = ipaddress.ip_network(cidr, strict=False)
        except ValueError as exc:
            logger.error("Invalid CIDR %s: %s", cidr, exc)
            return []

        hosts = [str(h) for h in network.hosts()]
        if not hosts:
            logger.warning("No hosts found in CIDR %s", cidr)
            return []

        total = len(hosts)
        semaphore = asyncio.Semaphore(self.max_concurrent)

        async def _check(ip: str) -> str | None:
            async with semaphore:
                if await self._ping_host(ip):
                    return ip
            return None

        # Run pings concurrently with semaphore
        tasks = [asyncio.create_task(_check(ip)) for ip in hosts]
        alive_ips: list[str] = []
        for i, task in enumerate(tasks):
            result = await task
            if result:
                alive_ips.append(result)
            if on_progress and (i + 1) % 10 == 0:
                await on_progress(i + 1, total)

        if on_progress:
            await on_progress(total, total)

        # Enrich with MAC addresses
        arp_table = await self._arp_table()
        now = datetime.now(timezone.utc).isoformat()
        results = []
        for ip in alive_ips:
            mac = arp_table.get(ip)
            results.append({
                "ip": ip,
                "mac": mac,
                "latency_ms": 0.0,
                "timestamp": now,
            })

        logger.info("Ping sweep complete for %s: %d/%d hosts alive", cidr, len(results), total)
        return results
