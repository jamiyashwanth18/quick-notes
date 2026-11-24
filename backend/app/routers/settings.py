"""Routes for /settings.

GET /settings returns the current export-limit setting (AC-018); PUT /settings
changes it (AC-019). Neither route requires authentication (AC-020): both take only
the request body and a database session, never the signed-in user. Request and
response shapes come from app.schemas, the error codes from app.errors, so the
OpenAPI document carries the full contract.
"""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.errors import SETTINGS_INVALID
from app.schemas import SettingsRead, SettingsUpdate
from app.services.settings import get_settings_record, update_export_limit

router = APIRouter(prefix="/settings", tags=["Settings"])


@router.get(
    "",
    response_model=SettingsRead,
    status_code=status.HTTP_200_OK,
)
def get_settings(session: Annotated[Session, Depends(get_db)]) -> SettingsRead:
    """Return the current export-limit setting, defaulting to 100 (AC-018)."""
    settings = get_settings_record(session)
    return SettingsRead.model_validate(settings)


@router.put(
    "",
    response_model=SettingsRead,
    status_code=status.HTTP_200_OK,
    responses={SETTINGS_INVALID.status: {"description": SETTINGS_INVALID.message}},
)
def update_settings(
    body: SettingsUpdate, session: Annotated[Session, Depends(get_db)]
) -> SettingsRead:
    """Change the export-limit setting to a positive whole number (AC-019, AC-020).

    `SettingsUpdate`'s own field constraints reject a non-positive or non-integer
    value with a 422 before this body ever runs.
    """
    settings = update_export_limit(session, body.export_limit)
    return SettingsRead.model_validate(settings)
