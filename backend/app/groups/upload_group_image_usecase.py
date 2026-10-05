import uuid
from pathlib import Path

from fastapi import UploadFile

from app.groups.create_group_usecase import GroupResponse, to_group_response
from app.groups.repository import Group, GroupRepository
from app.infrastructure.exceptions import ForbiddenError, ResourceNotFoundError, ValidationError
from app.players.repository import Player

MAX_IMAGE_BYTES = 1 * 1024 * 1024

_EXTENSION_BY_CONTENT_TYPE = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
}

_UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "uploads" / "groups"


class UploadGroupImageUseCase:
    def __init__(self, group_repository: GroupRepository, current_player: Player):
        self._group_repository = group_repository
        self._current_player = current_player

    async def execute(self, group_id: uuid.UUID, file: UploadFile) -> GroupResponse:
        group = await self._group_repository.find_by_id(group_id)
        if group is None:
            raise ResourceNotFoundError("group.notFound")
        if group.owner_id != self._current_player.id:
            raise ForbiddenError("group.notTheOwner")

        extension = _EXTENSION_BY_CONTENT_TYPE.get(file.content_type)
        if extension is None:
            raise ValidationError("group.imageInvalidType")

        content = await file.read()
        if len(content) > MAX_IMAGE_BYTES:
            raise ValidationError("group.imageTooLarge")

        _UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
        for existing in _UPLOAD_DIR.glob(f"{group_id}.*"):
            existing.unlink()
        (_UPLOAD_DIR / f"{group_id}.{extension}").write_bytes(content)

        image_path = f"/uploads/groups/{group_id}.{extension}"
        await self._group_repository.update_image(group_id, image_path)

        return to_group_response(Group(**{**vars(group), "image_path": image_path}))
