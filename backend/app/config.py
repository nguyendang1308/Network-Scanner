from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite+aiosqlite:///netmapper.db"
    scan_interval_seconds: int = 300
    oui_url: str = "https://www.wireshark.org/download/automated/data/manuf"
    webhook_url: str | None = None


settings = Settings()
