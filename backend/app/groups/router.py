import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentPlayer
from app.group_matches.get_group_leaderboard_usecase import (
    GetGroupLeaderboardUseCase,
    GroupLeaderboardEntry,
)
from app.group_matches.repository import GroupMatchRepository
from app.groups.create_group_usecase import (
    CreateGroupRequest,
    CreateGroupUseCase,
    GroupResponse,
)
from app.groups.get_group_members_usecase import GetGroupMembersUseCase, GroupMemberResponse
from app.groups.join_group_usecase import JoinGroupRequest, JoinGroupUseCase
from app.groups.list_my_groups_usecase import ListMyGroupsUseCase
from app.groups.repository import GroupRepository
from app.infrastructure.database import get_session
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError

router = APIRouter(prefix="/api/groups", tags=["groups"])

Session = Annotated[AsyncSession, Depends(get_session)]


@router.post("", response_model=GroupResponse, status_code=201)
async def create(
    request: CreateGroupRequest, session: Session, current_player: CurrentPlayer
) -> GroupResponse:
    use_case = CreateGroupUseCase(GroupRepository(session), current_player)
    return await use_case.execute(request)


@router.post("/join", response_model=GroupResponse)
async def join(
    request: JoinGroupRequest, session: Session, current_player: CurrentPlayer
) -> GroupResponse:
    use_case = JoinGroupUseCase(GroupRepository(session), current_player)
    return await use_case.execute(request)


@router.get("/mine", response_model=list[GroupResponse])
async def mine(session: Session, current_player: CurrentPlayer) -> list[GroupResponse]:
    use_case = ListMyGroupsUseCase(GroupRepository(session), current_player)
    return await use_case.execute()


@router.get("/{group_id}", response_model=GroupResponse)
async def get_group(
    group_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> GroupResponse:
    repository = GroupRepository(session)
    group = await repository.find_by_id(group_id)
    if group is None:
        raise ResourceNotFoundError("group.notFound")
    if not await repository.is_member(group_id, current_player.id):
        raise ForbiddenError("group.notAMember")

    return GroupResponse(id=group.id, name=group.name, join_code=group.join_code)


@router.get("/{group_id}/members", response_model=list[GroupMemberResponse])
async def members(
    group_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> list[GroupMemberResponse]:
    use_case = GetGroupMembersUseCase(GroupRepository(session), current_player)
    return await use_case.execute(group_id)


@router.get("/{group_id}/leaderboard", response_model=list[GroupLeaderboardEntry])
async def leaderboard(
    group_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> list[GroupLeaderboardEntry]:
    use_case = GetGroupLeaderboardUseCase(
        GroupRepository(session), GroupMatchRepository(session), current_player
    )
    return await use_case.execute(group_id)
