from pydantic import BaseModel

from app.groups.create_group_usecase import GroupResponse
from app.groups.repository import GroupRepository
from app.infrastructure.exceptions import ResourceNotFoundError
from app.players.repository import Player
from app.shared.usecase import UseCase


class JoinGroupRequest(BaseModel):
    join_code: str


class JoinGroupUseCase(UseCase[JoinGroupRequest, GroupResponse]):
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, request: JoinGroupRequest) -> GroupResponse:
        group = await self._group_repository.find_by_join_code(request.join_code.upper())
        if group is None:
            raise ResourceNotFoundError("group.notFound")

        await self._group_repository.add_member(group.id, self._current_player.id)

        return GroupResponse(id=group.id, name=group.name, join_code=group.join_code)
