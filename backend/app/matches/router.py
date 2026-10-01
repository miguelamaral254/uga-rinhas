import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_session
from app.infrastructure.riot_client import RiotClient
from app.matches.repository import MatchRepository, PlayerMatchSummary
from app.matches.sync_matches_usecase import SyncMatchesUseCase, SyncResult
from app.players.repository import PlayerRepository

router = APIRouter(prefix="/api/matches", tags=["matches"])

Session = Annotated[AsyncSession, Depends(get_session)]


@router.post("/sync", response_model=SyncResult)
async def sync(session: Session) -> SyncResult:
    use_case = SyncMatchesUseCase(
        PlayerRepository(session), MatchRepository(session), RiotClient()
    )
    return await use_case.execute()


@router.get("/players/{player_id}", response_model=list[PlayerMatchSummary])
async def list_for_player(player_id: uuid.UUID, session: Session) -> list[PlayerMatchSummary]:
    return await MatchRepository(session).list_recent_for_player(player_id)
