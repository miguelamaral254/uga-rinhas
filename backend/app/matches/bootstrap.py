from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

_CREATE_SCHEMA = text("CREATE SCHEMA IF NOT EXISTS lol")

_CREATE_MATCHES_TABLE = text("""
    CREATE TABLE IF NOT EXISTS lol.matches (
        match_id TEXT PRIMARY KEY,
        queue_id INT NOT NULL,
        game_mode TEXT NOT NULL,
        map_id INT NOT NULL,
        game_creation TIMESTAMPTZ NOT NULL,
        game_duration_seconds INT NOT NULL,
        synced_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
""")

_CREATE_PARTICIPANTS_TABLE = text("""
    CREATE TABLE IF NOT EXISTS lol.match_participants (
        match_id TEXT NOT NULL REFERENCES lol.matches (match_id),
        player_id UUID NOT NULL REFERENCES lol.players (id),
        champion_name TEXT NOT NULL,
        team_id INT NOT NULL,
        win BOOLEAN NOT NULL,
        kills INT NOT NULL,
        deaths INT NOT NULL,
        assists INT NOT NULL,
        PRIMARY KEY (match_id, player_id)
    )
""")

_CREATE_PARTICIPANTS_PLAYER_INDEX = text("""
    CREATE INDEX IF NOT EXISTS idx_match_participants_player
        ON lol.match_participants (player_id)
""")

_ADD_TEAM_POSITION_COLUMN = text("""
    ALTER TABLE lol.match_participants ADD COLUMN IF NOT EXISTS team_position TEXT NOT NULL DEFAULT ''
""")

_CREATE_CHECKED_MATCHES_TABLE = text("""
    CREATE TABLE IF NOT EXISTS lol.checked_matches (
        match_id TEXT PRIMARY KEY,
        checked_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
""")


async def ensure_matches_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(_CREATE_SCHEMA)
        await conn.execute(_CREATE_MATCHES_TABLE)
        await conn.execute(_CREATE_PARTICIPANTS_TABLE)
        await conn.execute(_CREATE_PARTICIPANTS_PLAYER_INDEX)
        await conn.execute(_ADD_TEAM_POSITION_COLUMN)
        await conn.execute(_CREATE_CHECKED_MATCHES_TABLE)
