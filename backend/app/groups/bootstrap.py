from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

_CREATE_SCHEMA = text("CREATE SCHEMA IF NOT EXISTS lol")

_CREATE_GROUPS_TABLE = text("""
    CREATE TABLE IF NOT EXISTS lol.groups (
        id UUID PRIMARY KEY,
        name TEXT NOT NULL,
        join_code TEXT NOT NULL UNIQUE,
        created_by UUID NOT NULL REFERENCES lol.players (id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
""")

_CREATE_GROUP_MEMBERS_TABLE = text("""
    CREATE TABLE IF NOT EXISTS lol.group_members (
        group_id UUID NOT NULL REFERENCES lol.groups (id),
        player_id UUID NOT NULL REFERENCES lol.players (id),
        joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        PRIMARY KEY (group_id, player_id)
    )
""")


async def ensure_groups_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(_CREATE_SCHEMA)
        await conn.execute(_CREATE_GROUPS_TABLE)
        await conn.execute(_CREATE_GROUP_MEMBERS_TABLE)
