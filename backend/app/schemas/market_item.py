from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel


class MarketItemCreate(BaseModel):
    title: str
    description: Optional[str] = None
    price: Decimal = Decimal("0")
    category: str = "other"
    condition: str = "good"


class MarketItemUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    category: Optional[str] = None
    condition: Optional[str] = None
    is_available: Optional[bool] = None


class MarketItemOut(BaseModel):
    id: int
    seller_id: int
    seller_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    price: Decimal
    category: str
    condition: str
    is_available: bool
    created_at: datetime

    class Config:
        from_attributes = True
