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

# Teams are now drawn (status DRAFT) before the timer actually starts (status
# IN_PROGRESS, set by BeginMatchUseCase) - started_at is unknown until then.
_DROP_STARTED_AT_DEFAULT = text("""
    ALTER TABLE lol.group_matches ALTER COLUMN started_at DROP DEFAULT
""")

_DROP_STARTED_AT_NOT_NULL = text("""
    ALTER TABLE lol.group_matches ALTER COLUMN started_at DROP NOT NULL
""")

_DROP_STATUS_DEFAULT = text("""
    ALTER TABLE lol.group_matches ALTER COLUMN status DROP DEFAULT
""")


async def ensure_group_matches_table(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(_CREATE_SCHEMA)
        await conn.execute(_CREATE_TABLE)
        await conn.execute(_CREATE_GROUP_INDEX)
        await conn.execute(_DROP_STARTED_AT_DEFAULT)
        await conn.execute(_DROP_STARTED_AT_NOT_NULL)
        await conn.execute(_DROP_STATUS_DEFAULT)
