import datetime
import uuid
from typing import Literal

from pydantic import BaseModel, Field

from app.group_matches.repository import GroupMatchRepository
from app.group_matches.start_match_usecase import MatchPlayer


class PlayerMatchSummary(BaseModel):
    match_id: uuid.UUID
    group_id: uuid.UUID
    group_name: str
    result: Literal["WIN", "LOSS"]
    duration_seconds: int
    ended_at: datetime.datetime
    teammates: list[MatchPlayer]
    opponents: list[MatchPlayer]


class PlayerMatchHistoryResponse(BaseModel):
    wins: int = Field(ge=0)
    losses: int = Field(ge=0)
    played: int = Field(ge=0)
    win_rate: float = Field(ge=0, le=100)
    recent_matches: list[PlayerMatchSummary]


class GetPlayerMatchHistoryUseCase:
    def __init__(self, match_repository: GroupMatchRepository):
        self._match_repository = match_repository

    async def execute(self, player_id: uuid.UUID, limit: int = 10) -> PlayerMatchHistoryResponse:
        rows = await self._match_repository.list_finished_for_player(player_id)

        wins = 0
        losses = 0
        recent_matches: list[PlayerMatchSummary] = []
        player_id_str = str(player_id)

        for match, group_name in rows:
            on_blue = any(p["id"] == player_id_str for p in match.team_blue)
            own_team, other_team = (
                (match.team_blue, match.team_red) if on_blue else (match.team_red, match.team_blue)
            )
            won = (match.winning_team == "BLUE") == on_blue
            if won:
                wins += 1
            else:
                losses += 1

            if len(recent_matches) < limit:
                recent_matches.append(
                    PlayerMatchSummary(
                        match_id=match.id,
                        group_id=match.group_id,
                        group_name=group_name,
                        result="WIN" if won else "LOSS",
                        duration_seconds=match.duration_seconds or 0,
                        ended_at=match.ended_at,
                        teammates=[
                            MatchPlayer(**p) for p in own_team if p["id"] != player_id_str
                        ],
                        opponents=[MatchPlayer(**p) for p in other_team],
                    )
                )

        played = wins + losses
        return PlayerMatchHistoryResponse(
            wins=wins,
            losses=losses,
            played=played,
            win_rate=round(wins * 100 / played, 2) if played else 0,
            recent_matches=recent_matches,
        )
