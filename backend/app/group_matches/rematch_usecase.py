import datetime
import uuid

from app.group_matches.get_match_usecase import GetMatchUseCase
from app.group_matches.repository import GroupMatch, GroupMatchRepository
from app.group_matches.start_match_usecase import GroupMatchResponse
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.players.repository import Player


class RematchUseCase:
    def __init__(self, match_repository: GroupMatchRepository, current_player: Player):
        self._match_repository = match_repository
        self._current_player = current_player

    async def execute(self, match_id: uuid.UUID) -> GroupMatchResponse:
        match = await self._match_repository.find_by_id(match_id)
        if match is None:
            raise ResourceNotFoundError("match.notFound")

        if self._current_player.id not in (match.captain_blue_id, match.captain_red_id):
            raise ForbiddenError("match.notACaptain")
        if match.status != "FINISHED":
            raise ValidationError("match.notFinished")

        new_match = GroupMatch(
            id=uuid.uuid4(),
            group_id=match.group_id,
            team_blue=match.team_blue,
            team_red=match.team_red,
            captain_blue_id=match.captain_blue_id,
            captain_red_id=match.captain_red_id,
            status="IN_PROGRESS",
            winning_team=None,
            started_at=datetime.datetime.now(datetime.UTC),
            ended_at=None,
            duration_seconds=None,
        )
        await self._match_repository.save(new_match)

        return await GetMatchUseCase(self._match_repository).execute(new_match.id)
