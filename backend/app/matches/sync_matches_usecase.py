import datetime
import uuid

from pydantic import BaseModel

from app.infrastructure.exceptions import RiotApiUnavailableError
from app.infrastructure.riot_client import RiotClient
from app.matches.repository import Match, MatchParticipant, MatchRepository
from app.players.repository import Player, PlayerRepository
from app.shared.usecase import NullaryUseCase

_SUMMONERS_RIFT_MAP_ID = 11
# Custom games (queue=0) are RSO-gated and 404 for a non-RSO key, so this pulls
# the player's most recent Summoner's Rift matches regardless of queue instead -
# ranked, normals, whatever - just so the profile UI has real data to render.
_MATCH_HISTORY_DEPTH = 20


class SyncResult(BaseModel):
    players_checked: int
    matches_synced: int


def _extract_items(participant: dict) -> list[int]:
    return [participant.get(f"item{slot}", 0) for slot in range(7)]


class SyncMatchesUseCase(NullaryUseCase[SyncResult]):
    def __init__(
        self,
        player_repository: PlayerRepository,
        match_repository: MatchRepository,
        riot_client: RiotClient,
    ):
        self._player_repository = player_repository
        self._match_repository = match_repository
        self._riot_client = riot_client

    async def execute(self) -> SyncResult:
        players = await self._player_repository.list_all()
        player_id_by_puuid = {p.puuid: p.id for p in players}

        matches_synced = 0
        seen_match_ids: set[str] = set()
        for player in players:
            await self._refresh_profile(player)

            try:
                match_ids = await self._riot_client.get_match_ids_by_puuid(
                    player.puuid, count=_MATCH_HISTORY_DEPTH
                )
            except RiotApiUnavailableError:
                continue

            for match_id in match_ids:
                if match_id in seen_match_ids or await self._match_repository.is_checked(
                    match_id
                ):
                    continue
                seen_match_ids.add(match_id)

                try:
                    match = await self._fetch_match(match_id, player_id_by_puuid)
                except RiotApiUnavailableError:
                    continue

                await self._match_repository.mark_checked(match_id)
                if match is not None:
                    await self._match_repository.save(match)
                    matches_synced += 1

        return SyncResult(players_checked=len(players), matches_synced=matches_synced)

    async def _refresh_profile(self, player: Player) -> None:
        try:
            summoner = await self._riot_client.get_summoner_by_puuid(player.puuid)
        except RiotApiUnavailableError:
            return
        if summoner is not None:
            await self._player_repository.update_profile(
                player.id, summoner["profileIconId"], summoner["summonerLevel"]
            )

    async def _fetch_match(
        self, match_id: str, player_id_by_puuid: dict[str, uuid.UUID]
    ) -> Match | None:
        data = await self._riot_client.get_match(match_id)
        if data is None:
            return None

        info = data["info"]
        if info["mapId"] != _SUMMONERS_RIFT_MAP_ID or len(info["participants"]) != 10:
            return None

        participants = [
            MatchParticipant(
                player_id=player_id_by_puuid[p["puuid"]],
                champion_name=p["championName"],
                team_id=p["teamId"],
                win=p["win"],
                kills=p["kills"],
                deaths=p["deaths"],
                assists=p["assists"],
                team_position=p.get("teamPosition", ""),
                items=_extract_items(p),
            )
            for p in info["participants"]
            if p["puuid"] in player_id_by_puuid
        ]
        if not participants:
            return None

        participants_raw = [
            {
                "player_id": str(player_id_by_puuid[p["puuid"]])
                if p["puuid"] in player_id_by_puuid
                else None,
                "display_name": p.get("riotIdGameName") or p.get("summonerName") or "Desconhecido",
                "champion_name": p["championName"],
                "team_id": p["teamId"],
                "win": p["win"],
                "kills": p["kills"],
                "deaths": p["deaths"],
                "assists": p["assists"],
                "team_position": p.get("teamPosition", ""),
                "items": _extract_items(p),
            }
            for p in info["participants"]
        ]

        return Match(
            match_id=match_id,
            queue_id=info["queueId"],
            game_mode=info["gameMode"],
            map_id=info["mapId"],
            game_creation=datetime.datetime.fromtimestamp(
                info["gameCreation"] / 1000, tz=datetime.UTC
            ),
            game_duration_seconds=info["gameDuration"],
            participants=participants,
            participants_raw=participants_raw,
        )
