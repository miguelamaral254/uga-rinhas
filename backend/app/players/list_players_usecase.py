import uuid

from pydantic import BaseModel, Field

from app.players.repository import PlayerRepository
from app.shared.usecase import NullaryUseCase


class PlayerStats(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    wins: int = Field(ge=0)
    losses: int = Field(ge=0)
    played: int = Field(ge=0)
    win_rate: float = Field(ge=0, le=100)


class ListPlayersUseCase(NullaryUseCase[list[PlayerStats]]):
    def __init__(self, repository: PlayerRepository):
        self._repository = repository

    async def execute(self) -> list[PlayerStats]:
        players = await self._repository.list_with_stats()
        return [
            PlayerStats(
                id=p.id,
                display_name=p.display_name,
                riot_game_name=p.riot_game_name,
                riot_tag_line=p.riot_tag_line,
                wins=p.wins,
                losses=p.losses,
                played=p.played,
                win_rate=round(p.wins * 100 / p.played, 2) if p.played else 0,
            )
            for p in players
        ]
