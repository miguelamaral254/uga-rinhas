import uuid

from app.groups.repository import GroupRepository
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.players.repository import Player


class RemoveMemberUseCase:
    """Removes a member from a group - either the member leaving on their own, or
    the group's owner removing someone else. The owner can't be removed this way
    and can't leave their own group - they have to transfer ownership first
    (see TransferOwnershipUseCase)."""

    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID, target_player_id: uuid.UUID) -> None:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")

        is_self = target_player_id == self._current_player.id
        is_owner = group.owner_id == self._current_player.id
        if not is_self and not is_owner:
            raise ForbiddenError("group.notAllowedToRemove")
        if target_player_id == group.owner_id:
            raise ValidationError("group.ownerCannotBeRemoved")

        await self._group_repository.remove_member(group_id, target_player_id)
