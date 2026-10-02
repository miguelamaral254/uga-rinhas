from pydantic import BaseModel

from app.auth.register_usecase import AuthResponse, to_account_response
from app.auth.repository import SessionRepository
from app.auth.security import generate_session_token, verify_password
from app.infrastructure.exceptions import UnauthorizedError
from app.players.repository import PlayerRepository
from app.shared.usecase import UseCase


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginUseCase(UseCase[LoginRequest, AuthResponse]):
    def __init__(self, player_repository: PlayerRepository, session_repository: SessionRepository):
        self._player_repository = player_repository
        self._session_repository = session_repository

    async def execute(self, request: LoginRequest) -> AuthResponse:
        player = await self._player_repository.find_by_username(request.username)
        if player is None or not player.password_hash:
            raise UnauthorizedError("auth.invalidCredentials")
        if not verify_password(request.password, player.password_hash):
            raise UnauthorizedError("auth.invalidCredentials")

        token = generate_session_token()
        await self._session_repository.save(token, player.id)

        return AuthResponse(token=token, account=to_account_response(player))
