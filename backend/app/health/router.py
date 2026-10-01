from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_session

router = APIRouter(prefix="/api/health", tags=["health"])


class HealthResponse(BaseModel):
    status: str


@router.get("", response_model=HealthResponse)
async def get_health(session: Annotated[AsyncSession, Depends(get_session)]) -> HealthResponse:
    try:
        await session.execute(text("SELECT 1"))
        return HealthResponse(status="UP")
    except Exception:  # noqa: BLE001 - reported as a status, not raised
        return HealthResponse(status="DOWN")
