import json
import logging
from typing import Any

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

logger = logging.getLogger(__name__)
router = APIRouter(tags=["websocket"])


class ConnectionManager:
    """Manages WebSocket connections per network."""

    def __init__(self):
        self._connections: dict[int, set[WebSocket]] = {}

    async def connect(self, network_id: int, websocket: WebSocket) -> None:
        await websocket.accept()
        self._connections.setdefault(network_id, set()).add(websocket)
        logger.info("WebSocket connected for network %s (total: %d)", network_id, len(self._connections.get(network_id, set())))

    def disconnect(self, network_id: int, websocket: WebSocket) -> None:
        conns = self._connections.get(network_id)
        if conns:
            conns.discard(websocket)
            if not conns:
                del self._connections[network_id]
        logger.info("WebSocket disconnected for network %s", network_id)

    async def broadcast(self, network_id: int, message: dict[str, Any]) -> None:
        conns = self._connections.get(network_id)
        if not conns:
            return
        payload = json.dumps(message)
        dead: set[WebSocket] = set()
        for ws in conns:
            try:
                await ws.send_text(payload)
            except Exception:
                dead.add(ws)
        if dead:
            conns -= dead
            if not conns:
                del self._connections[network_id]


manager = ConnectionManager()


async def broadcast_to_network(network_id: int, message: dict[str, Any]) -> None:
    """Public helper to broadcast a message to all clients on a network."""
    await manager.broadcast(network_id, message)


@router.websocket("/ws/network/{network_id}")
async def network_ws(websocket: WebSocket, network_id: int):
    await manager.connect(network_id, websocket)
    try:
        while True:
            await websocket.receive_text()  # keep-alive
    except WebSocketDisconnect:
        manager.disconnect(network_id, websocket)
    except Exception as exc:
        logger.warning("WebSocket error for network %s: %s", network_id, exc)
        manager.disconnect(network_id, websocket)
