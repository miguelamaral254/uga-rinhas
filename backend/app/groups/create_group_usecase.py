import secrets
import uuid

from pydantic import BaseModel

from app.groups.repository import Group, GroupRepository
from app.players.repository import Player
from app.shared.usecase import UseCase


class CreateGroupRequest(BaseModel):
    name: str


class GroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    join_code: str


class CreateGroupUseCase(UseCase[CreateGroupRequest, GroupResponse]):
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, request: CreateGroupRequest) -> GroupResponse:
        group = Group(
            id=uuid.uuid4(),
            name=request.name,
            join_code=secrets.token_hex(3).upper(),
            created_by=self._current_player.id,
        )
        await self._group_repository.save(group)
        await self._group_repository.add_member(group.id, self._current_player.id)

        return GroupResponse(id=group.id, name=group.name, join_code=group.join_code)
