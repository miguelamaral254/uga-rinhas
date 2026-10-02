import uuid
from dataclasses import dataclass

from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import ARRAY as PG_ARRAY
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class Player:
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    puuid: str
    region: str
    username: str
    password_hash: str
    profile_icon_id: int | None = None
    summoner_level: int | None = None


@dataclass(frozen=True)
class PlayerWithStats:
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    profile_icon_id: int | None
    wins: int
    losses: int
    played: int


class PlayerRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def find_by_riot_id(self, game_name: str, tag_line: str) -> Player | None:
        query = text("""
            SELECT id, display_name, riot_game_name, riot_tag_line, puuid, region,
                   username, password_hash, profile_icon_id, summoner_level
            FROM lol.players
            WHERE riot_game_name = :game_name AND riot_tag_line = :tag_line
        """)
        result = await self._session.execute(
            query, {"game_name": game_name, "tag_line": tag_line}
        )
        row = result.first()
        return Player(**row._mapping) if row else None

    async def find_by_puuid(self, puuid: str) -> Player | None:
        query = text("""
            SELECT id, display_name, riot_game_name, riot_tag_line, puuid, region,
                   username, password_hash, profile_icon_id, summoner_level
            FROM lol.players
            WHERE puuid = :puuid
        """)
        result = await self._session.execute(query, {"puuid": puuid})
        row = result.first()
        return Player(**row._mapping) if row else None

    async def find_by_username(self, username: str) -> Player | None:
        query = text("""
            SELECT id, display_name, riot_game_name, riot_tag_line, puuid, region,
                   username, password_hash, profile_icon_id, summoner_level
            FROM lol.players
            WHERE username = :username
        """)
        result = await self._session.execute(query, {"username": username})
        row = result.first()
        return Player(**row._mapping) if row else None

    async def find_by_id(self, player_id: uuid.UUID) -> Player | None:
        query = text("""
            SELECT id, display_name, riot_game_name, riot_tag_line, puuid, region,
                   username, password_hash, profile_icon_id, summoner_level
            FROM lol.players
            WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"id": player_id})
        row = result.first()
        return Player(**row._mapping) if row else None

    async def list_all(self) -> list[Player]:
        query = text("""
            SELECT id, display_name, riot_game_name, riot_tag_line, puuid, region,
                   username, password_hash, profile_icon_id, summoner_level
            FROM lol.players
            ORDER BY display_name
        """)
        result = await self._session.execute(query)
        return [Player(**row._mapping) for row in result]

    async def list_by_ids(self, player_ids: list[uuid.UUID]) -> list[Player]:
        if not player_ids:
            return []
        query = text("""
            SELECT id, display_name, riot_game_name, riot_tag_line, puuid, region,
                   username, password_hash, profile_icon_id, summoner_level
            FROM lol.players
            WHERE id = ANY(:ids)
        """).bindparams(bindparam("ids", type_=PG_ARRAY(PG_UUID(as_uuid=True))))
        result = await self._session.execute(query, {"ids": player_ids})
        return [Player(**row._mapping) for row in result]

    async def list_with_stats(self) -> list[PlayerWithStats]:
        query = text("""
            SELECT
                p.id, p.display_name, p.riot_game_name, p.riot_tag_line, p.profile_icon_id,
                COUNT(mp.match_id) FILTER (WHERE mp.win) AS wins,
                COUNT(mp.match_id) FILTER (WHERE NOT mp.win) AS losses,
                COUNT(mp.match_id) AS played
            FROM lol.players p
            LEFT JOIN lol.match_participants mp ON mp.player_id = p.id
            GROUP BY p.id
            ORDER BY wins DESC, p.display_name
        """)
        result = await self._session.execute(query)
        return [PlayerWithStats(**row._mapping) for row in result]

    async def save(self, player: Player) -> None:
        query = text("""
            INSERT INTO lol.players
                (id, display_name, riot_game_name, riot_tag_line, puuid, region,
                 username, password_hash, profile_icon_id, summoner_level)
            VALUES
                (:id, :display_name, :riot_game_name, :riot_tag_line, :puuid, :region,
                 :username, :password_hash, :profile_icon_id, :summoner_level)
        """)
        await self._session.execute(query, vars(player))
        await self._session.commit()

    async def update_profile(
        self, player_id: uuid.UUID, profile_icon_id: int, summoner_level: int
    ) -> None:
        query = text("""
            UPDATE lol.players
            SET profile_icon_id = :profile_icon_id, summoner_level = :summoner_level
            WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(
            query,
            {
                "id": player_id,
                "profile_icon_id": profile_icon_id,
                "summoner_level": summoner_level,
            },
        )
        await self._session.commit()

    async def update_display_name(self, player_id: uuid.UUID, display_name: str) -> None:
        query = text("""
            UPDATE lol.players SET display_name = :display_name WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(query, {"id": player_id, "display_name": display_name})
        await self._session.commit()

    async def update_password_hash(self, player_id: uuid.UUID, password_hash: str) -> None:
        query = text("""
            UPDATE lol.players SET password_hash = :password_hash WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(query, {"id": player_id, "password_hash": password_hash})
        await self._session.commit()
