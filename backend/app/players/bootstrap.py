from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

_CREATE_SCHEMA = text("CREATE SCHEMA IF NOT EXISTS lol")

_CREATE_PLAYERS_TABLE = text("""
    CREATE TABLE IF NOT EXISTS lol.players (
        id UUID PRIMARY KEY,
        display_name TEXT NOT NULL,
        riot_game_name TEXT NOT NULL,
        riot_tag_line TEXT NOT NULL,
        puuid TEXT NOT NULL UNIQUE,
        region TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        UNIQUE (riot_game_name, riot_tag_line)
    )
""")


_ADD_PROFILE_ICON_COLUMN = text("""
    ALTER TABLE lol.players ADD COLUMN IF NOT EXISTS profile_icon_id INT
""")

_ADD_SUMMONER_LEVEL_COLUMN = text("""
    ALTER TABLE lol.players ADD COLUMN IF NOT EXISTS summoner_level INT
""")


async def ensure_players_table(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(_CREATE_SCHEMA)
        await conn.execute(_CREATE_PLAYERS_TABLE)
        await conn.execute(_ADD_PROFILE_ICON_COLUMN)
        await conn.execute(_ADD_SUMMONER_LEVEL_COLUMN)
