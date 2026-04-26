from sqlalchemy.orm import Session
from app.models.post import Post
from app.models.profile import Profile
from app.schemas.post import PostCreate


def _enrich(post: Post, db: Session) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == post.author_id).first()
    return {
        "id": post.id,
        "author_id": post.author_id,
        "author_name": profile.full_name if profile else None,
        "author_avatar_url": profile.avatar_url if profile else None,
        "title": post.title,
        "content": post.content,
        "tags": post.tags or [],
        "created_at": post.created_at,
    }


def list_posts(db: Session, limit: int = 50) -> list[dict]:
    posts = (
        db.query(Post)
        .order_by(Post.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_enrich(p, db) for p in posts]


def get_posts_by_interests(db: Session, interests: list[str], limit: int = 20) -> list[dict]:
    """Return posts whose tags overlap with the user's interests."""
    if not interests:
        return list_posts(db, limit)
    lower_interests = [i.lower() for i in interests]
    posts = db.query(Post).order_by(Post.created_at.desc()).limit(200).all()
    scored = []
    for p in posts:
        tags = [t.lower() for t in (p.tags or [])]
        overlap = len(set(tags) & set(lower_interests))
        scored.append((overlap, p))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [_enrich(p, db) for _, p in scored[:limit]]


def create_post(db: Session, author_id: int, data: PostCreate) -> dict:
    post = Post(
        author_id=author_id,
        title=data.title,
        content=data.content,
        tags=data.tags or [],
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _enrich(post, db)


def delete_post(db: Session, post_id: int, user_id: int) -> bool:
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        return False
    if post.author_id != user_id:
        raise PermissionError("Only the author can delete this post")
    db.delete(post)
    db.commit()
    return True
