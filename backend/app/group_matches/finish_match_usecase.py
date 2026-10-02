import datetime
import uuid
from typing import Literal

from pydantic import BaseModel

from app.group_matches.get_match_usecase import GetMatchUseCase
from app.group_matches.repository import GroupMatchRepository
from app.group_matches.start_match_usecase import GroupMatchResponse
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.players.repository import Player


class FinishMatchRequest(BaseModel):
    winning_team: Literal["BLUE", "RED"]


class FinishMatchUseCase:
    def __init__(self, match_repository: GroupMatchRepository, current_player: Player):
        self._match_repository = match_repository
        self._current_player = current_player

    async def execute(
        self, match_id: uuid.UUID, finish_request: FinishMatchRequest
    ) -> GroupMatchResponse:
        match = await self._match_repository.find_by_id(match_id)
        if match is None:
            raise ResourceNotFoundError("match.notFound")

        if self._current_player.id not in (match.captain_blue_id, match.captain_red_id):
            raise ForbiddenError("match.notACaptain")
        if match.status != "IN_PROGRESS":
            raise ValidationError("match.alreadyFinished")

        ended_at = datetime.datetime.now(datetime.UTC)
        duration_seconds = int((ended_at - match.started_at).total_seconds())
        await self._match_repository.finish(
            match_id, finish_request.winning_team, ended_at, duration_seconds
        )

        return await GetMatchUseCase(self._match_repository).execute(match_id)
