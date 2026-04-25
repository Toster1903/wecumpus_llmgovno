from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class Ride(Base):
    __tablename__ = "rides"

    id = Column(Integer, primary_key=True, index=True)
    driver_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    from_location = Column(String, nullable=False)
    to_location = Column(String, nullable=False)
    departure_time = Column(DateTime(timezone=True), nullable=False)
    seats_total = Column(Integer, nullable=False, default=1)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    driver = relationship("User", foreign_keys=[driver_id])
    passengers = relationship("RidePassenger", back_populates="ride", cascade="all, delete-orphan")


class RidePassenger(Base):
    __tablename__ = "ride_passengers"

    id = Column(Integer, primary_key=True, index=True)
    ride_id = Column(Integer, ForeignKey("rides.id"), nullable=False, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())

    ride = relationship("Ride", back_populates="passengers")
    user = relationship("User", foreign_keys=[user_id])
