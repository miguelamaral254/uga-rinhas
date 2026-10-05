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
    image_path: str | None


@dataclass(frozen=True)
class GroupMember:
    id: uuid.UUID
    display_name: str
    riot_game_name: str
    riot_tag_line: str
    profile_icon_id: int | None
    summoner_level: int | None


_GROUP_FIELDS = "id, name, join_code, created_by, owner_id, image_path"


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

    async def update_image(self, group_id: uuid.UUID, image_path: str) -> None:
        query = text("""
            UPDATE lol.groups SET image_path = :image_path WHERE id = :id
        """).bindparams(bindparam("id", type_=PG_UUID(as_uuid=True)))
        await self._session.execute(query, {"id": group_id, "image_path": image_path})
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

    async def list_discoverable(
        self, excluding_player_id: uuid.UUID
    ) -> list[tuple[Group, GroupMember, int]]:
        query = text("""
            SELECT g.id, g.name, g.join_code, g.created_by, g.owner_id, g.image_path,
                   p.id AS owner_id_dup, p.display_name AS owner_display_name,
                   p.riot_game_name AS owner_riot_game_name,
                   p.riot_tag_line AS owner_riot_tag_line,
                   p.profile_icon_id AS owner_profile_icon_id,
                   p.summoner_level AS owner_summoner_level,
                   COUNT(gm.player_id) FILTER (WHERE gm.status = 'APPROVED') AS member_count
            FROM lol.groups g
            JOIN lol.players p ON p.id = g.owner_id
            LEFT JOIN lol.group_members gm ON gm.group_id = g.id
            WHERE g.id NOT IN (
                SELECT group_id FROM lol.group_members WHERE player_id = :player_id
            )
            GROUP BY g.id, g.name, g.join_code, g.created_by, g.owner_id, g.image_path,
                     p.id, p.display_name, p.riot_game_name, p.riot_tag_line,
                     p.profile_icon_id, p.summoner_level
            ORDER BY member_count DESC, g.name ASC
        """).bindparams(bindparam("player_id", type_=PG_UUID(as_uuid=True)))
        result = await self._session.execute(query, {"player_id": excluding_player_id})
        return [_row_to_discoverable(row) for row in result]

    async def find_discoverable_by_join_code(
        self, join_code: str
    ) -> tuple[Group, GroupMember, int] | None:
        query = text("""
            SELECT g.id, g.name, g.join_code, g.created_by, g.owner_id, g.image_path,
                   p.id AS owner_id_dup, p.display_name AS owner_display_name,
                   p.riot_game_name AS owner_riot_game_name,
                   p.riot_tag_line AS owner_riot_tag_line,
                   p.profile_icon_id AS owner_profile_icon_id,
                   p.summoner_level AS owner_summoner_level,
                   COUNT(gm.player_id) FILTER (WHERE gm.status = 'APPROVED') AS member_count
            FROM lol.groups g
            JOIN lol.players p ON p.id = g.owner_id
            LEFT JOIN lol.group_members gm ON gm.group_id = g.id
            WHERE g.join_code = :code
            GROUP BY g.id, g.name, g.join_code, g.created_by, g.owner_id, g.image_path,
                     p.id, p.display_name, p.riot_game_name, p.riot_tag_line,
                     p.profile_icon_id, p.summoner_level
        """)
        result = await self._session.execute(query, {"code": join_code})
        row = result.first()
        return _row_to_discoverable(row) if row else None

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


def _row_to_discoverable(row) -> tuple[Group, GroupMember, int]:
    mapping = row._mapping
    group = Group(
        id=mapping["id"],
        name=mapping["name"],
        join_code=mapping["join_code"],
        created_by=mapping["created_by"],
        owner_id=mapping["owner_id"],
        image_path=mapping["image_path"],
    )
    owner = GroupMember(
        id=mapping["owner_id_dup"],
        display_name=mapping["owner_display_name"],
        riot_game_name=mapping["owner_riot_game_name"],
        riot_tag_line=mapping["owner_riot_tag_line"],
        profile_icon_id=mapping["owner_profile_icon_id"],
        summoner_level=mapping["owner_summoner_level"],
    )
    return group, owner, mapping["member_count"]
