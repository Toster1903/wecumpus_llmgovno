from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.models.profile import Profile
from app.services import ai_service

router = APIRouter()


class ChatMessage(BaseModel):
    role: str  # "user" or "assistant"
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[list[ChatMessage]] = []


class ChatResponse(BaseModel):
    reply: str


class MatchExplainRequest(BaseModel):
    candidate_user_id: int


class MatchExplainResponse(BaseModel):
    reason: str


@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    body: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = [{"role": m.role, "content": m.content} for m in (body.history or [])]
    reply = ai_service.chat_with_tools(body.message, history, db, current_user.id)
    return {"reply": reply}


@router.post("/match-explain", response_model=MatchExplainResponse)
def ai_match_explain(
    body: MatchExplainRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    my_profile = db.query(Profile).filter(Profile.user_id == current_user.id).first()
    candidate_profile = db.query(Profile).filter(Profile.user_id == body.candidate_user_id).first()

    my_dict = {
        "interests": my_profile.interests if my_profile else [],
        "bio": my_profile.bio if my_profile else "",
    }
    cand_dict = {
        "interests": candidate_profile.interests if candidate_profile else [],
        "bio": candidate_profile.bio if candidate_profile else "",
    }
    reason = ai_service.explain_match(my_dict, cand_dict)
    return {"reason": reason}
