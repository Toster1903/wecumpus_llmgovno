from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.models.user import User
from app.models.profile import Profile
from app.models.match import Match
from app.models.message import Message
from app.models.club import Club
from app.models.club_member import ClubMember
from app.models.club_invite import ClubInvite
from app.schemas.user import UserCreate
from app.core.security import get_password_hash


def create_new_user(db: Session, user_data: UserCreate) -> User:
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        is_verified=False,
    )
    db.add(new_user)
    try:
        db.commit()
        db.refresh(new_user)
        return new_user
    except IntegrityError as exc:
        db.rollback()
        raise ValueError("Пользователь с таким email уже существует") from exc


def upsert_telegram_user(db: Session, tg_id: str, first_name: str, username: str | None) -> User:
    user = db.query(User).filter(User.telegram_id == tg_id).first()
    if user:
        user.telegram_first_name = first_name
        user.telegram_username = username
        db.commit()
        db.refresh(user)
        return user
    user = User(
        telegram_id=tg_id,
        telegram_first_name=first_name,
        telegram_username=username,
        is_verified=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def delete_user(db: Session, user_id: int):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return None

    owned_club_ids = [
        club_id
        for (club_id,) in db.query(Club.id).filter(Club.owner_id == user_id).all()
    ]

    try:
        db.query(Match).filter(
            (Match.user_id == user_id) | (Match.matched_user_id == user_id)
        ).delete(synchronize_session=False)
        db.query(Message).filter(
            (Message.sender_id == user_id) | (Message.receiver_id == user_id)
        ).delete(synchronize_session=False)
        db.query(Profile).filter(Profile.user_id == user_id).delete(synchronize_session=False)
        db.query(ClubInvite).filter(
            (ClubInvite.invited_user_id == user_id) | (ClubInvite.invited_by_user_id == user_id)
        ).delete(synchronize_session=False)
        db.query(ClubMember).filter(ClubMember.user_id == user_id).delete(synchronize_session=False)

        if owned_club_ids:
            db.query(Message).filter(Message.club_id.in_(owned_club_ids)).delete(synchronize_session=False)
            db.query(ClubInvite).filter(ClubInvite.club_id.in_(owned_club_ids)).delete(synchronize_session=False)
            db.query(ClubMember).filter(ClubMember.club_id.in_(owned_club_ids)).delete(synchronize_session=False)
            db.query(Club).filter(Club.id.in_(owned_club_ids)).delete(synchronize_session=False)

        db.delete(user)
        db.commit()
    except Exception:
        db.rollback()
        raise
    return user
