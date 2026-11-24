"""Routes for /notes.

Sprint 1 ships creation (POST /notes) and the shared listing (GET /notes).
Request and response shapes come from app.schemas, the error codes from app.errors,
so the OpenAPI document carries the full contract.
"""

from datetime import UTC, datetime
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import NOTE_INVALID, NOTE_NOT_FOUND
from app.models import Note
from app.schemas import NoteCreate, NoteRead

router = APIRouter(prefix="/notes", tags=["Notes"])


def list_note_records(session: Session) -> list[Note]:
    """Return every note in the shared store, newest-created-first (AC-005, AC-006).

    There is no per-user or per-browser separation (NFR-002): this is the one shared
    list every visitor reads, ordered by `created_at` descending so the note created
    last is first regardless of which visitor or device created it.
    """
    return list(session.scalars(select(Note).order_by(Note.created_at.desc())).all())


def create_note_record(session: Session, body: NoteCreate) -> Note:
    """Persist a validated note and return the saved row (AC-001).

    `body` has already passed `NoteCreate`'s own field constraints (title 1-100
    characters, body up to 2,000), so the only job left here is to save it.

    `created_at` is stamped here, with the application's own clock, rather than left
    to the column's `server_default=func.now()`: on PostgreSQL `now()` returns the
    start time of the surrounding transaction, not the statement's own time, so two
    notes created in the same transaction (as every test here does, and as two
    requests handled back to back sometimes do) would otherwise get the exact same
    timestamp and the newest-first order (AC-005, AC-006) would be unreliable.
    """
    note = Note(id=str(uuid4()), title=body.title, body=body.body, created_at=datetime.now(UTC))
    session.add(note)
    session.commit()
    session.refresh(note)
    return note


def delete_note_record(session: Session, note_id: str) -> bool:
    """Permanently remove one note from the shared store (AC-010, AC-012).

    Returns `True` when a note with `note_id` was found and deleted, `False` when there
    was nothing to delete -- the caller turns that into the 404 the router advertises.
    There is no soft-delete, trash or recovery path: the row is gone from the shared
    store for every visitor the moment this commits.
    """
    note = session.get(Note, note_id)
    if note is None:
        return False
    session.delete(note)
    session.commit()
    return True


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


@router.get(
    "",
    response_model=list[NoteRead],
    status_code=status.HTTP_200_OK,
)
def list_notes(session: Annotated[Session, Depends(get_db)]) -> list[NoteRead]:
    """Return every note in the shared store, newest-created-first (AC-005, AC-006)."""
    notes = list_note_records(session)
    return [NoteRead.model_validate(note) for note in notes]


@router.delete(
    "/{note_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    responses={NOTE_NOT_FOUND.status: {"description": NOTE_NOT_FOUND.message}},
)
def delete_note(note_id: str, session: Annotated[Session, Depends(get_db)]) -> None:
    """Permanently delete one note from the shared store (AC-009, AC-010, AC-012).

    Any visitor may delete any note (NFR-001): there is no owner check. A missing or
    already-deleted id raises the 404 this route advertises rather than succeeding
    silently, so a caller retrying a stale id finds out it is gone.
    """
    deleted = delete_note_record(session, note_id)
    if not deleted:
        raise HTTPException(status_code=NOTE_NOT_FOUND.status, detail=NOTE_NOT_FOUND.message)
