import uuid

from app.groups.get_group_members_usecase import GroupMemberResponse, to_member_response
from app.groups.repository import GroupRepository
from app.infrastructure import ddragon
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError
from app.players.repository import Player


class ListJoinRequestsUseCase:
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID) -> list[GroupMemberResponse]:
        group = await self._require_owner(group_id)
        pending = await self._group_repository.list_pending_members(group.id)
        version = await ddragon.get_latest_version()
        return [to_member_response(m, version) for m in pending]

    async def _require_owner(self, group_id: uuid.UUID):
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if group.created_by != self._current_player.id:
            raise ForbiddenError("group.notTheOwner")
        return group


class RespondToJoinRequestUseCase:
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID, requester_id: uuid.UUID, approve: bool) -> None:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if group.created_by != self._current_player.id:
            raise ForbiddenError("group.notTheOwner")

        if approve:
            await self._group_repository.approve_member(group_id, requester_id)
        else:
            await self._group_repository.remove_member(group_id, requester_id)
