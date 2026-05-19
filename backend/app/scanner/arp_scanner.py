import asyncio
import ipaddress
import logging
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
from typing import Any

from scapy.all import ARP, Ether, srp
from scapy.error import Scapy_Exception

logger = logging.getLogger(__name__)


class ARPScanner:
    """Async ARP scanner using Scapy with rate limiting."""

    def __init__(self, max_req_per_sec: int = 50):
        self.max_req_per_sec = max_req_per_sec
        self._delay = 1.0 / max_req_per_sec

    def _scan_batch(self, packets: list[Any], timeout: float = 2.0) -> list[dict]:
        """Blocking Scapy call wrapped via asyncio.to_thread."""
        answered, _ = srp(
            packets,
            timeout=timeout,
            verbose=0,
            retry=0,
        )
        results = []
        for req, resp in answered:
            ip = resp.psrc
            mac = resp.hwsrc
            latency_ms = 0.0
            if hasattr(req, "sent_time") and req.sent_time and hasattr(resp, "time") and resp.time:
                latency_ms = round((resp.time - req.sent_time) * 1000, 2)
            results.append({
                "ip": ip,
                "mac": mac,
                "latency_ms": latency_ms,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            })
        return results

    async def scan_subnet(
        self,
        cidr: str,
        on_progress: Callable[[int, int], Awaitable[None]] | None = None,
    ) -> list[dict]:
        """Scan a subnet via ARP with rate limiting.

        Returns list of dicts: {ip, mac, latency_ms, timestamp}
        """
        logger.info("Starting ARP scan for subnet: %s", cidr)
        try:
            network = ipaddress.ip_network(cidr, strict=False)
        except ValueError as exc:
            logger.error("Invalid CIDR %s: %s", cidr, exc)
            return []

        hosts = [str(h) for h in network.hosts()]
        if not hosts:
            logger.warning("No hosts found in CIDR %s", cidr)
            return []

        results: list[dict] = []
        batch_size = 10
        total = len(hosts)

        try:
            for i in range(0, total, batch_size):
                batch_hosts = hosts[i : i + batch_size]
                packets = [
                    Ether(dst="ff:ff:ff:ff:ff:ff") / ARP(pdst=host)
                    for host in batch_hosts
                ]
                batch_results = await asyncio.to_thread(
                    self._scan_batch, packets, 2.0
                )
                results.extend(batch_results)
                logger.debug(
                    "ARP batch %d-%d/%d done, found %d devices",
                    i,
                    i + len(batch_hosts),
                    total,
                    len(batch_results),
                )

                if on_progress:
                    await on_progress(min(i + batch_size, total), total)

                # Rate-limiting sleep between batches
                if i + batch_size < total:
                    await asyncio.sleep(batch_size * self._delay)

        except PermissionError as exc:
            logger.warning("ARP scan permission denied (missing NET_RAW?): %s", exc)
            return []
        except OSError as exc:
            logger.warning("ARP scan OS error (missing NET_RAW or raw socket support?): %s", exc)
            return []
        except Scapy_Exception as exc:
            logger.warning("Scapy exception during ARP scan: %s", exc)
            return []

        logger.info("ARP scan complete for %s: found %d devices", cidr, len(results))
        return results
