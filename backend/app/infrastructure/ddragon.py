import httpx

_cached_version: str | None = None
_cached_champions_by_id: dict[int, dict] | None = None


async def get_latest_version() -> str:
    global _cached_version
    if _cached_version is None:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get("https://ddragon.leagueoflegends.com/api/versions.json")
        _cached_version = response.json()[0]
    return _cached_version


async def get_champions_by_id() -> dict[int, dict]:
    """Maps Champion-Mastery-V4's numeric championId to the champion's Data Dragon
    id (used in icon URLs, and almost always matching match-v5's championName) and
    its display name ("Lee Sin" vs the id "LeeSin")."""
    global _cached_champions_by_id
    if _cached_champions_by_id is None:
        version = await get_latest_version()
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.get(
                f"https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/champion.json"
            )
        _cached_champions_by_id = {
            int(champ["key"]): {"id": champ["id"], "name": champ["name"]}
            for champ in response.json()["data"].values()
        }
    return _cached_champions_by_id


def profile_icon_url(version: str, profile_icon_id: int) -> str:
    return f"https://ddragon.leagueoflegends.com/cdn/{version}/img/profileicon/{profile_icon_id}.png"


def champion_icon_url(version: str, champion_name: str) -> str:
    return f"https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{champion_name}.png"


def item_icon_url(version: str, item_id: int) -> str:
    return f"https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{item_id}.png"


def rank_emblem_url(tier: str) -> str:
    # Not Data Dragon - Riot doesn't publish rank emblems there. Community Dragon
    # mirrors the game's own assets and is what every LoL stats site uses for this.
    return (
        "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/"
        f"global/default/images/ranked-mini-crests/{tier.lower()}.svg"
    )
