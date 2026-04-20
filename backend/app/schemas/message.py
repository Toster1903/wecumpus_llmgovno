from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from typing import Optional


class MessageCreate(BaseModel):
    receiver_id: int
    content: str = Field(max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message content is required")
        return stripped


class ClubMessageCreate(BaseModel):
    content: str = Field(max_length=2000)

    @field_validator("content")
    @classmethod
    def validate_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("Message content is required")
        return stripped


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: Optional[int] = None
    club_id: Optional[int] = None
    content: str
    is_read: bool
    sender_name: Optional[str] = None
    sender_avatar_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
