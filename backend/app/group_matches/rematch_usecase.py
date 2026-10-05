import datetime
import uuid

from app.group_matches.get_match_usecase import GetMatchUseCase
from app.group_matches.repository import GroupMatch, GroupMatchRepository
from app.group_matches.start_match_usecase import GroupMatchResponse
from app.infrastructure.exceptions import (
    ConflictError,
    ForbiddenError,
    ResourceNotFoundError,
    ValidationError,
)
from app.players.repository import Player, PlayerRepository


class RematchUseCase:
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
        if match.status != "FINISHED":
            raise ValidationError("match.notFinished")

        roster_ids = [uuid.UUID(p["id"]) for p in match.team_blue + match.team_red]
        locked_ids = await self._match_repository.find_players_in_progress(roster_ids)
        if locked_ids:
            locked_players = await self._player_repository.list_by_ids(locked_ids)
            names = ", ".join(p.display_name for p in locked_players)
            verb = "está" if len(locked_players) == 1 else "estão"
            raise ConflictError(f"{names} já {verb} em outra partida.")

        new_match = GroupMatch(
            id=uuid.uuid4(),
            group_id=match.group_id,
            team_blue=match.team_blue,
            team_red=match.team_red,
            leader_id=match.leader_id,
            status="IN_PROGRESS",
            winning_team=None,
            started_at=datetime.datetime.now(datetime.UTC),
            ended_at=None,
            duration_seconds=None,
        )
        await self._match_repository.save(new_match)

        return await GetMatchUseCase(self._match_repository, self._player_repository).execute(
            new_match.id
        )
