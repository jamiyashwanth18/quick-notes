"""Pydantic request and response models.

One pair per entity in the approved data model, plus the placeholder every
generated route returns until it has been implemented. Every model is an ApiModel,
so its JSON uses camelCase names (app/api_model.py).
"""

from datetime import datetime

from pydantic import Field

from app.api_model import ApiModel


class StubResponse(ApiModel):
    """What a generated route returns until someone implements it.

    A stub that returns a typed body rather than raising keeps the service
    startable and its OpenAPI document complete, so the frontend can be built
    against the agreed shape while the handlers are still being written.
    """

    endpoint: str
    status: str = "not_implemented"
    detail: str = "Scaffolded from the approved API spec; no behaviour yet."


class UserCreate(ApiModel):
    email: str
    role: str


class UserRead(ApiModel):
    id: str
    email: str
    role: str


class NoteCreate(ApiModel):
    """Request body of POST /notes (AC-001, AC-002, AC-003, AC-004)."""

    title: str = Field(min_length=1, max_length=100)
    body: str = Field(default="", max_length=2000)


class NoteRead(ApiModel):
    """A saved note, as returned by POST /notes (AC-001)."""

    id: str
    title: str
    body: str
    created_at: datetime


class SettingsRead(ApiModel):
    """The current export-limit setting, as returned by GET /settings (AC-018)."""

    export_limit: int


class SettingsUpdate(ApiModel):
    """Request body of PUT /settings (AC-019, AC-020).

    `export_limit` must be a positive whole number: `gt=0` rejects zero and negative
    values, and the `int` type itself rejects anything that is not a whole number.
    """

    export_limit: int = Field(gt=0)
