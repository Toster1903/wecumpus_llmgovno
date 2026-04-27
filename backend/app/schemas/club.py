from datetime import datetime
from pydantic import BaseModel, Field
from typing import List, Optional


class ClubCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = Field(None, max_length=1000)
    avatar_url: Optional[str] = Field(None, max_length=500)
    tags: List[str] = Field(default_factory=list)


class ClubInviteCreate(BaseModel):
    user_id: Optional[int] = None
    email: Optional[str] = None


class ClubSummaryOut(BaseModel):
    id: int
    owner_id: int
    name: str
    description: Optional[str] = None
    avatar_url: Optional[str] = None
    tags: List[str]
    member_count: int
    my_role: str
    is_owner: bool
    created_at: datetime
    updated_at: datetime


class ClubMemberOut(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    joined_at: datetime


class ClubPendingInviteOut(BaseModel):
    id: int
    invited_user_id: int
    invited_user_email: str
    invited_user_name: Optional[str] = None
    invited_user_avatar_url: Optional[str] = None
    invited_by_user_id: int
    created_at: datetime


class ClubDetailOut(ClubSummaryOut):
    members: List[ClubMemberOut]
    pending_invites: List[ClubPendingInviteOut]


class ClubIncomingInviteOut(BaseModel):
    invite_id: int
    club_id: int
    club_name: str
    club_avatar_url: Optional[str] = None
    invited_by_user_id: int
    invited_by_email: str
    invited_by_name: Optional[str] = None
    created_at: datetime


class ClubActionOut(BaseModel):
    status: str


class ClubUserSuggestionOut(BaseModel):
    user_id: int
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
