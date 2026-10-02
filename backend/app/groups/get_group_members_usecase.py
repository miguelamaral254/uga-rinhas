import uuid

from pydantic import BaseModel

from app.groups.repository import GroupRepository
from app.infrastructure import ddragon
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError
from app.players.repository import Player
from app.shared.usecase import UseCase


class GroupMemberResponse(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    summoner_level: int | None
    profile_icon_url: str | None


class GetGroupMembersUseCase(UseCase[uuid.UUID, list[GroupMemberResponse]]):
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID) -> list[GroupMemberResponse]:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if not await self._group_repository.is_member(group_id, self._current_player.id):
            raise ForbiddenError("group.notAMember")

        members = await self._group_repository.list_members(group_id)
        version = await ddragon.get_latest_version()

        return [
            GroupMemberResponse(
                id=m.id,
                display_name=m.display_name,
                riot_game_name=m.riot_game_name,
                riot_tag_line=m.riot_tag_line,
                summoner_level=m.summoner_level,
                profile_icon_url=(
                    ddragon.profile_icon_url(version, m.profile_icon_id)
                    if m.profile_icon_id
                    else None
                ),
            )
            for m in members
        ]
