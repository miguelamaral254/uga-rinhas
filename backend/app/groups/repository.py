import uuid
from dataclasses import dataclass

from sqlalchemy import bindparam, text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.ext.asyncio import AsyncSession


@dataclass(frozen=True)
class Group:
    id: uuid.UUID
    name: str
    join_code: str
    created_by: uuid.UUID
    owner_id: uuid.UUID


@dataclass(frozen=True)
class GroupMember:
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    profile_icon_id: int | None
    summoner_level: int | None


_GROUP_FIELDS = "id, name, join_code, created_by, owner_id"


class GroupRepository:
    def __init__(self, session: AsyncSession):
        self._session = session

    async def save(self, group: Group) -> None:
        await self._session.execute(
            text("""
                INSERT INTO lol.groups (id, name, join_code, created_by, owner_id)
                VALUES (:id, :name, :join_code, :created_by, :owner_id)
            """),
            {
                "id": group.id,
                "name": group.name,
                "join_code": group.join_code,
                "created_by": group.created_by,
                "owner_id": group.owner_id,
            },
        )
        await self._session.commit()

    async def update_name(self, group_id: uuid.UUID, name: str) -> None:
        query = text("""
            UPDATE lol.groups SET name = :name WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(query, {"id": group_id, "name": name})
        await self._session.commit()

    async def update_owner(self, group_id: uuid.UUID, new_owner_id: uuid.UUID) -> None:
        query = text("""
            UPDATE lol.groups SET owner_id = :owner_id WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(query, {"id": group_id, "owner_id": new_owner_id})
        await self._session.commit()

    async def add_member(
        self, group_id: uuid.UUID, player_id: uuid.UUID, status: str = "APPROVED"
    ) -> None:
        await self._session.execute(
            text("""
                INSERT INTO lol.group_members (group_id, player_id, status)
                VALUES (:group_id, :player_id, :status)
                ON CONFLICT (group_id, player_id) DO NOTHING
            """),
            {"group_id": group_id, "player_id": player_id, "status": status},
        )
        await self._session.commit()

    async def approve_member(self, group_id: uuid.UUID, player_id: uuid.UUID) -> None:
        query = text("""
            UPDATE lol.group_members SET status = 'APPROVED'
            WHERE group_id = :group_id AND player_id = :player_id
        """).bindparams(bindparam("group_id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(query, {"group_id": group_id, "player_id": player_id})
        await self._session.commit()

    async def remove_member(self, group_id: uuid.UUID, player_id: uuid.UUID) -> None:
        query = text("""
            DELETE FROM lol.group_members WHERE group_id = :group_id AND player_id = :player_id
        """).bindparams(bindparam("group_id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(query, {"group_id": group_id, "player_id": player_id})
        await self._session.commit()

    async def find_by_id(self, group_id: uuid.UUID) -> Group | None:
        query = text(f"""
            SELECT {_GROUP_FIELDS} FROM lol.groups WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"id": group_id})
        row = result.first()
        return Group(**row._mapping) if row else None

    async def find_by_join_code(self, join_code: str) -> Group | None:
        result = await self._session.execute(
            text(f"SELECT {_GROUP_FIELDS} FROM lol.groups WHERE join_code = :code"),
            {"code": join_code},
        )
        row = result.first()
        return Group(**row._mapping) if row else None

    async def find_membership_status(
        self, group_id: uuid.UUID, player_id: uuid.UUID
    ) -> str | None:
        query = text("""
            SELECT status FROM lol.group_members
            WHERE group_id = :group_id AND player_id = :player_id
        """).bindparams(bindparam("group_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"group_id": group_id, "player_id": player_id})
        row = result.first()
        return row.status if row else None

    async def is_member(self, group_id: uuid.UUID, player_id: uuid.UUID) -> bool:
        return await self.find_membership_status(group_id, player_id) == "APPROVED"

    async def list_members(self, group_id: uuid.UUID) -> list[GroupMember]:
        query = text("""
            SELECT p.id, p.display_name, p.riot_game_name, p.riot_tag_line,
                   p.profile_icon_id, p.summoner_level
            FROM lol.group_members gm
            JOIN lol.players p ON p.id = gm.player_id
            WHERE gm.group_id = :group_id AND gm.status = 'APPROVED'
            ORDER BY p.display_name
        """).bindparams(bindparam("group_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"group_id": group_id})
        return [GroupMember(**row._mapping) for row in result]

    async def list_pending_members(self, group_id: uuid.UUID) -> list[GroupMember]:
        query = text("""
            SELECT p.id, p.display_name, p.riot_game_name, p.riot_tag_line,
                   p.profile_icon_id, p.summoner_level
            FROM lol.group_members gm
            JOIN lol.players p ON p.id = gm.player_id
            WHERE gm.group_id = :group_id AND gm.status = 'PENDING'
            ORDER BY gm.joined_at
        """).bindparams(bindparam("group_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"group_id": group_id})
        return [GroupMember(**row._mapping) for row in result]

    async def list_for_player(self, player_id: uuid.UUID) -> list[Group]:
        query = text(f"""
            SELECT {', '.join(f'g.{f}' for f in _GROUP_FIELDS.split(', '))}
            FROM lol.group_members gm
            JOIN lol.groups g ON g.id = gm.group_id
            WHERE gm.player_id = :player_id AND gm.status = 'APPROVED'
            ORDER BY g.name
        """).bindparams(bindparam("player_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"player_id": player_id})
        return [Group(**row._mapping) for row in result]
