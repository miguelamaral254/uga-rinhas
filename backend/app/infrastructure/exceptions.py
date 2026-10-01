from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ApiErrorResponse(BaseModel):
    message: str


class ApiError(Exception):
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class ValidationError(ApiError):
    """Business rule violation (HTTP 400)."""


class ResourceNotFoundError(ApiError):
    """Entity not found (HTTP 404)."""


class ConflictError(ApiError):
    """Data conflict (HTTP 409)."""


class RiotApiUnavailableError(ApiError):
    """Riot API errored or rate-limited us (HTTP 502)."""


_STATUS_CODE_BY_EXCEPTION: dict[type[ApiError], int] = {
    ValidationError: 400,
    ResourceNotFoundError: 404,
    ConflictError: 409,
    RiotApiUnavailableError: 502,
}


def register_exception_handlers(app: FastAPI) -> None:
    for exception_class, status_code in _STATUS_CODE_BY_EXCEPTION.items():
        app.add_exception_handler(exception_class, _build_handler(status_code))


def _build_handler(status_code: int):
    async def handler(request: Request, exc: ApiError) -> JSONResponse:
        return JSONResponse(
            status_code=status_code,
            content=ApiErrorResponse(message=exc.message).model_dump(),
        )

    return handler
