from datetime import datetime
from decimal import Decimal
from typing import Optional
from pydantic import BaseModel, Field

_VALID_CATEGORIES = {"electronics", "books", "clothing", "furniture", "sports", "food", "other"}
_VALID_CONDITIONS = {"new", "like_new", "good", "fair", "poor"}


class MarketItemCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    price: Decimal = Field(Decimal("0"), ge=0, le=Decimal("999999.99"))
    category: str = Field("other", max_length=50)
    condition: str = Field("good", max_length=50)

    def model_post_init(self, __context) -> None:
        if self.category not in _VALID_CATEGORIES:
            self.category = "other"
        if self.condition not in _VALID_CONDITIONS:
            self.condition = "good"


class MarketItemUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    price: Optional[Decimal] = Field(None, ge=0, le=Decimal("999999.99"))
    category: Optional[str] = Field(None, max_length=50)
    condition: Optional[str] = Field(None, max_length=50)
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
    image_urls: Optional[list[str]] = []
    created_at: datetime

    class Config:
        from_attributes = True
