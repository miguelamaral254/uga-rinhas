import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_session
from app.infrastructure.riot_client import RiotClient
from app.matches.get_match_detail_usecase import GetMatchDetailUseCase, MatchDetail
from app.matches.list_player_matches_usecase import (
    ListPlayerMatchesUseCase,
    PlayerMatchSummaryResponse,
)
from app.matches.repository import MatchRepository
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


@router.get("/players/{player_id}", response_model=list[PlayerMatchSummaryResponse])
async def list_for_player(
    player_id: uuid.UUID, session: Session
) -> list[PlayerMatchSummaryResponse]:
    use_case = ListPlayerMatchesUseCase(MatchRepository(session))
    return await use_case.execute(player_id)


@router.get("/{match_id}", response_model=MatchDetail)
async def get_detail(match_id: str, session: Session) -> MatchDetail:
    use_case = GetMatchDetailUseCase(MatchRepository(session))
    return await use_case.execute(match_id)
