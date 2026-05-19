import os
from pathlib import Path
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base

from app.config import settings

# Ensure directory exists for SQLite database file
# Handle both absolute Unix paths (/app/...) and relative paths (netmapper.db)
if settings.database_url.startswith("sqlite+aiosqlite:///"):
    raw_path = settings.database_url[len("sqlite+aiosqlite:///"):]
    # On Windows, absolute paths start with drive letter (e.g. C:\)
    # On Unix, absolute paths start with /
    if os.name == "nt" and len(raw_path) > 1 and raw_path[1] == ":":
        db_path = raw_path
    elif raw_path.startswith("/"):
        db_path = raw_path
    else:
        # Relative path: resolve against project root (parent of app/)
        project_root = Path(__file__).resolve().parent.parent
        db_path = str(project_root / raw_path)
    db_dir = os.path.dirname(db_path)
    if db_dir:
        os.makedirs(db_dir, exist_ok=True)
    # Update URL to absolute path so SQLAlchemy sees it correctly
    settings.database_url = f"sqlite+aiosqlite:///{db_path}"

engine = create_async_engine(
    settings.database_url,
    echo=False,
)

AsyncSessionLocal = async_sessionmaker(
    engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

Base = declarative_base()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session
