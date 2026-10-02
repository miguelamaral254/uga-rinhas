import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentPlayer
from app.group_matches.begin_match_usecase import BeginMatchUseCase
from app.group_matches.finish_match_usecase import FinishMatchRequest, FinishMatchUseCase
from app.group_matches.get_match_usecase import GetMatchUseCase
from app.group_matches.get_player_match_history_usecase import (
    GetPlayerMatchHistoryUseCase,
    PlayerMatchHistoryResponse,
)
from app.group_matches.rematch_usecase import RematchUseCase
from app.group_matches.repository import GroupMatchRepository
from app.group_matches.start_match_usecase import (
    GroupMatchResponse,
    StartMatchRequest,
    StartMatchUseCase,
)
from app.groups.repository import GroupRepository
from app.infrastructure.database import get_session
from app.players.repository import PlayerRepository

router = APIRouter(prefix="/api/group-matches", tags=["group-matches"])

Session = Annotated[AsyncSession, Depends(get_session)]


@router.post("", response_model=GroupMatchResponse, status_code=201)
async def start(
    request: StartMatchRequest, session: Session, current_player: CurrentPlayer
) -> GroupMatchResponse:
    use_case = StartMatchUseCase(
        GroupRepository(session),
        PlayerRepository(session),
        GroupMatchRepository(session),
        current_player,
    )
    return await use_case.execute(request)


@router.get("/player/{player_id}/history", response_model=PlayerMatchHistoryResponse)
async def player_history(player_id: uuid.UUID, session: Session) -> PlayerMatchHistoryResponse:
    use_case = GetPlayerMatchHistoryUseCase(GroupMatchRepository(session))
    return await use_case.execute(player_id)


@router.get("/{match_id}", response_model=GroupMatchResponse)
async def get_match(match_id: uuid.UUID, session: Session) -> GroupMatchResponse:
    use_case = GetMatchUseCase(GroupMatchRepository(session))
    return await use_case.execute(match_id)


@router.post("/{match_id}/begin", response_model=GroupMatchResponse)
async def begin(
    match_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> GroupMatchResponse:
    use_case = BeginMatchUseCase(GroupMatchRepository(session), current_player)
    return await use_case.execute(match_id)


@router.post("/{match_id}/rematch", response_model=GroupMatchResponse, status_code=201)
async def rematch(
    match_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> GroupMatchResponse:
    use_case = RematchUseCase(GroupMatchRepository(session), current_player)
    return await use_case.execute(match_id)


@router.post("/{match_id}/finish", response_model=GroupMatchResponse)
async def finish(
    match_id: uuid.UUID,
    request: FinishMatchRequest,
    session: Session,
    current_player: CurrentPlayer,
) -> GroupMatchResponse:
    use_case = FinishMatchUseCase(GroupMatchRepository(session), current_player)
    return await use_case.execute(match_id, request)
