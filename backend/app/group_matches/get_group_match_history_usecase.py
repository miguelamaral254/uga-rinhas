import datetime
import uuid
from typing import Literal

from pydantic import BaseModel

from app.group_matches.repository import GroupMatchRepository
from app.group_matches.start_match_usecase import MatchPlayer, resolve_live_match_players
from app.groups.repository import GroupRepository
from app.infrastructure import ddragon
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError
from app.players.repository import Player, PlayerRepository


class GroupMatchSummaryResponse(BaseModel):
    match_id: uuid.UUID
    ended_at: datetime.datetime
    duration_seconds: int
    winning_team: Literal["BLUE", "RED"]
    team_blue: list[MatchPlayer]
    team_red: list[MatchPlayer]


class GetGroupMatchHistoryUseCase:
    def __init__(
        self,
        group_repository: GroupRepository,
        match_repository: GroupMatchRepository,
        player_repository: PlayerRepository,
        current_player: Player,
    ):
        self._group_repository = group_repository
        self._match_repository = match_repository
        self._player_repository = player_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID, limit: int = 10) -> list[GroupMatchSummaryResponse]:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if not await self._group_repository.is_member(group_id, self._current_player.id):
            raise ForbiddenError("group.notAMember")

        matches = await self._match_repository.list_recent_finished_by_group(group_id, limit)
        version = await ddragon.get_latest_version()
        return [
            GroupMatchSummaryResponse(
                match_id=m.id,
                ended_at=m.ended_at,
                duration_seconds=m.duration_seconds or 0,
                winning_team=m.winning_team,
                team_blue=await resolve_live_match_players(m.team_blue, self._player_repository, version),
                team_red=await resolve_live_match_players(m.team_red, self._player_repository, version),
            )
            for m in matches
        ]
