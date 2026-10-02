import uuid

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession


class SessionRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, token: str, player_id: uuid.UUID) -> None:
        await self._session.execute(
            text("INSERT INTO lol.sessions (token, player_id) VALUES (:token, :player_id)"),
            {"token": token, "player_id": player_id},
        )
        await self._session.commit()

    async def find_player_id(self, token: str) -> uuid.UUID | None:
        result = await self._session.execute(
            text("SELECT player_id FROM lol.sessions WHERE token = :token"),
            {"token": token},
        )
        row = result.first()
        return row.player_id if row else None

    async def delete(self, token: str) -> None:
        await self._session.execute(
            text("DELETE FROM lol.sessions WHERE token = :token"), {"token": token}
        )
        await self._session.commit()
