import datetime
import uuid
from dataclasses import dataclass

from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class GroupMatch:
    id: uuid.UUID
    group_id: uuid.UUID
    team_blue: list[dict]
    team_red: list[dict]
    captain_blue_id: uuid.UUID
    captain_red_id: uuid.UUID
    status: str
    winning_team: str | None
    started_at: datetime.datetime
    ended_at: datetime.datetime | None
    duration_seconds: int | None


class GroupMatchRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, match: GroupMatch) -> None:
        query = text("""
            INSERT INTO lol.group_matches
                (id, group_id, team_blue, team_red, captain_blue_id, captain_red_id, status,
                 started_at)
            VALUES
                (:id, :group_id, :team_blue, :team_red, :captain_blue_id, :captain_red_id, :status,
                 :started_at)
        """).bindparams(
            bindparam("id", type_=PG_UUID(as_uuid=True)),
            bindparam("group_id", type_=PG_UUID(as_uuid=True)),
            bindparam("team_blue", type_=JSONB),
            bindparam("team_red", type_=JSONB),
            bindparam("captain_blue_id", type_=PG_UUID(as_uuid=True)),
            bindparam("captain_red_id", type_=PG_UUID(as_uuid=True)),
        )
        await self._session.execute(
            query,
            {
                "id": match.id,
                "group_id": match.group_id,
                "team_blue": match.team_blue,
                "team_red": match.team_red,
                "captain_blue_id": match.captain_blue_id,
                "captain_red_id": match.captain_red_id,
                "status": match.status,
                "started_at": match.started_at,
            },
        )
        await self._session.commit()

    async def find_by_id(self, match_id: uuid.UUID) -> GroupMatch | None:
        query = text("""
            SELECT id, group_id, team_blue, team_red, captain_blue_id, captain_red_id,
                   status, winning_team, started_at, ended_at, duration_seconds
            FROM lol.group_matches
            WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"id": match_id})
        row = result.first()
        return GroupMatch(**row._mapping) if row else None

    async def list_finished_by_group(self, group_id: uuid.UUID) -> list[GroupMatch]:
        query = text("""
            SELECT id, group_id, team_blue, team_red, captain_blue_id, captain_red_id,
                   status, winning_team, started_at, ended_at, duration_seconds
            FROM lol.group_matches
            WHERE group_id = :group_id AND status = 'FINISHED'
        """).bindparams(bindparam("group_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"group_id": group_id})
        return [GroupMatch(**row._mapping) for row in result]

    async def finish(
        self, match_id: uuid.UUID, winning_team: str, ended_at: datetime.datetime, duration_seconds: int
    ) -> None:
        query = text("""
            UPDATE lol.group_matches
            SET status = 'FINISHED', winning_team = :winning_team,
                ended_at = :ended_at, duration_seconds = :duration_seconds
            WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(
            query,
            {
                "id": match_id,
                "winning_team": winning_team,
                "ended_at": ended_at,
                "duration_seconds": duration_seconds,
            },
        )
        await self._session.commit()
