import secrets
import uuid

from pydantic import BaseModel

from app.groups.repository import Group, GroupRepository
from app.infrastructure.config import get_settings
from app.players.repository import Player
from app.shared.usecase import UseCase


class CreateGroupRequest(BaseModel):
    name: str


class GroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    join_code: str
    created_by: uuid.UUID
    owner_id: uuid.UUID
    image_url: str | None


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
            owner_id=self._current_player.id,
            image_path=None,
        )
        await self._group_repository.save(group)
        await self._group_repository.add_member(group.id, self._current_player.id, status="APPROVED")

        return to_group_response(group)


def to_group_response(group: Group) -> GroupResponse:
    return GroupResponse(
        id=group.id,
        name=group.name,
        join_code=group.join_code,
        created_by=group.created_by,
        owner_id=group.owner_id,
        image_url=(
            f"{get_settings().public_base_url}{group.image_path}" if group.image_path else None
        ),
    )
