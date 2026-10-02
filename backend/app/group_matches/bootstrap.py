from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

_CREATE_SCHEMA = text("CREATE SCHEMA IF NOT EXISTS lol")

_CREATE_TABLE = text("""
    CREATE TABLE IF NOT EXISTS lol.group_matches (
        id UUID PRIMARY KEY,
        group_id UUID NOT NULL REFERENCES lol.groups (id),
        team_blue JSONB NOT NULL,
        team_red JSONB NOT NULL,
        captain_blue_id UUID NOT NULL,
        captain_red_id UUID NOT NULL,
        status TEXT NOT NULL DEFAULT 'IN_PROGRESS',
        winning_team TEXT,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        ended_at TIMESTAMPTZ,
        duration_seconds INT
    )
""")

_CREATE_GROUP_INDEX = text("""
    CREATE INDEX IF NOT EXISTS idx_group_matches_group ON lol.group_matches (group_id)
""")


async def ensure_group_matches_table(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(_CREATE_SCHEMA)
        await conn.execute(_CREATE_TABLE)
        await conn.execute(_CREATE_GROUP_INDEX)
