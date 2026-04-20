import json
from pathlib import Path
from uuid import uuid4
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, Request
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.club import (
    ClubActionOut,
    ClubDetailOut,
    ClubIncomingInviteOut,
    ClubInviteCreate,
    ClubPendingInviteOut,
    ClubSummaryOut,
    ClubUserSuggestionOut,
)
from app.services import club_service


router = APIRouter()


def _save_club_avatar(avatar_file: UploadFile | None, request: Request) -> str | None:
    if not avatar_file:
        return None

    extension = Path(avatar_file.filename or "").suffix.lower()
    if extension not in {".jpg", ".jpeg", ".png", ".webp", ".gif"}:
        raise ValueError("Аватар должен быть изображением (.jpg, .png, .webp, .gif)")

    static_dir = Path(__file__).resolve().parents[3] / "static" / "club_avatars"
    static_dir.mkdir(parents=True, exist_ok=True)

    file_name = f"club_{uuid4().hex}{extension}"
    file_path = static_dir / file_name

    content = avatar_file.file.read()
    if len(content) > 5 * 1024 * 1024:
        raise ValueError("Размер аватара не должен превышать 5MB")

    with open(file_path, "wb") as output:
        output.write(content)

    relative_url = f"/static/club_avatars/{file_name}"
    return f"{str(request.base_url).rstrip('/')}{relative_url}"


@router.get("/", response_model=list[ClubSummaryOut])
def get_my_clubs(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return club_service.get_my_clubs(db, current_user.id)


@router.post("/", response_model=ClubSummaryOut)
def create_club(
    request: Request,
    name: str = Form(...),
    description: str | None = Form(None),
    tags_json: str | None = Form(None),
    avatar_file: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        parsed_tags = []
        if tags_json:
            parsed = json.loads(tags_json)
            if isinstance(parsed, list):
                parsed_tags = [str(item) for item in parsed]

        avatar_url = _save_club_avatar(avatar_file, request)

        return club_service.create_club(
            db,
            current_user.id,
            {
                "name": name,
                "description": description,
                "tags": parsed_tags,
                "avatar_url": avatar_url,
            },
        )
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Невалидный формат тегов") from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/users/search", response_model=list[ClubUserSuggestionOut])
def search_users_for_invite(
    q: str,
    club_id: int | None = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return club_service.search_users_for_invite(
            db=db,
            query=q,
            current_user_id=current_user.id,
            club_id=club_id,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.get("/invites/me", response_model=list[ClubIncomingInviteOut])
def get_my_club_invites(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return club_service.get_my_pending_invites(db, current_user.id)


@router.post("/invites/{invite_id}/accept", response_model=ClubSummaryOut)
def accept_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        invite = club_service.respond_to_invite(db, invite_id, current_user.id, accept=True)
        return club_service.get_club_summary_for_user(db, invite.club_id, current_user.id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/invites/{invite_id}/decline", response_model=ClubActionOut)
def decline_invite(
    invite_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        club_service.respond_to_invite(db, invite_id, current_user.id, accept=False)
        return {"status": "declined"}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/{club_id}", response_model=ClubDetailOut)
def get_club_detail(
    club_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return club_service.get_club_detail(db, club_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/{club_id}/invite", response_model=ClubPendingInviteOut)
def invite_user(
    club_id: int,
    payload: ClubInviteCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return club_service.invite_user_to_club(
            db=db,
            club_id=club_id,
            inviter_user_id=current_user.id,
            user_id=payload.user_id,
            email=payload.email,
        )
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
