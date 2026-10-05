import datetime
import uuid

from pydantic import BaseModel

from app.infrastructure import ddragon
from app.matches.repository import MatchRepository, PlayerMatchSummary
from app.shared.usecase import UseCase

_QUEUE_LABELS_BY_ID = {
    400: "Normal (Blind)",
    420: "Ranqueada Solo/Duo",
    430: "Normal (Draft)",
    440: "Ranqueada Flex",
    450: "ARAM",
    490: "Normal (Rápida)",
    700: "Clash",
    900: "URF",
    1700: "Arena",
    1900: "URF (Pick em)",
}


class MatchPlayerRef(BaseModel):
    player_id: uuid.UUID | None
    display_name: str
    champion_icon_url: str


class PlayerMatchSummaryResponse(BaseModel):
    match_id: str
    queue_label: str
    game_creation: datetime.datetime
    game_duration_seconds: int
    champion_name: str
    champion_icon_url: str
    champion_level: int
    summoner_spell_icon_urls: list[str]
    win: bool
    kills: int
    deaths: int
    assists: int
    kda_ratio: float
    kill_participation: int
    cs: int
    item_icon_urls: list[str]
    teammates: list[MatchPlayerRef]
    opponents: list[MatchPlayerRef]


class ListPlayerMatchesUseCase(UseCase[uuid.UUID, list[PlayerMatchSummaryResponse]]):
    def __init__(self, match_repository: MatchRepository):
        self._match_repository = match_repository

    async def execute(self, player_id: uuid.UUID) -> list[PlayerMatchSummaryResponse]:
        matches = await self._match_repository.list_recent_for_player(player_id)
        version = await ddragon.get_latest_version()
        spells_by_key = await ddragon.get_summoner_spells_by_key()
        return [self._to_response(m, player_id, version, spells_by_key) for m in matches]

    def _to_response(
        self,
        m: PlayerMatchSummary,
        player_id: uuid.UUID,
        version: str,
        spells_by_key: dict[int, str],
    ) -> PlayerMatchSummaryResponse:
        self_id = str(player_id)
        self_entry = next(
            (p for p in m.participants_raw if p.get("player_id") == self_id), None
        )
        self_team_id = self_entry["team_id"] if self_entry else None

        teammates = [
            self._to_player_ref(p, version)
            for p in m.participants_raw
            if p.get("player_id") != self_id and p["team_id"] == self_team_id
        ]
        opponents = [
            self._to_player_ref(p, version)
            for p in m.participants_raw
            if p["team_id"] != self_team_id
        ]

        return PlayerMatchSummaryResponse(
            match_id=m.match_id,
            queue_label=_QUEUE_LABELS_BY_ID.get(m.queue_id, "Partida"),
            game_creation=m.game_creation,
            game_duration_seconds=m.game_duration_seconds,
            champion_name=m.champion_name,
            champion_icon_url=ddragon.champion_icon_url(version, m.champion_name),
            champion_level=m.champion_level,
            summoner_spell_icon_urls=[
                ddragon.summoner_spell_icon_url(version, spells_by_key[spell_id])
                for spell_id in (m.summoner1_id, m.summoner2_id)
                if spell_id in spells_by_key
            ],
            win=m.win,
            kills=m.kills,
            deaths=m.deaths,
            assists=m.assists,
            kda_ratio=round((m.kills + m.assists) / max(m.deaths, 1), 2),
            kill_participation=m.kill_participation,
            cs=m.cs,
            item_icon_urls=[
                ddragon.item_icon_url(version, item_id) for item_id in m.items if item_id
            ],
            teammates=teammates,
            opponents=opponents,
        )

    def _to_player_ref(self, p: dict, version: str) -> MatchPlayerRef:
        return MatchPlayerRef(
            player_id=uuid.UUID(p["player_id"]) if p.get("player_id") else None,
            display_name=p["display_name"],
            champion_icon_url=ddragon.champion_icon_url(version, p["champion_name"]),
        )
