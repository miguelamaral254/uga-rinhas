import uuid

from pydantic import BaseModel, Field

from app.group_matches.get_group_leaderboard_usecase import GetGroupLeaderboardUseCase
from app.group_matches.repository import GroupMatchRepository
from app.groups.repository import GroupRepository
from app.infrastructure import ddragon
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError
from app.infrastructure.riot_client import RiotClient
from app.players.get_player_profile_usecase import RankEntryResponse
from app.players.repository import Player, PlayerRepository


class GroupLeaderResponse(BaseModel):
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    profile_icon_url: str | None
    summoner_level: int | None
    solo_duo_rank: RankEntryResponse | None
    wins: int = Field(ge=0)


class GetGroupLeaderUseCase:
    def __init__(
        self,
        group_repository: GroupRepository,
        match_repository: GroupMatchRepository,
        player_repository: PlayerRepository,
        riot_client: RiotClient,
        current_player: Player,
    ):
        self._group_repository = group_repository
        self._match_repository = match_repository
        self._player_repository = player_repository
        self._riot_client = riot_client
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID) -> GroupLeaderResponse:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if not await self._group_repository.is_member(group_id, self._current_player.id):
            raise ForbiddenError("group.notAMember")

        owner = await self._player_repository.find_by_id(group.owner_id)
        version = await ddragon.get_latest_version()

        league_entries = await self._riot_client.get_league_entries_by_puuid(owner.puuid)
        solo_duo = next((e for e in league_entries if e["queueType"] == "RANKED_SOLO_5x5"), None)

        leaderboard = await GetGroupLeaderboardUseCase(
            self._group_repository, self._match_repository, self._current_player
        ).execute(group_id)
        owner_entry = next((e for e in leaderboard if e.id == owner.id), None)

        return GroupLeaderResponse(
            id=owner.id,
            display_name=owner.display_name,
            riot_game_name=owner.riot_game_name,
            riot_tag_line=owner.riot_tag_line,
            profile_icon_url=(
                ddragon.profile_icon_url(version, owner.profile_icon_id)
                if owner.profile_icon_id
                else None
            ),
            summoner_level=owner.summoner_level,
            solo_duo_rank=(
                RankEntryResponse(
                    queue="Solo/Duo",
                    tier=solo_duo["tier"].capitalize(),
                    rank=solo_duo["rank"],
                    league_points=solo_duo["leaguePoints"],
                    wins=solo_duo["wins"],
                    losses=solo_duo["losses"],
                    emblem_url=ddragon.rank_emblem_url(solo_duo["tier"]),
                )
                if solo_duo
                else None
            ),
            wins=owner_entry.wins if owner_entry else 0,
        )
