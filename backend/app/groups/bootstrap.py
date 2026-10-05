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

# Existing rows default to APPROVED (they joined back when it was instant) - only
# new join requests start PENDING, pending the owner's review.
_ADD_STATUS_COLUMN = text("""
    ALTER TABLE lol.group_members ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'APPROVED'
""")

# owner_id is the transferable leadership slot; created_by stays fixed as history.
# Existing groups start with owner_id = created_by.
_ADD_OWNER_ID_COLUMN = text("""
    ALTER TABLE lol.groups ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES lol.players (id)
""")

_BACKFILL_OWNER_ID = text("""
    UPDATE lol.groups SET owner_id = created_by WHERE owner_id IS NULL
""")

# Relative path under /uploads (e.g. "/uploads/groups/<id>.jpg") - absolute URLs
# are built at response time from settings.public_base_url.
_ADD_IMAGE_PATH_COLUMN = text("""
    ALTER TABLE lol.groups ADD COLUMN IF NOT EXISTS image_path TEXT
""")


async def ensure_groups_tables(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.execute(_CREATE_SCHEMA)
        await conn.execute(_CREATE_GROUPS_TABLE)
        await conn.execute(_CREATE_GROUP_MEMBERS_TABLE)
        await conn.execute(_ADD_STATUS_COLUMN)
        await conn.execute(_ADD_OWNER_ID_COLUMN)
        await conn.execute(_BACKFILL_OWNER_ID)
        await conn.execute(_ADD_IMAGE_PATH_COLUMN)
