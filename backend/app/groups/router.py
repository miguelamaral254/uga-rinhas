import uuid
from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth.dependencies import CurrentPlayer
from app.group_matches.get_group_leaderboard_usecase import (
    GetGroupLeaderboardUseCase,
    GroupLeaderboardEntry,
)
from app.group_matches.get_group_match_history_usecase import (
    GetGroupMatchHistoryUseCase,
    GroupMatchSummaryResponse,
)
from app.group_matches.repository import GroupMatchRepository
from app.groups.create_group_usecase import (
    CreateGroupRequest,
    CreateGroupUseCase,
    GroupResponse,
    to_group_response,
)
from app.groups.discover_groups_usecase import (
    DiscoverableGroupResponse,
    ListDiscoverableGroupsUseCase,
    LookupGroupByCodeUseCase,
)
from app.groups.get_group_members_usecase import GetGroupMembersUseCase, GroupMemberResponse
from app.groups.join_group_usecase import JoinGroupRequest, JoinGroupResponse, JoinGroupUseCase
from app.groups.join_requests_usecase import ListJoinRequestsUseCase, RespondToJoinRequestUseCase
from app.groups.list_my_groups_usecase import ListMyGroupsUseCase
from app.groups.remove_member_usecase import RemoveMemberUseCase
from app.groups.repository import GroupRepository
from app.groups.transfer_ownership_usecase import (
    TransferOwnershipRequest,
    TransferOwnershipUseCase,
)
from app.groups.update_group_usecase import UpdateGroupRequest, UpdateGroupUseCase
from app.infrastructure.database import get_session
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError
from app.players.repository import PlayerRepository

router = APIRouter(prefix="/api/groups", tags=["groups"])

Session = Annotated[AsyncSession, Depends(get_session)]


@router.post("", response_model=GroupResponse, status_code=201)
async def create(
    request: CreateGroupRequest, session: Session, current_player: CurrentPlayer
) -> GroupResponse:
    use_case = CreateGroupUseCase(GroupRepository(session), current_player)
    return await use_case.execute(request)


@router.post("/join", response_model=JoinGroupResponse)
async def join(
    request: JoinGroupRequest, session: Session, current_player: CurrentPlayer
) -> JoinGroupResponse:
    use_case = JoinGroupUseCase(GroupRepository(session), current_player)
    return await use_case.execute(request)


@router.get("/mine", response_model=list[GroupResponse])
async def mine(session: Session, current_player: CurrentPlayer) -> list[GroupResponse]:
    use_case = ListMyGroupsUseCase(GroupRepository(session), current_player)
    return await use_case.execute()


@router.get("/discover", response_model=list[DiscoverableGroupResponse])
async def discover(
    session: Session, current_player: CurrentPlayer
) -> list[DiscoverableGroupResponse]:
    use_case = ListDiscoverableGroupsUseCase(GroupRepository(session), current_player)
    return await use_case.execute()


@router.get("/lookup/{join_code}", response_model=DiscoverableGroupResponse)
async def lookup(join_code: str, session: Session) -> DiscoverableGroupResponse:
    use_case = LookupGroupByCodeUseCase(GroupRepository(session))
    return await use_case.execute(join_code)


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

    return to_group_response(group)


@router.patch("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: uuid.UUID, request: UpdateGroupRequest, session: Session, current_player: CurrentPlayer
) -> GroupResponse:
    use_case = UpdateGroupUseCase(GroupRepository(session), current_player)
    return await use_case.execute(group_id, request)


@router.post("/{group_id}/transfer-owner", response_model=GroupResponse)
async def transfer_owner(
    group_id: uuid.UUID,
    request: TransferOwnershipRequest,
    session: Session,
    current_player: CurrentPlayer,
) -> GroupResponse:
    use_case = TransferOwnershipUseCase(GroupRepository(session), current_player)
    return await use_case.execute(group_id, request)


@router.get("/{group_id}/members", response_model=list[GroupMemberResponse])
async def members(
    group_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> list[GroupMemberResponse]:
    use_case = GetGroupMembersUseCase(GroupRepository(session), current_player)
    return await use_case.execute(group_id)


@router.delete("/{group_id}/members/{player_id}", status_code=204)
async def remove_member(
    group_id: uuid.UUID, player_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> None:
    use_case = RemoveMemberUseCase(GroupRepository(session), current_player)
    await use_case.execute(group_id, player_id)


@router.get("/{group_id}/requests", response_model=list[GroupMemberResponse])
async def list_requests(
    group_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> list[GroupMemberResponse]:
    use_case = ListJoinRequestsUseCase(GroupRepository(session), current_player)
    return await use_case.execute(group_id)


@router.post("/{group_id}/requests/{player_id}/approve", status_code=204)
async def approve_request(
    group_id: uuid.UUID, player_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> None:
    use_case = RespondToJoinRequestUseCase(GroupRepository(session), current_player)
    await use_case.execute(group_id, player_id, approve=True)


@router.post("/{group_id}/requests/{player_id}/reject", status_code=204)
async def reject_request(
    group_id: uuid.UUID, player_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> None:
    use_case = RespondToJoinRequestUseCase(GroupRepository(session), current_player)
    await use_case.execute(group_id, player_id, approve=False)


@router.get("/{group_id}/leaderboard", response_model=list[GroupLeaderboardEntry])
async def leaderboard(
    group_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> list[GroupLeaderboardEntry]:
    use_case = GetGroupLeaderboardUseCase(
        GroupRepository(session), GroupMatchRepository(session), current_player
    )
    return await use_case.execute(group_id)


@router.get("/{group_id}/matches", response_model=list[GroupMatchSummaryResponse])
async def match_history(
    group_id: uuid.UUID, session: Session, current_player: CurrentPlayer
) -> list[GroupMatchSummaryResponse]:
    use_case = GetGroupMatchHistoryUseCase(
        GroupRepository(session), GroupMatchRepository(session), PlayerRepository(session), current_player
    )
    return await use_case.execute(group_id)
