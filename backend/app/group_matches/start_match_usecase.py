import datetime
import random
import uuid

from pydantic import BaseModel

from app.group_matches.repository import GroupMatch, GroupMatchRepository
from app.groups.repository import GroupRepository
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.players.repository import Player, PlayerRepository
from app.shared.usecase import UseCase


class StartMatchRequest(BaseModel):
    group_id: uuid.UUID
    player_ids: list[uuid.UUID]


class MatchPlayer(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str


class GroupMatchResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    team_blue: list[MatchPlayer]
    team_red: list[MatchPlayer]
    captain_blue_id: uuid.UUID
    captain_red_id: uuid.UUID
    status: str
    winning_team: str | None
    started_at: datetime.datetime
    ended_at: datetime.datetime | None
    duration_seconds: int | None


class StartMatchUseCase(UseCase[StartMatchRequest, GroupMatchResponse]):
    def __init__(
        self,
        group_repository: GroupRepository,
        player_repository: PlayerRepository,
        match_repository: GroupMatchRepository,
        current_player: Player,
    ):
        self._group_repository = group_repository
        self._player_repository = player_repository
        self._match_repository = match_repository
        self._current_player = current_player

    async def execute(self, request: StartMatchRequest) -> GroupMatchResponse:
        group = await self._group_repository.find_by_id(request.group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if not await self._group_repository.is_member(request.group_id, self._current_player.id):
            raise ForbiddenError("group.notAMember")

        members = await self._group_repository.list_members(request.group_id)
        member_ids = {m.id for m in members}
        selected_ids = set(request.player_ids)
        if not selected_ids.issubset(member_ids):
            raise ValidationError("match.playerNotInGroup")
        if len(selected_ids) < 2:
            raise ValidationError("match.notEnoughPlayers")

        players = await self._player_repository.list_by_ids(list(selected_ids))
        shuffled = players.copy()
        random.shuffle(shuffled)
        midpoint = len(shuffled) // 2 + len(shuffled) % 2

        team_blue = [_to_match_player(p) for p in shuffled[:midpoint]]
        team_red = [_to_match_player(p) for p in shuffled[midpoint:]]

        match_id = uuid.uuid4()
        match = GroupMatch(
            id=match_id,
            group_id=request.group_id,
            team_blue=[p.model_dump(mode="json") for p in team_blue],
            team_red=[p.model_dump(mode="json") for p in team_red],
            captain_blue_id=team_blue[0].id,
            captain_red_id=team_red[0].id,
            status="IN_PROGRESS",
            winning_team=None,
            started_at=datetime.datetime.now(datetime.UTC),
            ended_at=None,
            duration_seconds=None,
        )
        await self._match_repository.save(match)

        return GroupMatchResponse(
            id=match.id,
            group_id=match.group_id,
            team_blue=team_blue,
            team_red=team_red,
            captain_blue_id=match.captain_blue_id,
            captain_red_id=match.captain_red_id,
            status=match.status,
            winning_team=None,
            started_at=match.started_at,
            ended_at=None,
            duration_seconds=None,
        )


def _to_match_player(player: Player) -> MatchPlayer:
    return MatchPlayer(
        id=player.id,
        display_name=player.display_name,
        riot_game_name=player.riot_game_name,
        riot_tag_line=player.riot_tag_line,
    )
