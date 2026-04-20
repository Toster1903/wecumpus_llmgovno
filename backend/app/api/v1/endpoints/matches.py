from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from app.db.session import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.services import match_service

router = APIRouter()

class MatchActionRequest(BaseModel):
    matched_user_id: int

@router.post("/like")
async def like_user(
    request: MatchActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like a user"""
    if request.matched_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot like yourself")
    
    # Check if user exists
    from app.models.user import User as UserModel
    matched_user = db.query(UserModel).filter(UserModel.id == request.matched_user_id).first()
    if not matched_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    match = await match_service.like_user(current_user.id, request.matched_user_id, db)
    return {"status": "liked", "match_id": match.id}

@router.post("/skip")
async def skip_user(
    request: MatchActionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Skip a user"""
    if request.matched_user_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot skip yourself")
    
    # Check if user exists
    from app.models.user import User as UserModel
    matched_user = db.query(UserModel).filter(UserModel.id == request.matched_user_id).first()
    if not matched_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    match = await match_service.skip_user(current_user.id, request.matched_user_id, db)
    return {"status": "skipped", "match_id": match.id}

@router.get("/mutual")
async def get_mutual_matches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get mutual matches (both users liked each other)"""
    mutual = await match_service.get_mutual_matches(current_user.id, db)
    return {"mutual_matches": mutual}

@router.get("/history")
async def get_match_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    limit: int = 50
):
    """Get user's match history"""
    history = await match_service.get_match_history(current_user.id, db, limit)
    return {"history": history}
