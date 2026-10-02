import uuid

from pydantic import BaseModel

from app.groups.repository import GroupRepository
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError
from app.players.repository import Player
from app.shared.usecase import UseCase


class GroupMemberResponse(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str


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
        return [
            GroupMemberResponse(
                id=m.id,
                display_name=m.display_name,
                riot_game_name=m.riot_game_name,
                riot_tag_line=m.riot_tag_line,
            )
            for m in members
        ]
