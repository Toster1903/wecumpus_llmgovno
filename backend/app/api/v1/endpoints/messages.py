from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.message import ClubMessageCreate, MessageCreate, MessageOut
from app.services import message_service

router = APIRouter()


@router.get("/clubs/{club_id}", response_model=list[MessageOut])
def get_messages_with_club(
    club_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not message_service.can_access_club_chat(db, current_user.id, club_id):
        raise HTTPException(status_code=403, detail="Club chat is available only for club members")

    return message_service.get_club_conversation(db, club_id)


@router.post("/clubs/{club_id}", response_model=MessageOut)
def send_club_message(
    club_id: int,
    payload: ClubMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not message_service.can_access_club_chat(db, current_user.id, club_id):
        raise HTTPException(status_code=403, detail="Club chat is available only for club members")

    return message_service.create_club_message(db, current_user.id, club_id, payload.content)


@router.get("/{other_user_id}", response_model=list[MessageOut])
def get_messages_with_user(
    other_user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if other_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot open chat with yourself")

    if not message_service.is_mutual_match(db, current_user.id, other_user_id):
        raise HTTPException(status_code=403, detail="Chat available only for mutual matches")

    return message_service.get_conversation(db, current_user.id, other_user_id)


@router.post("/", response_model=MessageOut)
def send_message(
    payload: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if payload.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot send message to yourself")

    if not message_service.is_mutual_match(db, current_user.id, payload.receiver_id):
        raise HTTPException(status_code=403, detail="Chat available only for mutual matches")

    return message_service.create_message(db, current_user.id, payload.receiver_id, payload.content)
