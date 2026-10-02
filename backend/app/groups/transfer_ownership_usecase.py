import uuid

from pydantic import BaseModel

from app.groups.create_group_usecase import GroupResponse, to_group_response
from app.groups.repository import Group, GroupRepository
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.players.repository import Player


class TransferOwnershipRequest(BaseModel):
    new_owner_id: uuid.UUID


class TransferOwnershipUseCase:
    """Hands group leadership to another approved member. created_by never changes -
    it's just the historical record of who originally made the group - but owner_id
    is what every permission check (rename, approve/reject, remove) actually looks
    at, and it's the only way for the current owner to become free to leave."""

    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID, request: TransferOwnershipRequest) -> GroupResponse:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if group.owner_id != self._current_player.id:
            raise ForbiddenError("group.notTheOwner")
        if request.new_owner_id == group.owner_id:
            raise ValidationError("group.alreadyOwner")
        if not await self._group_repository.is_member(group_id, request.new_owner_id):
            raise ValidationError("group.newOwnerNotAMember")

        await self._group_repository.update_owner(group_id, request.new_owner_id)
        return to_group_response(Group(**{**vars(group), "owner_id": request.new_owner_id}))
