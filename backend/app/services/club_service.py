from datetime import datetime, timezone
from sqlalchemy import func, or_
from sqlalchemy.orm import Session
from app.models.club import Club
from app.models.club_member import ClubMember
from app.models.club_invite import ClubInvite
from app.models.user import User
from app.models.profile import Profile


def _normalize_tags(tags: list[str] | None) -> list[str]:
    unique = []
    seen = set()

    for raw in tags or []:
        tag = (raw or "").strip().lower()
        if not tag or tag in seen:
            continue
        seen.add(tag)
        unique.append(tag)

    return unique[:15]


def _membership_for_user(db: Session, club_id: int, user_id: int) -> ClubMember | None:
    return db.query(ClubMember).filter(
        ClubMember.club_id == club_id,
        ClubMember.user_id == user_id,
    ).first()


def _member_counts(db: Session, club_ids: list[int]) -> dict[int, int]:
    if not club_ids:
        return {}

    rows = db.query(
        ClubMember.club_id,
        func.count(ClubMember.id),
    ).filter(
        ClubMember.club_id.in_(club_ids)
    ).group_by(
        ClubMember.club_id
    ).all()
    return {club_id: count for club_id, count in rows}


def _profiles_map(db: Session, user_ids: list[int]) -> dict[int, Profile]:
    if not user_ids:
        return {}
    profiles = db.query(Profile).filter(Profile.user_id.in_(user_ids)).all()
    return {profile.user_id: profile for profile in profiles}


def _users_map(db: Session, user_ids: list[int]) -> dict[int, User]:
    if not user_ids:
        return {}
    users = db.query(User).filter(User.id.in_(user_ids)).all()
    return {user.id: user for user in users}


def search_users_for_invite(
    db: Session,
    query: str,
    current_user_id: int,
    club_id: int | None = None,
    limit: int = 8,
) -> list[dict]:
    clean_query = (query or "").strip().lower()
    if not clean_query:
        return []

    if club_id is not None:
        membership = _membership_for_user(db, club_id, current_user_id)
        if not membership:
            raise PermissionError("Вы не состоите в этом клубе")
        if membership.role != "owner":
            raise PermissionError("Только владелец клуба может приглашать участников")

    like = f"%{clean_query}%"
    users = db.query(User).filter(
        User.id != current_user_id,
        or_(
            func.lower(User.email).ilike(like),
            User.id.in_(db.query(Profile.user_id).filter(func.lower(Profile.full_name).ilike(like))),
        )
    ).limit(limit * 2).all()

    user_ids = [user.id for user in users]
    profile_map = _profiles_map(db, user_ids)

    member_ids = set()
    if club_id is not None:
        memberships = db.query(ClubMember).filter(ClubMember.club_id == club_id).all()
        member_ids = {membership.user_id for membership in memberships}

    suggestions = []
    for user in users:
        if user.id in member_ids:
            continue
        profile = profile_map.get(user.id)
        suggestions.append({
            "user_id": user.id,
            "email": user.email,
            "full_name": profile.full_name if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
        })
        if len(suggestions) >= limit:
            break

    return suggestions


def _summary_from_club(club: Club, current_user_id: int, my_role: str, member_count: int) -> dict:
    return {
        "id": club.id,
        "owner_id": club.owner_id,
        "name": club.name,
        "description": club.description,
        "avatar_url": club.avatar_url,
        "tags": club.tags or [],
        "member_count": member_count,
        "my_role": my_role,
        "is_owner": club.owner_id == current_user_id,
        "created_at": club.created_at,
        "updated_at": club.updated_at,
    }


def get_my_clubs(db: Session, user_id: int) -> list[dict]:
    memberships = db.query(ClubMember).filter(ClubMember.user_id == user_id).all()
    if not memberships:
        return []

    club_ids = [membership.club_id for membership in memberships]
    role_map = {membership.club_id: membership.role for membership in memberships}
    count_map = _member_counts(db, club_ids)

    clubs = db.query(Club).filter(Club.id.in_(club_ids)).order_by(Club.updated_at.desc()).all()

    return [
        _summary_from_club(
            club=club,
            current_user_id=user_id,
            my_role=role_map.get(club.id, "member"),
            member_count=count_map.get(club.id, 1),
        )
        for club in clubs
    ]


def get_club_summary_for_user(db: Session, club_id: int, user_id: int) -> dict:
    membership = _membership_for_user(db, club_id, user_id)
    if not membership:
        raise PermissionError("Вы не состоите в этом клубе")

    club = db.query(Club).filter(Club.id == club_id).first()
    if not club:
        raise ValueError("Клуб не найден")

    counts = _member_counts(db, [club_id])
    return _summary_from_club(club, user_id, membership.role, counts.get(club_id, 1))


def create_club(db: Session, owner_id: int, payload: dict) -> dict:
    name = (payload.get("name") or "").strip()
    if len(name) < 2:
        raise ValueError("Название клуба должно быть минимум 2 символа")

    club = Club(
        owner_id=owner_id,
        name=name,
        description=(payload.get("description") or "").strip() or None,
        avatar_url=(payload.get("avatar_url") or "").strip() or None,
        tags=_normalize_tags(payload.get("tags")),
    )
    db.add(club)
    db.flush()

    db.add(ClubMember(club_id=club.id, user_id=owner_id, role="owner"))
    db.commit()
    db.refresh(club)

    return get_club_summary_for_user(db, club.id, owner_id)


