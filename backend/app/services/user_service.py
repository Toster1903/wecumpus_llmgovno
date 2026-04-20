from sqlalchemy.orm import Session
from app.models.user import User
from app.models.profile import Profile
from app.models.match import Match
from app.schemas.user import UserCreate
from app.core.security import get_password_hash

def create_new_user(db: Session, user_data: UserCreate):
    new_user = User(
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password)
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

def delete_user(db: Session, user_id: int):
    """Delete user by ID"""
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        db.query(Match).filter(
            (Match.user_id == user_id) | (Match.matched_user_id == user_id)
        ).delete(synchronize_session=False)
        db.query(Profile).filter(Profile.user_id == user_id).delete(synchronize_session=False)
        db.delete(user)
        db.commit()
    return user
