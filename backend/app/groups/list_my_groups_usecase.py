from app.groups.create_group_usecase import GroupResponse, to_group_response
from app.groups.repository import GroupRepository
from app.players.repository import Player
from app.shared.usecase import NullaryUseCase


class ListMyGroupsUseCase(NullaryUseCase[list[GroupResponse]]):
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self) -> list[GroupResponse]:
        groups = await self._group_repository.list_for_player(self._current_player.id)
        return [to_group_response(g) for g in groups]
