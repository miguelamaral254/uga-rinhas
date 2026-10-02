import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.infrastructure.database import get_session
from app.infrastructure.riot_client import RiotClient
from app.matches.repository import MatchRepository
from app.players.get_player_profile_usecase import GetPlayerProfileUseCase, PlayerProfile
from app.players.list_players_usecase import ListPlayersUseCase, PlayerStats
from app.players.repository import PlayerRepository

router = APIRouter(prefix="/api/players", tags=["players"])

Session = Annotated[AsyncSession, Depends(get_session)]


@router.get("", response_model=list[PlayerStats])
async def list_players(session: Session) -> list[PlayerStats]:
    use_case = ListPlayersUseCase(PlayerRepository(session))
    return await use_case.execute()


@router.get("/{player_id}/profile", response_model=PlayerProfile)
async def get_profile(player_id: uuid.UUID, session: Session) -> PlayerProfile:
    use_case = GetPlayerProfileUseCase(
        PlayerRepository(session), MatchRepository(session), RiotClient()
    )
    return await use_case.execute(player_id)