def get_club_detail(db: Session, club_id: int, user_id: int) -> dict:
    summary = get_club_summary_for_user(db, club_id, user_id)

    members = db.query(ClubMember).filter(ClubMember.club_id == club_id).order_by(ClubMember.joined_at.asc()).all()
    member_user_ids = [member.user_id for member in members]
    user_map = _users_map(db, member_user_ids)
    profile_map = _profiles_map(db, member_user_ids)

    members_out = []
    for member in members:
        user = user_map.get(member.user_id)
        profile = profile_map.get(member.user_id)
        if not user:
            continue
        members_out.append({
            "user_id": member.user_id,
            "email": user.email,
            "full_name": profile.full_name if profile else None,
            "avatar_url": profile.avatar_url if profile else None,
            "role": member.role,
            "joined_at": member.joined_at,
        })

    pending_invites_out = []
    if summary["is_owner"]:
        pending = db.query(ClubInvite).filter(
            ClubInvite.club_id == club_id,
            ClubInvite.status == "pending",
        ).order_by(ClubInvite.created_at.desc()).all()

        invited_user_ids = [invite.invited_user_id for invite in pending]
        invited_users = _users_map(db, invited_user_ids)
        invited_profiles = _profiles_map(db, invited_user_ids)

        pending_invites_out = [
            {
                "id": invite.id,
                "invited_user_id": invite.invited_user_id,
                "invited_user_email": invited_users.get(invite.invited_user_id).email if invited_users.get(invite.invited_user_id) else "",
                "invited_user_name": invited_profiles.get(invite.invited_user_id).full_name if invited_profiles.get(invite.invited_user_id) else None,
                "invited_user_avatar_url": invited_profiles.get(invite.invited_user_id).avatar_url if invited_profiles.get(invite.invited_user_id) else None,
                "invited_by_user_id": invite.invited_by_user_id,
                "created_at": invite.created_at,
            }
            for invite in pending
            if invited_users.get(invite.invited_user_id)
        ]

    return {
        **summary,
        "members": members_out,
        "pending_invites": pending_invites_out,
    }


def invite_user_to_club(
    db: Session,
    club_id: int,
    inviter_user_id: int,
    user_id: int | None = None,
    email: str | None = None,
) -> dict:
    membership = _membership_for_user(db, club_id, inviter_user_id)
    if not membership:
        raise PermissionError("Вы не состоите в этом клубе")
    if membership.role != "owner":
        raise PermissionError("Только владелец клуба может приглашать участников")

    invited_user = None
    if user_id is not None:
        invited_user = db.query(User).filter(User.id == user_id).first()
    else:
        clean_email = (email or "").strip().lower()
        if not clean_email:
            raise ValueError("Укажите пользователя для приглашения")
        invited_user = db.query(User).filter(func.lower(User.email) == clean_email).first()

    if not invited_user:
        raise ValueError("Пользователь не найден")

    if invited_user.id == inviter_user_id:
        raise ValueError("Нельзя пригласить себя")

    existing_member = _membership_for_user(db, club_id, invited_user.id)
    if existing_member:
        raise ValueError("Этот пользователь уже состоит в клубе")

    existing_pending = db.query(ClubInvite).filter(
        ClubInvite.club_id == club_id,
        ClubInvite.invited_user_id == invited_user.id,
        ClubInvite.status == "pending",
    ).first()
    if existing_pending:
        raise ValueError("Приглашение уже отправлено")

    invite = ClubInvite(
        club_id=club_id,
        invited_user_id=invited_user.id,
        invited_by_user_id=inviter_user_id,
        status="pending",
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    invited_profile = db.query(Profile).filter(Profile.user_id == invited_user.id).first()
    return {
        "id": invite.id,
        "invited_user_id": invited_user.id,
        "invited_user_email": invited_user.email,
        "invited_user_name": invited_profile.full_name if invited_profile else None,
        "invited_user_avatar_url": invited_profile.avatar_url if invited_profile else None,
        "invited_by_user_id": invite.invited_by_user_id,
        "created_at": invite.created_at,
    }


def get_my_pending_invites(db: Session, user_id: int) -> list[dict]:
    invites = db.query(ClubInvite).filter(
        ClubInvite.invited_user_id == user_id,
        ClubInvite.status == "pending",
    ).order_by(ClubInvite.created_at.desc()).all()

    if not invites:
        return []

    club_ids = [invite.club_id for invite in invites]
    inviter_ids = [invite.invited_by_user_id for invite in invites]

    clubs = db.query(Club).filter(Club.id.in_(club_ids)).all()
    club_map = {club.id: club for club in clubs}

    inviters = _users_map(db, inviter_ids)
    inviter_profiles = _profiles_map(db, inviter_ids)

    out = []
    for invite in invites:
        club = club_map.get(invite.club_id)
        inviter = inviters.get(invite.invited_by_user_id)
        if not club or not inviter:
            continue
        inviter_profile = inviter_profiles.get(inviter.id)
        out.append({
            "invite_id": invite.id,
            "club_id": club.id,
            "club_name": club.name,
            "club_avatar_url": club.avatar_url,
            "invited_by_user_id": inviter.id,
            "invited_by_email": inviter.email,
            "invited_by_name": inviter_profile.full_name if inviter_profile else None,
            "created_at": invite.created_at,
        })

    return out


def respond_to_invite(db: Session, invite_id: int, user_id: int, accept: bool):
    invite = db.query(ClubInvite).filter(
        ClubInvite.id == invite_id,
        ClubInvite.invited_user_id == user_id,
    ).first()

    if not invite:
        raise ValueError("Приглашение не найдено")

    if invite.status != "pending":
        raise ValueError("Приглашение уже обработано")

    invite.status = "accepted" if accept else "declined"
    invite.responded_at = datetime.now(timezone.utc)

    if accept:
        existing_member = _membership_for_user(db, invite.club_id, user_id)
        if not existing_member:
            db.add(ClubMember(club_id=invite.club_id, user_id=user_id, role="member"))

    db.add(invite)
    db.commit()
    db.refresh(invite)
    return invite
