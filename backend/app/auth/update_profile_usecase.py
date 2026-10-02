from pydantic import BaseModel

from app.auth.register_usecase import AccountResponse, to_account_response
from app.players.repository import Player, PlayerRepository
from app.shared.usecase import UseCase


class UpdateProfileRequest(BaseModel):
    display_name: str


class UpdateProfileUseCase(UseCase[UpdateProfileRequest, AccountResponse]):
    def __init__(self, player_repository: PlayerRepository, current_player: Player):
        self._player_repository = player_repository
        self._current_player = current_player

    async def execute(self, request: UpdateProfileRequest) -> AccountResponse:
        await self._player_repository.update_display_name(
            self._current_player.id, request.display_name
        )
        updated = Player(
            **{**vars(self._current_player), "display_name": request.display_name}
        )
        return to_account_response(updated)
