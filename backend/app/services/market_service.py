from sqlalchemy.orm import Session
from app.models.market_item import MarketItem
from app.models.profile import Profile
from app.schemas.market_item import MarketItemCreate, MarketItemUpdate


def _enrich(item: MarketItem, db: Session) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == item.seller_id).first()
    return {
        "id": item.id,
        "seller_id": item.seller_id,
        "seller_name": profile.full_name if profile else None,
        "title": item.title,
        "description": item.description,
        "price": item.price,
        "category": item.category,
        "condition": item.condition,
        "is_available": item.is_available,
        "created_at": item.created_at,
    }


def list_items(db: Session, category: str | None = None) -> list[dict]:
    q = db.query(MarketItem).filter(MarketItem.is_available == True)
    if category:
        q = q.filter(MarketItem.category == category)
    items = q.order_by(MarketItem.created_at.desc()).all()
    return [_enrich(i, db) for i in items]


def create_item(db: Session, seller_id: int, data: MarketItemCreate) -> dict:
    item = MarketItem(
        seller_id=seller_id,
        title=data.title,
        description=data.description,
        price=data.price,
        category=data.category,
        condition=data.condition,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return _enrich(item, db)


def get_item(db: Session, item_id: int) -> dict | None:
    item = db.query(MarketItem).filter(MarketItem.id == item_id).first()
    return _enrich(item, db) if item else None


def update_item(db: Session, item_id: int, user_id: int, data: MarketItemUpdate) -> dict:
    item = db.query(MarketItem).filter(MarketItem.id == item_id).first()
    if not item:
        raise ValueError("Item not found")
    if item.seller_id != user_id:
        raise PermissionError("Only the seller can update this listing")
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(item, field, value)
    db.commit()
    db.refresh(item)
    return _enrich(item, db)


def delete_item(db: Session, item_id: int, user_id: int) -> bool:
    item = db.query(MarketItem).filter(MarketItem.id == item_id).first()
    if not item:
        return False
    if item.seller_id != user_id:
        raise PermissionError("Only the seller can delete this listing")
    db.delete(item)
    db.commit()
    return True
