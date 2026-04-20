from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.models.match import Match
from app.models.message import Message


def is_mutual_match(db: Session, user_id: int, other_user_id: int) -> bool:
    liked_other = db.query(Match.id).filter(
        Match.user_id == user_id,
        Match.matched_user_id == other_user_id,
        Match.action == "like",
    ).first()
    other_liked_back = db.query(Match.id).filter(
        Match.user_id == other_user_id,
        Match.matched_user_id == user_id,
        Match.action == "like",
    ).first()
    return bool(liked_other and other_liked_back)


def create_message(db: Session, sender_id: int, receiver_id: int, content: str) -> Message:
    message = Message(
        sender_id=sender_id,
        receiver_id=receiver_id,
        content=content.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return message


def get_conversation(db: Session, user_id: int, other_user_id: int, limit: int = 100) -> list[Message]:
    return db.query(Message).filter(
        or_(
            and_(Message.sender_id == user_id, Message.receiver_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.receiver_id == user_id),
        )
    ).order_by(Message.created_at.asc()).limit(limit).all()
