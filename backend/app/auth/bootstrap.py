from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncEngine

_CREATE_SCHEMA = text("CREATE SCHEMA IF NOT EXISTS lol")

_CREATE_SESSIONS_TABLE = text("""
    CREATE TABLE IF NOT EXISTS lol.sessions (
        token TEXT PRIMARY KEY,
        player_id UUID NOT NULL REFERENCES lol.players (id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
""")


async def ensure_sessions_table(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(_CREATE_SCHEMA)
        await conn.execute(_CREATE_SESSIONS_TABLE)
