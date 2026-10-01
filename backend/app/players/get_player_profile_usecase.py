import uuid

from pydantic import BaseModel, Field

from app.infrastructure import ddragon
from app.infrastructure.exceptions import ResourceNotFoundError
from app.infrastructure.riot_client import RiotClient
from app.matches.repository import MatchRepository
from app.players.repository import PlayerRepository
from app.shared.usecase import UseCase

_ROLE_LABELS = {
    "TOP": "Topo",
    "JUNGLE": "Selva",
    "MIDDLE": "Meio",
    "BOTTOM": "Atirador",
    "UTILITY": "Suporte",
    "": "Não identificada",
}

_QUEUE_LABELS = {
    "RANKED_SOLO_5x5": "Solo/Duo",
    "RANKED_FLEX_SR": "Flex",
}


class ChampionStatResponse(BaseModel):
    champion_name: str
    champion_icon_url: str
    games: int
    wins: int
    win_rate: float = Field(ge=0, le=100)


class RoleStatResponse(BaseModel):
    role: str
    games: int


class RankEntryResponse(BaseModel):
    queue: str
    tier: str
    rank: str
    league_points: int
    wins: int
    losses: int
    emblem_url: str


class MasteryResponse(BaseModel):
    champion_name: str
    champion_icon_url: str
    level: int
    points: int


class PlayerProfile(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    summoner_level: int | None
    profile_icon_url: str | None
    wins: int
    losses: int
    played: int
    win_rate: float = Field(ge=0, le=100)
    avg_kills: float
    avg_deaths: float
    avg_assists: float
    top_champions: list[ChampionStatResponse]
    roles: list[RoleStatResponse]
    ranks: list[RankEntryResponse]
    masteries: list[MasteryResponse]


class GetPlayerProfileUseCase(UseCase[uuid.UUID, PlayerProfile]):
    def __init__(
        self,
        player_repository: PlayerRepository,
        match_repository: MatchRepository,
        riot_client: RiotClient,
    ):
        self._player_repository = player_repository
        self._match_repository = match_repository
        self._riot_client = riot_client

    async def execute(self, player_id: uuid.UUID) -> PlayerProfile:
        player = await self._player_repository.find_by_id(player_id)
        if player is None:
            raise ResourceNotFoundError("player.notFound")

        overall = await self._match_repository.get_overall_stats(player_id)
        champions = await self._match_repository.get_champion_stats(player_id)
        roles = await self._match_repository.get_role_stats(player_id)
        league_entries = await self._riot_client.get_league_entries_by_puuid(player.puuid)
        top_masteries = await self._riot_client.get_top_champion_masteries(player.puuid)

        version = await ddragon.get_latest_version()
        champions_by_id = await ddragon.get_champions_by_id()

        return PlayerProfile(
            id=player.id,
            display_name=player.display_name,
            riot_game_name=player.riot_game_name,
            riot_tag_line=player.riot_tag_line,
            summoner_level=player.summoner_level,
            profile_icon_url=(
                ddragon.profile_icon_url(version, player.profile_icon_id)
                if player.profile_icon_id
                else None
            ),
            wins=overall.wins,
            losses=overall.played - overall.wins,
            played=overall.played,
            win_rate=round(overall.wins * 100 / overall.played, 2) if overall.played else 0,
            avg_kills=round(overall.avg_kills, 1),
            avg_deaths=round(overall.avg_deaths, 1),
            avg_assists=round(overall.avg_assists, 1),
            top_champions=[
                ChampionStatResponse(
                    champion_name=c.champion_name,
                    champion_icon_url=ddragon.champion_icon_url(version, c.champion_name),
                    games=c.games,
                    wins=c.wins,
                    win_rate=round(c.wins * 100 / c.games, 2) if c.games else 0,
                )
                for c in champions
            ],
            roles=[
                RoleStatResponse(
                    role=_ROLE_LABELS.get(r.team_position, r.team_position),
                    games=r.games,
                )
                for r in roles
            ],
            ranks=[
                RankEntryResponse(
                    queue=_QUEUE_LABELS.get(entry["queueType"], entry["queueType"]),
                    tier=entry["tier"].capitalize(),
                    rank=entry["rank"],
                    league_points=entry["leaguePoints"],
                    wins=entry["wins"],
                    losses=entry["losses"],
                    emblem_url=ddragon.rank_emblem_url(entry["tier"]),
                )
                for entry in league_entries
                if entry["queueType"] in _QUEUE_LABELS
            ],
            masteries=[
                MasteryResponse(
                    champion_name=champions_by_id[m["championId"]]["name"],
                    champion_icon_url=ddragon.champion_icon_url(
                        version, champions_by_id[m["championId"]]["id"]
                    ),
                    level=m["championLevel"],
                    points=m["championPoints"],
                )
                for m in top_masteries
                if m["championId"] in champions_by_id
            ],
        )
