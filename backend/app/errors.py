"""Error codes: one named constant per error an endpoint can return.

A router attaches the constant's status to its `responses=` mapping and raises an
`HTTPException(code.status, code.message)` with it, so the OpenAPI document and the
exception a caller actually gets never drift apart.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ErrorCode:
    status: int
    message: str


# POST /notes: the title and body are validated by the request model's own field
# constraints (app.schemas.NoteCreate), which FastAPI reports as this status whenever
# the title is missing, empty, or either field is too long (AC-002, AC-003, AC-004).
NOTE_INVALID = ErrorCode(
    422,
    "Title is required and must be 1 to 100 characters; body must be 2,000 characters or fewer.",
)
