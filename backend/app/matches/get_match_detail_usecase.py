import datetime
import uuid

from pydantic import BaseModel

from app.infrastructure import ddragon
from app.infrastructure.exceptions import ResourceNotFoundError
from app.matches.repository import MatchRepository
from app.shared.usecase import UseCase


class MatchParticipantDetail(BaseModel):
    player_id: uuid.UUID | None
    display_name: str
    champion_name: str
    champion_icon_url: str
    champion_level: int
    summoner_spell_icon_urls: list[str]
    win: bool
    kills: int
    deaths: int
    assists: int
    team_position: str
    item_icon_urls: list[str]


class MatchDetail(BaseModel):
    match_id: str
    game_mode: str
    game_creation: datetime.datetime
    game_duration_seconds: int
    winning_team_id: int
    team_blue: list[MatchParticipantDetail]
    team_red: list[MatchParticipantDetail]


class GetMatchDetailUseCase(UseCase[str, MatchDetail]):
    def __init__(self, match_repository: MatchRepository):
        self._match_repository = match_repository

    async def execute(self, match_id: str) -> MatchDetail:
        match = await self._match_repository.get_by_id(match_id)
        if match is None:
            raise ResourceNotFoundError("match.notFound")

        version = await ddragon.get_latest_version()
        spells_by_key = await ddragon.get_summoner_spells_by_key()
        participants = [
            MatchParticipantDetail(
                player_id=uuid.UUID(p["player_id"]) if p["player_id"] else None,
                display_name=p["display_name"],
                champion_name=p["champion_name"],
                champion_icon_url=ddragon.champion_icon_url(version, p["champion_name"]),
                champion_level=p.get("champion_level", 0),
                summoner_spell_icon_urls=[
                    ddragon.summoner_spell_icon_url(version, spells_by_key[spell_id])
                    for spell_id in (p.get("summoner1_id", 0), p.get("summoner2_id", 0))
                    if spell_id in spells_by_key
                ],
                win=p["win"],
                kills=p["kills"],
                deaths=p["deaths"],
                assists=p["assists"],
                team_position=p["team_position"],
                item_icon_urls=[
                    ddragon.item_icon_url(version, item_id)
                    for item_id in p["items"]
                    if item_id
                ],
            )
            for p in match.participants_raw
        ]
        winning_team_id = next((p["team_id"] for p in match.participants_raw if p["win"]), 100)

        return MatchDetail(
            match_id=match.match_id,
            game_mode=match.game_mode,
            game_creation=match.game_creation,
            game_duration_seconds=match.game_duration_seconds,
            winning_team_id=winning_team_id,
            team_blue=[
                p for p, raw in zip(participants, match.participants_raw) if raw["team_id"] == 100
            ],
            team_red=[
                p for p, raw in zip(participants, match.participants_raw) if raw["team_id"] == 200
            ],
        )
