import asyncio
import time
from urllib.parse import quote

import httpx

from app.infrastructure.config import get_settings
from app.infrastructure.exceptions import RiotApiUnavailableError

# Personal API keys are capped at 20 req/1s and 100 req/2min - this single
# fixed delay keeps us well under both without needing a sliding-window counter.
_MIN_INTERVAL_SECONDS = 1.2


class RiotClient:
    def __init__(self):
        settings = get_settings()
        self._api_key = settings.riot_api_key
        self._platform = settings.riot_platform
        self._region = settings.riot_region
        self._lock = asyncio.Lock()
        self._last_call = 0.0

    async def get_account_by_riot_id(self, game_name: str, tag_line: str) -> dict | None:
        url = (
            f"https://{self._region}.api.riotgames.com/riot/account/v1/accounts/"
            f"by-riot-id/{quote(game_name)}/{quote(tag_line)}"
        )
        return await self._get(url)

    async def get_match_ids_by_puuid(
        self, puuid: str, count: int = 20, queue: int | None = None
    ) -> list[str]:
        url = (
            f"https://{self._region}.api.riotgames.com/lol/match/v5/matches/"
            f"by-puuid/{puuid}/ids?start=0&count={count}"
        )
        if queue is not None:
            url += f"&queue={queue}"
        return await self._get(url) or []

    async def get_match(self, match_id: str) -> dict | None:
        url = f"https://{self._region}.api.riotgames.com/lol/match/v5/matches/{match_id}"
        return await self._get(url)

    async def get_summoner_by_puuid(self, puuid: str) -> dict | None:
        url = f"https://{self._platform}.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}"
        return await self._get(url)

    async def get_league_entries_by_puuid(self, puuid: str) -> list[dict]:
        url = f"https://{self._platform}.api.riotgames.com/lol/league/v4/entries/by-puuid/{puuid}"
        return await self._get(url) or []

    async def get_top_champion_masteries(self, puuid: str, count: int = 5) -> list[dict]:
        url = (
            f"https://{self._platform}.api.riotgames.com/lol/champion-mastery/v4/"
            f"champion-masteries/by-puuid/{puuid}/top?count={count}"
        )
        return await self._get(url) or []

    async def _get(self, url: str) -> dict | list | None:
        async with self._lock:
            elapsed = time.monotonic() - self._last_call
            if elapsed < _MIN_INTERVAL_SECONDS:
                await asyncio.sleep(_MIN_INTERVAL_SECONDS - elapsed)
            try:
                async with httpx.AsyncClient(timeout=10) as client:
                    response = await client.get(url, headers={"X-Riot-Token": self._api_key})
            except httpx.HTTPError as exc:
                raise RiotApiUnavailableError(f"Riot API unreachable: {exc}") from exc
            finally:
                self._last_call = time.monotonic()

        if response.status_code == 404:
            return None
        if response.status_code >= 400:
            raise RiotApiUnavailableError(f"Riot API {response.status_code}: {response.text}")
        return response.json()
