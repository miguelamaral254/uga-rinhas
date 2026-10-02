import uuid

from pydantic import BaseModel, Field

from app.group_matches.repository import GroupMatchRepository
from app.groups.repository import GroupMember, GroupRepository
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError
from app.players.repository import Player
from app.shared.usecase import UseCase


class GroupLeaderboardEntry(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    wins: int = Field(ge=0)
    losses: int = Field(ge=0)
    played: int = Field(ge=0)
    win_rate: float = Field(ge=0, le=100)


class GetGroupLeaderboardUseCase(UseCase[uuid.UUID, list[GroupLeaderboardEntry]]):
    def __init__(
        self,
        group_repository: GroupRepository,
        match_repository: GroupMatchRepository,
        current_player: Player,
    ):
        self._group_repository = group_repository
        self._match_repository = match_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID) -> list[GroupLeaderboardEntry]:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if not await self._group_repository.is_member(group_id, self._current_player.id):
            raise ForbiddenError("group.notAMember")

        members = await self._group_repository.list_members(group_id)
        matches = await self._match_repository.list_finished_by_group(group_id)

        wins: dict[uuid.UUID, int] = {}
        losses: dict[uuid.UUID, int] = {}
        for match in matches:
            winners, losers = (
                (match.team_blue, match.team_red)
                if match.winning_team == "BLUE"
                else (match.team_red, match.team_blue)
            )
            for p in winners:
                wins[uuid.UUID(p["id"])] = wins.get(uuid.UUID(p["id"]), 0) + 1
            for p in losers:
                losses[uuid.UUID(p["id"])] = losses.get(uuid.UUID(p["id"]), 0) + 1

        entries = [_to_entry(m, wins.get(m.id, 0), losses.get(m.id, 0)) for m in members]
        entries.sort(key=lambda e: (-e.wins, e.display_name))
        return entries


def _to_entry(member: GroupMember, wins: int, losses: int) -> GroupLeaderboardEntry:
    played = wins + losses
    return GroupLeaderboardEntry(
        id=member.id,
        display_name=member.display_name,
        riot_game_name=member.riot_game_name,
        riot_tag_line=member.riot_tag_line,
        wins=wins,
        losses=losses,
        played=played,
        win_rate=round(wins * 100 / played, 2) if played else 0,
    )
