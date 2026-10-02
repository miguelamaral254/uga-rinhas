import uuid

from pydantic import BaseModel

from app.groups.create_group_usecase import GroupResponse, to_group_response
from app.groups.repository import Group, GroupRepository
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError
from app.players.repository import Player


class UpdateGroupRequest(BaseModel):
    name: str


class UpdateGroupUseCase:
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID, request: UpdateGroupRequest) -> GroupResponse:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if group.created_by != self._current_player.id:
            raise ForbiddenError("group.notTheOwner")

        await self._group_repository.update_name(group_id, request.name)
        return to_group_response(Group(**{**vars(group), "name": request.name}))
