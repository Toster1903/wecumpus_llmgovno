from sqlalchemy.orm import Session
from app.models.meeting import Meeting, MeetingParticipant
from app.models.profile import Profile
from app.schemas.meeting import MeetingCreate


def _enrich(meeting: Meeting, db: Session, viewer_id: int | None = None) -> dict:
    profile = db.query(Profile).filter(Profile.user_id == meeting.creator_id).first()
    participant_count = len(meeting.participants)
    is_joined = any(p.user_id == viewer_id for p in meeting.participants) if viewer_id else False
    return {
        "id": meeting.id,
        "creator_id": meeting.creator_id,
        "creator_name": profile.full_name if profile else None,
        "title": meeting.title,
        "description": meeting.description,
        "location": meeting.location,
        "scheduled_at": meeting.scheduled_at,
        "participant_count": participant_count,
        "is_joined": is_joined,
        "created_at": meeting.created_at,
    }


def list_meetings(db: Session, viewer_id: int) -> list[dict]:
    meetings = db.query(Meeting).order_by(Meeting.scheduled_at.asc()).all()
    return [_enrich(m, db, viewer_id) for m in meetings]


def create_meeting(db: Session, creator_id: int, data: MeetingCreate) -> dict:
    meeting = Meeting(
        creator_id=creator_id,
        title=data.title,
        description=data.description,
        location=data.location,
        scheduled_at=data.scheduled_at,
    )
    db.add(meeting)
    db.commit()
    db.refresh(meeting)
    # auto-join creator
    participant = MeetingParticipant(meeting_id=meeting.id, user_id=creator_id)
    db.add(participant)
    db.commit()
    db.refresh(meeting)
    return _enrich(meeting, db, creator_id)


def join_meeting(db: Session, meeting_id: int, user_id: int) -> dict:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise ValueError("Meeting not found")
    already = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id, MeetingParticipant.user_id == user_id
    ).first()
    if already:
        raise ValueError("Already joined")
    participant = MeetingParticipant(meeting_id=meeting_id, user_id=user_id)
    db.add(participant)
    db.commit()
    db.refresh(meeting)
    return _enrich(meeting, db, user_id)


def leave_meeting(db: Session, meeting_id: int, user_id: int) -> dict:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        raise ValueError("Meeting not found")
    if meeting.creator_id == user_id:
        raise ValueError("Creator cannot leave their own meeting")
    participant = db.query(MeetingParticipant).filter(
        MeetingParticipant.meeting_id == meeting_id, MeetingParticipant.user_id == user_id
    ).first()
    if not participant:
        raise ValueError("You are not in this meeting")
    db.delete(participant)
    db.commit()
    db.refresh(meeting)
    return _enrich(meeting, db, user_id)


def delete_meeting(db: Session, meeting_id: int, user_id: int) -> bool:
    meeting = db.query(Meeting).filter(Meeting.id == meeting_id).first()
    if not meeting:
        return False
    if meeting.creator_id != user_id:
        raise PermissionError("Only the creator can delete this meeting")
    db.delete(meeting)
    db.commit()
    return True
