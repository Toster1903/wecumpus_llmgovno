from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from datetime import timedelta
from jose import JWTError, jwt
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.db.session import get_db
from app.models.user import User
from app.core.security import (
    verify_password,
    create_access_token,
    create_verification_token,
    verify_telegram_auth,
    _DUMMY_HASH,
)
from app.core.config import settings
from app.schemas.user import TelegramAuthData
from app.services.user_service import upsert_telegram_user

router = APIRouter()
limiter = Limiter(key_func=get_remote_address)


@router.post("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    db: Session = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
):
    user = db.query(User).filter(User.email == form_data.username).first()
    # Always run bcrypt to prevent timing side-channel leaking Telegram-only accounts
    password_ok = verify_password(
        form_data.password,
        user.hashed_password if (user and user.hashed_password) else _DUMMY_HASH,
    )
    if not user or not user.hashed_password or not password_ok:
        raise HTTPException(status_code=401, detail="Неверный логин или пароль")
    if not user.is_verified:
        raise HTTPException(status_code=403, detail="email_not_verified")

    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=expires_delta)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/telegram")
def telegram_login(data: TelegramAuthData, db: Session = Depends(get_db)):
    data_dict = data.model_dump()
    if not verify_telegram_auth(data_dict):
        raise HTTPException(status_code=401, detail="invalid_telegram_hash")

    user = upsert_telegram_user(
        db,
        tg_id=str(data.id),
        first_name=data.first_name,
        username=data.username,
    )
    expires_delta = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(data={"sub": str(user.id)}, expires_delta=expires_delta)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "email_verification":
            raise HTTPException(status_code=400, detail="invalid_token")
        user_id = int(payload["sub"])
    except (JWTError, TypeError, ValueError, KeyError):
        raise HTTPException(status_code=400, detail="invalid_token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="user_not_found")

    user.is_verified = True
    db.commit()
    return {"message": "Email подтверждён"}


class ResendRequest(BaseModel):
    email: EmailStr


@router.post("/resend-verification")
@limiter.limit("3/hour")
def resend_verification(
    request: Request,
    body: ResendRequest,
    db: Session = Depends(get_db),
):
    from app.services.email_service import send_verification_email

    user = db.query(User).filter(User.email == str(body.email)).first()
    # Always return 200 — don't leak whether this email is registered
    if not user or user.is_verified:
        return {"message": "Если этот email зарегистрирован и не подтверждён, письмо будет отправлено."}

    token = create_verification_token(user.id)
    try:
        send_verification_email(user.email, token)
    except Exception:
        raise HTTPException(status_code=500, detail="email_send_failed")
    return {"message": "Письмо отправлено"}
