from sqlalchemy import and_, or_
from sqlalchemy.orm import Session
from app.models.match import Match
from app.models.message import Message
from app.models.club_member import ClubMember
from app.models.profile import Profile


def _serialize_messages_with_sender_meta(db: Session, messages: list[Message]) -> list[dict]:
    if not messages:
        return []

    sender_ids = list({message.sender_id for message in messages})
    profiles = db.query(Profile).filter(Profile.user_id.in_(sender_ids)).all()
    profile_map = {profile.user_id: profile for profile in profiles}

    return [
        {
            "id": message.id,
            "sender_id": message.sender_id,
            "receiver_id": message.receiver_id,
            "club_id": message.club_id,
            "content": message.content,
            "is_read": message.is_read,
            "sender_name": profile_map.get(message.sender_id).full_name if profile_map.get(message.sender_id) else None,
            "sender_avatar_url": profile_map.get(message.sender_id).avatar_url if profile_map.get(message.sender_id) else None,
            "created_at": message.created_at,
        }
        for message in messages
    ]


def can_access_club_chat(db: Session, user_id: int, club_id: int) -> bool:
    return db.query(ClubMember.id).filter(
        ClubMember.user_id == user_id,
        ClubMember.club_id == club_id,
    ).first() is not None


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
        club_id=None,
        content=content.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _serialize_messages_with_sender_meta(db, [message])[0]


def create_club_message(db: Session, sender_id: int, club_id: int, content: str) -> dict:
    message = Message(
        sender_id=sender_id,
        receiver_id=None,
        club_id=club_id,
        content=content.strip(),
    )
    db.add(message)
    db.commit()
    db.refresh(message)
    return _serialize_messages_with_sender_meta(db, [message])[0]


def get_conversation(db: Session, user_id: int, other_user_id: int, limit: int = 100) -> list[Message]:
    messages = db.query(Message).filter(
        or_(
            and_(Message.sender_id == user_id, Message.receiver_id == other_user_id),
            and_(Message.sender_id == other_user_id, Message.receiver_id == user_id),
        ),
        Message.club_id.is_(None),
    ).order_by(Message.created_at.asc()).limit(limit).all()
    return _serialize_messages_with_sender_meta(db, messages)


def get_club_conversation(db: Session, club_id: int, limit: int = 200) -> list[dict]:
    messages = db.query(Message).filter(
        Message.club_id == club_id,
    ).order_by(Message.created_at.asc()).limit(limit).all()
    return _serialize_messages_with_sender_meta(db, messages)
