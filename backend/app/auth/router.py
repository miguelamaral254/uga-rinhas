from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.change_password_usecase import ChangePasswordRequest, ChangePasswordUseCase
from app.auth.dependencies import CurrentPlayer
from app.auth.login_usecase import LoginRequest, LoginUseCase
from app.auth.register_usecase import (
    AccountResponse,
    AuthResponse,
    RegisterAccountRequest,
    RegisterAccountUseCase,
    to_account_response,
)
from app.auth.repository import SessionRepository
from app.auth.update_profile_usecase import UpdateProfileRequest, UpdateProfileUseCase
from app.infrastructure.database import get_session
from app.infrastructure.riot_client import RiotClient
from app.players.repository import PlayerRepository

router = APIRouter(prefix="/api/auth", tags=["auth"])

Session = Annotated[AsyncSession, Depends(get_session)]


@router.post("/register", response_model=AuthResponse, status_code=201)
async def register(request: RegisterAccountRequest, session: Session) -> AuthResponse:
    use_case = RegisterAccountUseCase(
        PlayerRepository(session), SessionRepository(session), RiotClient()
    )
    return await use_case.execute(request)


@router.post("/login", response_model=AuthResponse)
async def login(request: LoginRequest, session: Session) -> AuthResponse:
    use_case = LoginUseCase(PlayerRepository(session), SessionRepository(session))
    return await use_case.execute(request)


@router.get("/me", response_model=AccountResponse)
async def me(current_player: CurrentPlayer) -> AccountResponse:
    return await to_account_response(current_player)


@router.patch("/me", response_model=AccountResponse)
async def update_me(
    request: UpdateProfileRequest, session: Session, current_player: CurrentPlayer
) -> AccountResponse:
    use_case = UpdateProfileUseCase(PlayerRepository(session), current_player)
    return await use_case.execute(request)


@router.post("/change-password", status_code=204)
async def change_password(
    request: ChangePasswordRequest, session: Session, current_player: CurrentPlayer
) -> None:
    use_case = ChangePasswordUseCase(PlayerRepository(session), current_player)
    await use_case.execute(request)
