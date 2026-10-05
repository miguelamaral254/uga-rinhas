import datetime
import uuid
from dataclasses import dataclass

from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class MatchParticipant:
    player_id: uuid.UUID
    champion_name: str
    team_id: int
    win: bool
    kills: int
    deaths: int
    assists: int
    team_position: str
    items: list[int]
    champion_level: int
    summoner1_id: int
    summoner2_id: int
    cs: int
    kill_participation: int


@dataclass(frozen=True)
class Match:
    match_id: str
    queue_id: int
    game_mode: str
    map_id: int
    game_creation: datetime.datetime
    game_duration_seconds: int
    participants: list[MatchParticipant]
    # Every one of the 10 players in the game, win/loss/champion/items/kda,
    # including the ones who aren't tracked players - powers the match-detail
    # view's "who did they play against" roster.
    participants_raw: list[dict]


@dataclass(frozen=True)
class MatchRecord:
    match_id: str
    queue_id: int
    game_mode: str
    map_id: int
    game_creation: datetime.datetime
    game_duration_seconds: int
    participants_raw: list[dict]


@dataclass(frozen=True)
class PlayerMatchSummary:
    match_id: str
    queue_id: int
    game_creation: datetime.datetime
    game_duration_seconds: int
    champion_name: str
    win: bool
    kills: int
    deaths: int
    assists: int
    items: list[int]
    champion_level: int
    summoner1_id: int
    summoner2_id: int
    cs: int
    kill_participation: int
    participants_raw: list[dict]


@dataclass(frozen=True)
class ChampionStat:
    champion_name: str
    games: int
    wins: int


@dataclass(frozen=True)
class RoleStat:
    team_position: str
    games: int


@dataclass(frozen=True)
class OverallStats:
    played: int
    wins: int
    avg_kills: float
    avg_deaths: float
    avg_assists: float


class MatchRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def is_checked(self, match_id: str) -> bool:
        result = await self._session.execute(
            text("SELECT 1 FROM lol.checked_matches WHERE match_id = :match_id"),
            {"match_id": match_id},
        )
        return result.first() is not None

    async def mark_checked(self, match_id: str) -> None:
        await self._session.execute(
            text("""
                INSERT INTO lol.checked_matches (match_id) VALUES (:match_id)
                ON CONFLICT (match_id) DO NOTHING
            """),
            {"match_id": match_id},
        )
        await self._session.commit()

    async def save(self, match: Match) -> None:
        await self._session.execute(
            text("""
                INSERT INTO lol.matches
                    (match_id, queue_id, game_mode, map_id, game_creation, game_duration_seconds,
                     participants_raw)
                VALUES
                    (:match_id, :queue_id, :game_mode, :map_id, :game_creation, :game_duration_seconds,
                     :participants_raw)
            """).bindparams(bindparam("participants_raw", type_=JSONB)),
            {
                "match_id": match.match_id,
                "queue_id": match.queue_id,
                "game_mode": match.game_mode,
                "map_id": match.map_id,
                "game_creation": match.game_creation,
                "game_duration_seconds": match.game_duration_seconds,
                "participants_raw": match.participants_raw,
            },
        )
        participants_query = text("""
            INSERT INTO lol.match_participants
                (match_id, player_id, champion_name, team_id, win, kills, deaths,
                 assists, team_position, items, champion_level, summoner1_id, summoner2_id,
                 cs, kill_participation)
            VALUES
                (:match_id, :player_id, :champion_name, :team_id, :win, :kills, :deaths,
                 :assists, :team_position, :items, :champion_level, :summoner1_id, :summoner2_id,
                 :cs, :kill_participation)
        """).bindparams(bindparam("items", type_=JSONB))
        for p in match.participants:
            await self._session.execute(
                participants_query,
                {
                    "match_id": match.match_id,
                    "player_id": p.player_id,
                    "champion_name": p.champion_name,
                    "team_id": p.team_id,
                    "win": p.win,
                    "kills": p.kills,
                    "deaths": p.deaths,
                    "assists": p.assists,
                    "team_position": p.team_position,
                    "items": p.items,
                    "champion_level": p.champion_level,
                    "summoner1_id": p.summoner1_id,
                    "summoner2_id": p.summoner2_id,
                    "cs": p.cs,
                    "kill_participation": p.kill_participation,
                },
            )
        await self._session.commit()

    async def list_recent_for_player(
        self, player_id: uuid.UUID, limit: int = 20
    ) -> list[PlayerMatchSummary]:
        query = text("""
            SELECT m.match_id, m.queue_id, m.game_creation, m.game_duration_seconds,
                   mp.champion_name, mp.win, mp.kills, mp.deaths, mp.assists, mp.items,
                   mp.champion_level, mp.summoner1_id, mp.summoner2_id, mp.cs,
                   mp.kill_participation, m.participants_raw
            FROM lol.match_participants mp
            JOIN lol.matches m ON m.match_id = mp.match_id
            WHERE mp.player_id = :player_id
            ORDER BY m.game_creation DESC
            LIMIT :limit
        """).bindparams(bindparam("player_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"player_id": player_id, "limit": limit})
        return [PlayerMatchSummary(**row._mapping) for row in result]

    async def get_by_id(self, match_id: str) -> MatchRecord | None:
        result = await self._session.execute(
            text("""
                SELECT match_id, queue_id, game_mode, map_id, game_creation,
                       game_duration_seconds, participants_raw
                FROM lol.matches
                WHERE match_id = :match_id
            """),
            {"match_id": match_id},
        )
        row = result.first()
        return MatchRecord(**row._mapping) if row else None

    async def get_overall_stats(self, player_id: uuid.UUID) -> OverallStats:
        query = text("""
            SELECT
                COUNT(*) AS played,
                COUNT(*) FILTER (WHERE win) AS wins,
                COALESCE(AVG(kills), 0) AS avg_kills,
                COALESCE(AVG(deaths), 0) AS avg_deaths,
                COALESCE(AVG(assists), 0) AS avg_assists
            FROM lol.match_participants
            WHERE player_id = :player_id
        """).bindparams(bindparam("player_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"player_id": player_id})
        return OverallStats(**result.first()._mapping)

    async def get_champion_stats(self, player_id: uuid.UUID, limit: int = 5) -> list[ChampionStat]:
        query = text("""
            SELECT champion_name, COUNT(*) AS games, COUNT(*) FILTER (WHERE win) AS wins
            FROM lol.match_participants
            WHERE player_id = :player_id
            GROUP BY champion_name
            ORDER BY games DESC, wins DESC
            LIMIT :limit
        """).bindparams(bindparam("player_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"player_id": player_id, "limit": limit})
        return [ChampionStat(**row._mapping) for row in result]

    async def get_role_stats(self, player_id: uuid.UUID) -> list[RoleStat]:
        query = text("""
            SELECT team_position, COUNT(*) AS games
            FROM lol.match_participants
            WHERE player_id = :player_id
            GROUP BY team_position
            ORDER BY games DESC
        """).bindparams(bindparam("player_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"player_id": player_id})
        return [RoleStat(**row._mapping) for row in result]
