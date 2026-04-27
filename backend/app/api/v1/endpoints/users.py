import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.user import UserCreate, UserOut
from app.services import user_service
from app.services.email_service import send_verification_email
from app.core.security import create_verification_token
from app.api.deps import get_current_user
from app.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/", response_model=UserOut)
def register_user(user_in: UserCreate, db: Session = Depends(get_db)):
    try:
        user = user_service.create_new_user(db, user_in)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc

    token = create_verification_token(user.id)
    try:
        send_verification_email(user.email, token)
    except Exception:
        logger.exception("Could not send verification email for user %s", user.id)

    return user


@router.get("/me", response_model=UserOut)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user


@router.delete("/me")
def delete_account(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    user_service.delete_user(db, current_user.id)
    return {"status": "deleted"}
