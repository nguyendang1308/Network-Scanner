import logging
import os
import re
from urllib import request

from app.config import settings

logger = logging.getLogger(__name__)

_MAC_NORMALIZE_RE = re.compile(r"[^0-9a-fA-F]")


class OUILookup:
    """Offline OUI vendor lookup using Wireshark's manuf database."""

    def __init__(self, db_path: str | None = None):
        if db_path is None:
            # Resolve relative to project root (parent of app/)
            import pathlib
            project_root = pathlib.Path(__file__).resolve().parent.parent.parent
            db_path = str(project_root / "data" / "oui.txt")
        self.db_path = db_path
        self._cache: dict[str, str] = {}
        self._parsed = False
        self._download_failed = False

    @staticmethod
    def _normalize_mac_prefix(mac: str) -> str:
        """Return uppercase 6-char hex prefix without separators."""
        cleaned = _MAC_NORMALIZE_RE.sub("", mac)
        return cleaned[:6].upper()

    def _download_db(self) -> None:
        """Download Wireshark manuf file if missing."""
        if self._download_failed:
            raise RuntimeError("OUI download previously failed")
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        url = settings.oui_url
        logger.info("Downloading OUI database from %s to %s", url, self.db_path)
        try:
            request.urlretrieve(url, self.db_path)
            logger.info("OUI database downloaded successfully")
        except Exception as exc:
            self._download_failed = True
            logger.error("Failed to download OUI database: %s", exc)
            raise

    def _parse_db(self) -> None:
        """Parse manuf file into memory cache."""
        if not os.path.exists(self.db_path):
            self._download_db()

        logger.info("Parsing OUI database: %s", self.db_path)
        parsed = 0
        try:
            with open(self.db_path, "r", encoding="utf-8", errors="ignore") as fh:
                for line in fh:
                    line = line.strip()
                    if not line or line.startswith("#"):
                        continue

                    # manuf format examples:
                    # 00:00:00	Vendor Name
                    # 00:00:00/24	Vendor Name	Long Vendor Name # comment
                    parts = line.split("\t")
                    if len(parts) < 2:
                        continue

                    prefix_field = parts[0].strip()
                    # Remove mask if present, e.g. 00:00:00/24 -> 00:00:00
                    prefix_field = prefix_field.split("/")[0]
                    prefix = self._normalize_mac_prefix(prefix_field)
                    if len(prefix) != 6:
                        continue

                    vendor = parts[1].strip()
                    if not vendor:
                        continue

                    self._cache[prefix] = vendor
                    parsed += 1

            self._parsed = True
            logger.info("OUI database parsed: %d entries", parsed)
        except Exception as exc:
            logger.error("Failed to parse OUI database: %s", exc)
            raise

    def get_vendor(self, mac: str) -> str | None:
        """Return vendor name for a MAC address, or 'Unknown' if not found."""
        if not mac:
            return "Unknown"

        prefix = self._normalize_mac_prefix(mac)
        if not prefix:
            return "Unknown"

        if prefix in self._cache:
            return self._cache[prefix]

        if not self._parsed and not self._download_failed:
            try:
                self._parse_db()
            except Exception:
                logger.warning("OUI lookup unavailable, returning Unknown")
                return "Unknown"

        vendor = self._cache.get(prefix)
        if vendor is None:
            vendor = "Unknown"
        return vendor
