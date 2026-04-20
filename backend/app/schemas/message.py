from datetime import datetime
from pydantic import BaseModel, Field, field_validator


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


class MessageOut(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True
