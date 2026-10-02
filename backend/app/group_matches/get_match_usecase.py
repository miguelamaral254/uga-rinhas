import uuid

from app.group_matches.repository import GroupMatchRepository
from app.group_matches.start_match_usecase import GroupMatchResponse, resolve_live_match_players
from app.infrastructure import ddragon
from app.infrastructure.exceptions import ResourceNotFoundError
from app.players.repository import PlayerRepository
from app.shared.usecase import UseCase


class GetMatchUseCase(UseCase[uuid.UUID, GroupMatchResponse]):
    def __init__(self, match_repository: GroupMatchRepository, player_repository: PlayerRepository):
        self._match_repository = match_repository
        self._player_repository = player_repository

    async def execute(self, match_id: uuid.UUID) -> GroupMatchResponse:
        match = await self._match_repository.find_by_id(match_id)
        if match is None:
            raise ResourceNotFoundError("match.notFound")

        version = await ddragon.get_latest_version()
        return GroupMatchResponse(
            id=match.id,
            group_id=match.group_id,
            team_blue=await resolve_live_match_players(match.team_blue, self._player_repository, version),
            team_red=await resolve_live_match_players(match.team_red, self._player_repository, version),
            captain_blue_id=match.captain_blue_id,
            captain_red_id=match.captain_red_id,
            status=match.status,
            winning_team=match.winning_team,
            started_at=match.started_at,
            ended_at=match.ended_at,
            duration_seconds=match.duration_seconds,
        )
