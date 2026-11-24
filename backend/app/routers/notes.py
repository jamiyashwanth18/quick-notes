"""Routes for /notes.

Sprint 1 ships creation only (POST /notes); listing follows in a later work item.
Request and response shapes come from app.schemas, the error codes from app.errors,
so the OpenAPI document carries the full contract.
"""

from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import NOTE_INVALID
from app.models import Note
from app.schemas import NoteCreate, NoteRead

router = APIRouter(prefix="/notes", tags=["Notes"])


def create_note_record(session: Session, body: NoteCreate) -> Note:
    """Persist a validated note and return the saved row (AC-001).

    `body` has already passed `NoteCreate`'s own field constraints (title 1-100
    characters, body up to 2,000), so the only job left here is to save it.
    """
    note = Note(id=str(uuid4()), title=body.title, body=body.body)
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


@router.post(
    "",
    response_model=NoteRead,
    status_code=status.HTTP_201_CREATED,
    responses={NOTE_INVALID.status: {"description": NOTE_INVALID.message}},
)
def create_note(body: NoteCreate, session: Annotated[Session, Depends(get_db)]) -> NoteRead:
    """Validate the title and body and save the note (AC-001, AC-002, AC-003, AC-004).

    `NoteCreate`'s own field constraints reject a missing/empty title (AC-002) and a
    title or body past its length limit (AC-003, AC-004) with a 422 before this body
    ever runs, so a note reaching here is always saved (AC-001).
    """
    note = create_note_record(session, body)
    return NoteRead.model_validate(note)
