from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.health.router import router as health_router
from app.infrastructure.config import get_settings
from app.infrastructure.database import engine
from app.infrastructure.exceptions import register_exception_handlers
from app.jobs.scheduler import start_scheduler, stop_scheduler
from app.matches.bootstrap import ensure_matches_tables
from app.matches.router import router as matches_router
from app.players.bootstrap import ensure_players_table
from app.players.router import router as players_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    await ensure_players_table(engine)
    await ensure_matches_tables(engine)
    start_scheduler()
    yield
    stop_scheduler()
    await engine.dispose()


def create_app() -> FastAPI:
    app = FastAPI(title=settings.app_name, lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)

    app.include_router(health_router)
    app.include_router(players_router)
    app.include_router(matches_router)

    return app


app = create_app()
