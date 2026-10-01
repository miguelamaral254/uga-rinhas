from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger

from app.infrastructure.config import get_settings
from app.infrastructure.database import session_factory
from app.infrastructure.riot_client import RiotClient
from app.matches.repository import MatchRepository
from app.matches.sync_matches_usecase import SyncMatchesUseCase
from app.players.repository import PlayerRepository

scheduler = AsyncIOScheduler()


async def _run_sync() -> None:
    async with session_factory() as session:
        use_case = SyncMatchesUseCase(
            PlayerRepository(session), MatchRepository(session), RiotClient()
        )
        await use_case.execute()


def start_scheduler() -> None:
    settings = get_settings()
    scheduler.add_job(
        _run_sync,
        trigger=IntervalTrigger(minutes=settings.sync_interval_minutes),
        id="sync_matches",
        replace_existing=True,
    )
    scheduler.start()


def stop_scheduler() -> None:
    scheduler.shutdown(wait=False)
