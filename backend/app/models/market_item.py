from sqlalchemy import Boolean, Column, Integer, Numeric, String, Text, DateTime, ForeignKey, ARRAY
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.session import Base


class MarketItem(Base):
    __tablename__ = "market_items"

    id = Column(Integer, primary_key=True, index=True)
    seller_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    price = Column(Numeric(10, 2), nullable=False, default=0)
    category = Column(String, nullable=False, default="other")
    condition = Column(String, nullable=False, default="good")
    is_available = Column(Boolean, nullable=False, default=True)
    image_urls = Column(ARRAY(String), nullable=True, default=list)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    seller = relationship("User", foreign_keys=[seller_id])
