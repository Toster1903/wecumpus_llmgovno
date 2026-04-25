from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.market_item import MarketItemCreate, MarketItemOut, MarketItemUpdate
from app.services import market_service

router = APIRouter()


@router.get("/", response_model=list[MarketItemOut])
def list_items(
    category: str | None = None,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    return market_service.list_items(db, category=category)


@router.post("/", response_model=MarketItemOut)
def create_item(
    payload: MarketItemCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return market_service.create_item(db, current_user.id, payload)


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
