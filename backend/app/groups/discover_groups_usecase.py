import uuid

from pydantic import BaseModel, Field

from app.groups.get_group_members_usecase import GroupMemberResponse, to_member_response
from app.groups.repository import GroupRepository
from app.infrastructure import ddragon
from app.infrastructure.exceptions import ResourceNotFoundError
from app.players.repository import Player
from app.shared.usecase import NullaryUseCase


class DiscoverableGroupResponse(BaseModel):
    id: uuid.UUID
    name: str
    join_code: str
    member_count: int = Field(ge=0)
    owner: GroupMemberResponse


class ListDiscoverableGroupsUseCase(NullaryUseCase[list[DiscoverableGroupResponse]]):
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self) -> list[DiscoverableGroupResponse]:
        rows = await self._group_repository.list_discoverable(self._current_player.id)
        version = await ddragon.get_latest_version()
        return [_to_response(group, owner, member_count, version) for group, owner, member_count in rows]


class LookupGroupByCodeUseCase:
    def __init__(self, group_repository: GroupRepository):
        self._group_repository = group_repository

    async def execute(self, join_code: str) -> DiscoverableGroupResponse:
        row = await self._group_repository.find_discoverable_by_join_code(join_code.upper())
        if row is None:
            raise ResourceNotFoundError("group.notFound")

        group, owner, member_count = row
        version = await ddragon.get_latest_version()
        return _to_response(group, owner, member_count, version)


def _to_response(group, owner, member_count: int, version: str) -> DiscoverableGroupResponse:
    return DiscoverableGroupResponse(
        id=group.id,
        name=group.name,
        join_code=group.join_code,
        member_count=member_count,
        owner=to_member_response(owner, version),
    )
