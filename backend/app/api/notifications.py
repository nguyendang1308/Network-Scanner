import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter

from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter(tags=["notifications"])

_lock = asyncio.Lock()
_events: list[dict[str, Any]] = []


def _trim_events() -> None:
    global _events
    if len(_events) > 100:
        _events = _events[:100]


async def add_event(event: str, payload: dict[str, Any]) -> None:
    async with _lock:
        _events.insert(
            0,
            {
                "event": event,
                "payload": payload,
                "timestamp": datetime.now(timezone.utc).isoformat(),
            },
        )
        _trim_events()

    # Mock webhook
    if settings.webhook_url and event == "new_device":
        logger.info(
            "[Webhook Mock] Would POST to %s: event=%s payload=%s",
            settings.webhook_url,
            event,
            payload,
        )


@router.get("/notifications")
async def list_notifications() -> list[dict[str, Any]]:
    async with _lock:
        return list(_events)
