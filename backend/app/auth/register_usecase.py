import uuid

from pydantic import BaseModel

from app.auth.repository import SessionRepository
from app.auth.security import generate_session_token, hash_password, validate_password_strength
from app.infrastructure.config import get_settings
from app.infrastructure.exceptions import ConflictError, ValidationError
from app.infrastructure.riot_client import RiotClient
from app.players.repository import Player, PlayerRepository
from app.shared.usecase import UseCase


class RegisterAccountRequest(BaseModel):
    username: str
    password: str
    password_confirmation: str
    display_name: str
    riot_game_name: str
    riot_tag_line: str


class AccountResponse(BaseModel):
    id: uuid.UUID
    username: str
    display_name: str
    riot_game_name: str
    riot_tag_line: str


class AuthResponse(BaseModel):
    token: str
    account: AccountResponse


class RegisterAccountUseCase(UseCase[RegisterAccountRequest, AuthResponse]):
    def __init__(
        self,
        player_repository: PlayerRepository,
        session_repository: SessionRepository,
        riot_client: RiotClient,
    ):
        self._player_repository = player_repository
        self._session_repository = session_repository
        self._riot_client = riot_client

    async def execute(self, request: RegisterAccountRequest) -> AuthResponse:
        if request.password != request.password_confirmation:
            raise ValidationError("auth.passwordMismatch")
        validate_password_strength(request.password)

        if await self._player_repository.find_by_username(request.username):
            raise ConflictError("account.usernameTaken")
        if await self._player_repository.find_by_riot_id(
            request.riot_game_name, request.riot_tag_line
        ):
            raise ConflictError("player.alreadyRegistered")

        account = await self._riot_client.get_account_by_riot_id(
            request.riot_game_name, request.riot_tag_line
        )
        if account is None:
            raise ValidationError("player.riotIdNotFound")

        # Riot IDs (gameName#tagLine) can be renamed/recycled - the puuid is the real
        # stable identity, so this is the check that actually prevents the same Riot
        # account being linked to two different accounts on our site.
        if await self._player_repository.find_by_puuid(account["puuid"]):
            raise ConflictError("player.alreadyRegistered")

        summoner = await self._riot_client.get_summoner_by_puuid(account["puuid"])

        player = Player(
            id=uuid.uuid4(),
            display_name=request.display_name,
            riot_game_name=account["gameName"],
            riot_tag_line=account["tagLine"],
            puuid=account["puuid"],
            region=get_settings().riot_platform,
            username=request.username,
            password_hash=hash_password(request.password),
            profile_icon_id=summoner["profileIconId"] if summoner else None,
            summoner_level=summoner["summonerLevel"] if summoner else None,
        )
        await self._player_repository.save(player)

        token = generate_session_token()
        await self._session_repository.save(token, player.id)

        return AuthResponse(token=token, account=to_account_response(player))


def to_account_response(player: Player) -> AccountResponse:
    return AccountResponse(
        id=player.id,
        username=player.username,
        display_name=player.display_name,
        riot_game_name=player.riot_game_name,
        riot_tag_line=player.riot_tag_line,
    )
