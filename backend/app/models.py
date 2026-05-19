from datetime import datetime
from sqlalchemy import Integer, String, DateTime, func, ForeignKey, Text, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Network(Base):
    __tablename__ = "networks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    cidr: Mapped[str] = mapped_column(String, nullable=False)
    gateway_ip: Mapped[str | None] = mapped_column(String, nullable=True)
    interface_name: Mapped[str | None] = mapped_column(String, nullable=True)
    ssid: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    devices: Mapped[list["Device"]] = relationship(back_populates="network")
    snapshots: Mapped[list["Snapshot"]] = relationship(back_populates="network")


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    ip: Mapped[str] = mapped_column(String, index=True, nullable=False)
    mac: Mapped[str | None] = mapped_column(
        String, unique=True, index=True, nullable=True
    )
    hostname: Mapped[str | None] = mapped_column(String, nullable=True)
    vendor: Mapped[str | None] = mapped_column(String, nullable=True)
    os_guess: Mapped[str | None] = mapped_column(String, nullable=True)
    first_seen: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    last_seen: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    is_online: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    network_id: Mapped[int | None] = mapped_column(
        ForeignKey("networks.id"), nullable=True
    )
    network: Mapped[Network | None] = relationship(back_populates="devices")


class Snapshot(Base):
    __tablename__ = "snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    network_id: Mapped[int] = mapped_column(
        ForeignKey("networks.id"), nullable=False
    )
    captured_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    topology_json: Mapped[str] = mapped_column(Text, default="{}")

    network: Mapped[Network] = relationship(back_populates="snapshots")
