from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from urllib.parse import urlparse


def _safe_url(v: Optional[str]) -> Optional[str]:
    if v is None:
        return v
    parsed = urlparse(v)
    if parsed.scheme not in ("http", "https", ""):
        raise ValueError("Некорректный URL")
    return v


class RoommateHabits(BaseModel):
    bedtime: Optional[str] = Field(None, max_length=50)
    wake_time: Optional[str] = Field(None, max_length=50)
    cleanliness: Optional[str] = Field(None, max_length=50)
    guests: Optional[str] = Field(None, max_length=50)
    noise: Optional[str] = Field(None, max_length=50)
    allergy: Optional[str] = Field(None, max_length=200)
    roommate_expectations: Optional[str] = Field(None, max_length=500)


class ProfilePrivatePreferencesOut(BaseModel):
    private_habits: Optional[RoommateHabits] = None

class ProfileCreate(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=100)
    age: int = Field(..., ge=14, le=100)
    bio: str = Field(..., min_length=1, max_length=1000)
    interests: List[str] = Field(..., max_length=20)
    avatar_url: Optional[str] = Field(None, max_length=500)
    private_habits: Optional[RoommateHabits] = None

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v: list) -> list:
        if len(v) > 20:
            raise ValueError("Максимум 20 интересов")
        return [i.strip()[:50] for i in v if i.strip()]

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, v: Optional[str]) -> Optional[str]:
        return _safe_url(v)


class ProfileUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    age: Optional[int] = Field(None, ge=14, le=100)
    bio: Optional[str] = Field(None, min_length=1, max_length=1000)
    interests: Optional[List[str]] = None
    avatar_url: Optional[str] = Field(None, max_length=500)
    private_habits: Optional[RoommateHabits] = None

    @field_validator("interests")
    @classmethod
    def validate_interests(cls, v: Optional[list]) -> Optional[list]:
        if v is None:
            return v
        if len(v) > 20:
            raise ValueError("Максимум 20 интересов")
        return [i.strip()[:50] for i in v if i.strip()]

    @field_validator("avatar_url")
    @classmethod
    def validate_avatar_url(cls, v: Optional[str]) -> Optional[str]:
        return _safe_url(v)

class ProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    age: int
    bio: str
    interests: List[str]
    avatar_url: Optional[str] = None
    is_looking: bool

    class Config:
        from_attributes = True


class ProfileAnalysisStatus(BaseModel):
    status: str
    message: str