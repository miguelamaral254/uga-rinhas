from pydantic import BaseModel

from app.auth.security import hash_password, validate_password_strength, verify_password
from app.infrastructure.exceptions import UnauthorizedError, ValidationError
from app.players.repository import Player, PlayerRepository


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    new_password_confirmation: str


class ChangePasswordUseCase:
    def __init__(self, player_repository: PlayerRepository, current_player: Player):
        self._player_repository = player_repository
        self._current_player = current_player

    async def execute(self, request: ChangePasswordRequest) -> None:
        if not verify_password(request.current_password, self._current_player.password_hash):
            raise UnauthorizedError("auth.invalidCurrentPassword")
        if request.new_password != request.new_password_confirmation:
            raise ValidationError("auth.passwordMismatch")
        validate_password_strength(request.new_password)

        await self._player_repository.update_password_hash(
            self._current_player.id, hash_password(request.new_password)
        )
