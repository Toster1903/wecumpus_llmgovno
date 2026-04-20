from sqlalchemy.orm import Session
from app.models.match import Match
from typing import List

async def like_user(user_id: int, matched_user_id: int, db: Session) -> Match:
    """Record or update like action for a user pair"""
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.matched_user_id == matched_user_id,
    ).first()

    if match:
        match.action = "like"
    else:
        match = Match(user_id=user_id, matched_user_id=matched_user_id, action="like")
        db.add(match)

    db.commit()
    db.refresh(match)
    return match

async def skip_user(user_id: int, matched_user_id: int, db: Session) -> Match:
    """Record or update skip action for a user pair"""
    match = db.query(Match).filter(
        Match.user_id == user_id,
        Match.matched_user_id == matched_user_id,
    ).first()

    if match:
        match.action = "skip"
    else:
        match = Match(user_id=user_id, matched_user_id=matched_user_id, action="skip")
        db.add(match)

    db.commit()
    db.refresh(match)
    return match

async def get_mutual_matches(user_id: int, db: Session) -> List[dict]:
    """Get users who liked current user and current user liked them back"""
    # Find all likes by current user
    user_likes = db.query(Match).filter(
        Match.user_id == user_id,
        Match.action == "like"
    ).all()
    
    liked_ids = [match.matched_user_id for match in user_likes]
    
    if not liked_ids:
        return []
    
    # Find mutual likes (someone liked us back)
    mutual_matches = db.query(Match).filter(
        Match.user_id.in_(liked_ids),
        Match.matched_user_id == user_id,
        Match.action == "like"
    ).all()
    
    return [
        {
            "user_id": m.user_id,
            "username": m.user.email,
            "matched_at": m.created_at
        }
        for m in mutual_matches
    ]

async def get_match_history(user_id: int, db: Session, limit: int = 50) -> List[dict]:
    """Get user's like/skip history"""
    matches = db.query(Match).filter(
        Match.user_id == user_id
    ).order_by(Match.created_at.desc()).limit(limit).all()
    
    return [
        {
            "matched_user_id": m.matched_user_id,
            "action": m.action,
            "created_at": m.created_at
        }
        for m in matches
    ]

def get_already_actioned_users(user_id: int, db: Session) -> List[int]:
    """Get list of users that current user already liked/skipped"""
    matches = db.query(Match).filter(
        Match.user_id == user_id
    ).all()
    
    return [m.matched_user_id for m in matches]
