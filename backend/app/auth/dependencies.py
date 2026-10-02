from typing import Annotated

from fastapi import Depends, Header
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.repository import SessionRepository
from app.infrastructure.database import get_session
from app.infrastructure.exceptions import UnauthorizedError
from app.players.repository import Player, PlayerRepository


async def get_current_player(
    session: Annotated[AsyncSession, Depends(get_session)],
    authorization: Annotated[str | None, Header()] = None,
) -> Player:
    if not authorization or not authorization.startswith("Bearer "):
        raise UnauthorizedError("auth.missingToken")

    token = authorization.removeprefix("Bearer ")
    player_id = await SessionRepository(session).find_player_id(token)
    if player_id is None:
        raise UnauthorizedError("auth.invalidToken")

    player = await PlayerRepository(session).find_by_id(player_id)
    if player is None:
        raise UnauthorizedError("auth.invalidToken")

    return player


CurrentPlayer = Annotated[Player, Depends(get_current_player)]
