from pydantic import BaseModel

from app.groups.repository import GroupRepository
from app.infrastructure.exceptions import ConflictError, ResourceNotFoundError
from app.players.repository import Player
from app.shared.usecase import UseCase


class JoinGroupRequest(BaseModel):
    join_code: str


class JoinGroupResponse(BaseModel):
    group_name: str
    status: str


class JoinGroupUseCase(UseCase[JoinGroupRequest, JoinGroupResponse]):
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, request: JoinGroupRequest) -> JoinGroupResponse:
        group = await self._group_repository.find_by_join_code(request.join_code.upper())
        if group is None:
            raise ResourceNotFoundError("group.notFound")

        existing_status = await self._group_repository.find_membership_status(
            group.id, self._current_player.id
        )
        if existing_status == "APPROVED":
            raise ConflictError("group.alreadyMember")
        if existing_status == "PENDING":
            raise ConflictError("group.requestAlreadyPending")

        await self._group_repository.add_member(group.id, self._current_player.id, status="PENDING")

        return JoinGroupResponse(group_name=group.name, status="PENDING")
