import datetime
import uuid

from app.group_matches.get_match_usecase import GetMatchUseCase
from app.group_matches.repository import GroupMatchRepository
from app.group_matches.start_match_usecase import GroupMatchResponse
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.players.repository import Player, PlayerRepository


class BeginMatchUseCase:
    """Starts the clock on a drafted match. Drawing teams (StartMatchUseCase) only
    creates the DRAFT - the timer and IN_PROGRESS status begin here instead, once
    the match's leader confirms both sides are actually ready to play."""

    def __init__(
        self,
        match_repository: GroupMatchRepository,
        player_repository: PlayerRepository,
        current_player: Player,
    ):
        self._match_repository = match_repository
        self._player_repository = player_repository
        self._current_player = current_player

    async def execute(self, match_id: uuid.UUID) -> GroupMatchResponse:
        match = await self._match_repository.find_by_id(match_id)
        if match is None:
            raise ResourceNotFoundError("match.notFound")
        if self._current_player.id != match.leader_id:
            raise ForbiddenError("match.notTheLeader")
        if match.status != "DRAFT":
            raise ValidationError("match.alreadyStarted")

        await self._match_repository.begin(match_id, datetime.datetime.now(datetime.UTC))
        return await GetMatchUseCase(self._match_repository, self._player_repository).execute(match_id)
