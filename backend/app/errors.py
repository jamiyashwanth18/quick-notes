"""Error codes: one named constant per error an endpoint can return.

A router either raises an `HTTPException(code.status, code.message)` with one of
these directly, or -- as with `NOTE_INVALID` below -- attaches its status to a
request model's own field constraints and lets FastAPI/Pydantic raise the
equivalent response, so the OpenAPI document and the response a caller actually
gets never drift apart either way.
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class ErrorCode:
    status: int
    message: str


# POST /notes: the title and body are validated by the request model's own field
# constraints (app.schemas.NoteCreate), which FastAPI reports as this status whenever
# the title is missing, empty, or either field is too long (AC-002, AC-003, AC-004).
# No router code raises this directly -- Pydantic's validation produces the 422
# before `create_note` ever runs -- so this constant documents that response's shape
# for the OpenAPI document (see `responses=` on the route) rather than being passed
# to `HTTPException` itself.
NOTE_INVALID = ErrorCode(
    422,
    "Title is required and must be 1 to 100 characters; body must be 2,000 characters or fewer.",
)

# DELETE /notes/{id}: raised directly by the router when no note with that id exists
# in the shared store (AC-010's counterpart -- deleting an id that is already gone, or
# was never there, must not silently succeed).
NOTE_NOT_FOUND = ErrorCode(404, "Note not found.")
