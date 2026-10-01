import uuid

from pydantic import BaseModel

from app.infrastructure.config import get_settings
from app.infrastructure.exceptions import ConflictError, ValidationError
from app.infrastructure.riot_client import RiotClient
from app.players.repository import Player, PlayerRepository
from app.shared.usecase import UseCase


class RegisterPlayerRequest(BaseModel):
    display_name: str
    riot_game_name: str
    riot_tag_line: str


class PlayerResponse(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    region: str


class RegisterPlayerUseCase(UseCase[RegisterPlayerRequest, PlayerResponse]):
    def __init__(self, repository: PlayerRepository, riot_client: RiotClient):
        self._repository = repository
        self._riot_client = riot_client

    async def execute(self, request: RegisterPlayerRequest) -> PlayerResponse:
        if await self._repository.find_by_riot_id(request.riot_game_name, request.riot_tag_line):
            raise ConflictError("player.alreadyRegistered")

        account = await self._riot_client.get_account_by_riot_id(
            request.riot_game_name, request.riot_tag_line
        )
        if account is None:
            raise ValidationError("player.riotIdNotFound")

        summoner = await self._riot_client.get_summoner_by_puuid(account["puuid"])

        player = Player(
            id=uuid.uuid4(),
            display_name=request.display_name,
            riot_game_name=account["gameName"],
            riot_tag_line=account["tagLine"],
            puuid=account["puuid"],
            region=get_settings().riot_platform,
            profile_icon_id=summoner["profileIconId"] if summoner else None,
            summoner_level=summoner["summonerLevel"] if summoner else None,
        )
        await self._repository.save(player)

        return PlayerResponse(
            id=player.id,
            display_name=player.display_name,
            riot_game_name=player.riot_game_name,
            riot_tag_line=player.riot_tag_line,
            region=player.region,
        )
