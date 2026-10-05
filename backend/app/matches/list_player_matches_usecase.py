import datetime
import uuid

from pydantic import BaseModel

from app.infrastructure import ddragon
from app.matches.repository import MatchRepository
from app.shared.usecase import UseCase


class PlayerMatchSummaryResponse(BaseModel):
    match_id: str
    game_creation: datetime.datetime
    champion_name: str
    champion_icon_url: str
    win: bool
    kills: int
    deaths: int
    assists: int
    item_icon_urls: list[str]


class ListPlayerMatchesUseCase(UseCase[uuid.UUID, list[PlayerMatchSummaryResponse]]):
    def __init__(self, match_repository: MatchRepository):
        self._match_repository = match_repository

    async def execute(self, player_id: uuid.UUID) -> list[PlayerMatchSummaryResponse]:
        matches = await self._match_repository.list_recent_for_player(player_id)
        version = await ddragon.get_latest_version()
        return [
            PlayerMatchSummaryResponse(
                match_id=m.match_id,
                game_creation=m.game_creation,
                champion_name=m.champion_name,
                champion_icon_url=ddragon.champion_icon_url(version, m.champion_name),
                win=m.win,
                kills=m.kills,
                deaths=m.deaths,
                assists=m.assists,
                item_icon_urls=[
                    ddragon.item_icon_url(version, item_id) for item_id in m.items if item_id
                ],
            )
            for m in matches
        ]
