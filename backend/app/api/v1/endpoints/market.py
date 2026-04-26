import uuid
from decimal import Decimal
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.orm import Session

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.market_item import MarketItemOut, MarketItemUpdate
from app.services import market_service

router = APIRouter()

MARKET_IMG_DIR = Path(__file__).resolve().parents[4] / "static" / "market_images"
MARKET_IMG_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_FILE_SIZE = 8 * 1024 * 1024  # 8 MB


async def _save_images(files: list[UploadFile]) -> list[str]:
    urls = []
    for f in files:
        if not f.filename:
            continue
        if f.content_type not in ALLOWED_TYPES:
            raise HTTPException(status_code=400, detail=f"Unsupported image type: {f.content_type}")
        data = await f.read()
        if len(data) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="Image too large (max 8 MB)")
        ext = Path(f.filename).suffix or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        (MARKET_IMG_DIR / filename).write_bytes(data)
        urls.append(f"/static/market_images/{filename}")
    return urls


@router.get("/", response_model=list[MarketItemOut])
def list_items(
    category: Optional[str] = None,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return market_service.list_items(db, category=category)


@router.post("/", response_model=MarketItemOut)
async def create_item(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    price: Decimal = Form(Decimal("0")),
    category: str = Form("other"),
    condition: str = Form("good"),
    images: list[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    image_urls = await _save_images(images)
    from app.schemas.market_item import MarketItemCreate
    data = MarketItemCreate(
        title=title,
        description=description,
        price=price,
        category=category,
        condition=condition,
    )
    return market_service.create_item(db, current_user.id, data, image_urls=image_urls)


@router.get("/{item_id}", response_model=MarketItemOut)
def get_item(
    item_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    item = market_service.get_item(db, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


@router.patch("/{item_id}", response_model=MarketItemOut)
def update_item(
    item_id: int,
    payload: MarketItemUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        return market_service.update_item(db, item_id, current_user.id, payload)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc


@router.delete("/{item_id}")
def delete_item(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        deleted = market_service.delete_item(db, item_id, current_user.id)
    except PermissionError as exc:
        raise HTTPException(status_code=403, detail=str(exc)) from exc
    if not deleted:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted"}
