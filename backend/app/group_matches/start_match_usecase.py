import datetime
import uuid

from pydantic import BaseModel

from app.group_matches.repository import GroupMatch, GroupMatchRepository
from app.groups.repository import GroupRepository
from app.infrastructure import ddragon
from app.infrastructure.exceptions import (
    ConflictError,
    ForbiddenError,
    ResourceNotFoundError,
    ValidationError,
)
from app.players.repository import Player, PlayerRepository
from app.shared.usecase import UseCase

TEAM_SIZE = 5


class StartMatchRequest(BaseModel):
    group_id: uuid.UUID
    team_blue_ids: list[uuid.UUID]
    team_red_ids: list[uuid.UUID]


class MatchPlayer(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    profile_icon_url: str | None = None
    summoner_level: int | None = None


class GroupMatchResponse(BaseModel):
    id: uuid.UUID
    group_id: uuid.UUID
    team_blue: list[MatchPlayer]
    team_red: list[MatchPlayer]
    leader_id: uuid.UUID
    status: str
    winning_team: str | None
    started_at: datetime.datetime | None
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

        if len(request.team_blue_ids) != TEAM_SIZE or len(request.team_red_ids) != TEAM_SIZE:
            raise ValidationError("match.teamSizeInvalid")
        if set(request.team_blue_ids) & set(request.team_red_ids):
            raise ValidationError("match.playerOnBothTeams")

        selected_ids = set(request.team_blue_ids) | set(request.team_red_ids)
        if self._current_player.id not in selected_ids:
            raise ValidationError("match.leaderMustPlay")

        members = await self._group_repository.list_members(request.group_id)
        member_ids = {m.id for m in members}
        if not selected_ids.issubset(member_ids):
            raise ValidationError("match.playerNotInGroup")

        locked_ids = await self._match_repository.find_players_in_progress(list(selected_ids))
        if locked_ids:
            locked_players = await self._player_repository.list_by_ids(locked_ids)
            names = ", ".join(p.display_name for p in locked_players)
            verb = "está" if len(locked_players) == 1 else "estão"
            raise ConflictError(f"{names} já {verb} em outra partida.")

        players_by_id = {
            p.id: p for p in await self._player_repository.list_by_ids(list(selected_ids))
        }
        version = await ddragon.get_latest_version()
        team_blue = [_to_match_player(players_by_id[pid], version) for pid in request.team_blue_ids]
        team_red = [_to_match_player(players_by_id[pid], version) for pid in request.team_red_ids]

        match_id = uuid.uuid4()
        match = GroupMatch(
            id=match_id,
            group_id=request.group_id,
            team_blue=[p.model_dump(mode="json") for p in team_blue],
            team_red=[p.model_dump(mode="json") for p in team_red],
            leader_id=self._current_player.id,
            status="DRAFT",
            winning_team=None,
            started_at=None,
            ended_at=None,
            duration_seconds=None,
        )
        await self._match_repository.save(match)

        return GroupMatchResponse(
            id=match.id,
            group_id=match.group_id,
            team_blue=team_blue,
            team_red=team_red,
            leader_id=match.leader_id,
            status=match.status,
            winning_team=None,
            started_at=None,
            ended_at=None,
            duration_seconds=None,
        )


def _to_match_player(player: Player, version: str) -> MatchPlayer:
    return MatchPlayer(
        id=player.id,
        display_name=player.display_name,
        riot_game_name=player.riot_game_name,
        riot_tag_line=player.riot_tag_line,
        profile_icon_url=(
            ddragon.profile_icon_url(version, player.profile_icon_id)
            if player.profile_icon_id
            else None
        ),
        summoner_level=player.summoner_level,
    )


async def resolve_live_match_players(
    stored_players: list[dict], player_repository: PlayerRepository, version: str
) -> list[MatchPlayer]:
    """Team rosters are stored as a JSONB snapshot (id + name + icon at match time),
    but a player's display name can change afterwards - always resolve the current
    name/icon by id instead of trusting the frozen snapshot, so renaming a player
    doesn't leave their past matches showing a stale name forever."""
    ids = [uuid.UUID(p["id"]) for p in stored_players]
    live_by_id = {p.id: p for p in await player_repository.list_by_ids(ids)}

    result = []
    for stored in stored_players:
        live = live_by_id.get(uuid.UUID(stored["id"]))
        result.append(_to_match_player(live, version) if live else MatchPlayer(**stored))
    return result
