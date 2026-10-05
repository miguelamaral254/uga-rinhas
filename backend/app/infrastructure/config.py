from functools import lru_cache
from typing import Annotated

from pydantic import field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "LoL Tracker"
    environment: str = "development"
    port: int = 8000
    public_base_url: str = "http://localhost:8000"

    database_url: str
    database_pool_size: int = 5
    database_max_overflow: int = 10

    riot_api_key: str = ""
    riot_platform: str = "br1"
    riot_region: str = "americas"

    sync_interval_minutes: int = 10

    cors_allow_origins: Annotated[list[str], NoDecode] = ["http://localhost:5173"]

    @field_validator("cors_allow_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
