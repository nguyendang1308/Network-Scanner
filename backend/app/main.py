import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select

from app.database import engine, Base, AsyncSessionLocal
from app import models
from app.config import settings
from app.api.devices import router as devices_router, run_scan_job
from app.api.websocket import router as ws_router
from app.api.notifications import router as notifications_router

logger = logging.getLogger(__name__)

# APScheduler is initialized lazily to avoid import issues during testing
_scheduler = None


def get_scheduler():
    global _scheduler
    if _scheduler is None:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler
        _scheduler = AsyncIOScheduler()
    return _scheduler


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Start scheduler and register scan jobs for each network
    scheduler = get_scheduler()
    scheduler.start()

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(models.Network))
        networks = result.scalars().all()
        if not networks:
            logger.info("Seeding default network 192.168.1.0/24")
            default_network = models.Network(cidr="192.168.1.0/24", gateway_ip="192.168.1.1")
            db.add(default_network)
            await db.commit()
            result = await db.execute(select(models.Network))
            networks = result.scalars().all()
        for network in networks:
            scheduler.add_job(
                run_scan_job,
                "interval",
                seconds=settings.scan_interval_seconds,
                args=[network.id],
                id=f"scan-{network.id}",
                replace_existing=True,
            )
            logger.info(
                "Registered scheduled scan for network %s (%s) every %ds",
                network.id,
                network.cidr,
                settings.scan_interval_seconds,
            )

    yield

    scheduler.shutdown()
    await engine.dispose()


app = FastAPI(
    title="NetMapper",
    description="Network topology visualizer backend",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(devices_router, prefix="/api")
app.include_router(notifications_router, prefix="/api")
app.include_router(ws_router)


@app.get("/health")
def health():
    return {"status": "ok"}
