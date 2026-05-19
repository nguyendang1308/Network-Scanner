from datetime import datetime
from pydantic import BaseModel, ConfigDict


class DeviceBase(BaseModel):
    ip: str
    mac: str | None = None
    hostname: str | None = None
    vendor: str | None = None
    os_guess: str | None = None
    is_online: bool = True


class DeviceCreate(DeviceBase):
    pass


class DeviceRead(DeviceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    network_id: int | None = None
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    created_at: datetime


class NetworkBase(BaseModel):
    cidr: str
    gateway_ip: str | None = None
    interface_name: str | None = None
    ssid: str | None = None


class NetworkRead(NetworkBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime


class SnapshotRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    network_id: int
    captured_at: datetime
    topology_json: str


class SnapshotDiff(BaseModel):
    added: list[dict]
    removed: list[dict]
    changed: list[dict]
