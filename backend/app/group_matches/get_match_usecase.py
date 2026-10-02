import uuid

from app.group_matches.repository import GroupMatchRepository
from app.group_matches.start_match_usecase import GroupMatchResponse, MatchPlayer
from app.infrastructure.exceptions import ResourceNotFoundError
from app.shared.usecase import UseCase


class GetMatchUseCase(UseCase[uuid.UUID, GroupMatchResponse]):
    def __init__(self, match_repository: GroupMatchRepository):
        self._match_repository = match_repository

    async def execute(self, match_id: uuid.UUID) -> GroupMatchResponse:
        match = await self._match_repository.find_by_id(match_id)
        if match is None:
            raise ResourceNotFoundError("match.notFound")

        return GroupMatchResponse(
            id=match.id,
            group_id=match.group_id,
            team_blue=[MatchPlayer(**p) for p in match.team_blue],
            team_red=[MatchPlayer(**p) for p in match.team_red],
            captain_blue_id=match.captain_blue_id,
            captain_red_id=match.captain_red_id,
            status=match.status,
            winning_team=match.winning_team,
            started_at=match.started_at,
            ended_at=match.ended_at,
            duration_seconds=match.duration_seconds,
        )
