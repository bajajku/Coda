from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    notebooklm_home: str = str(Path.home() / ".notebooklm")
    notebooklm_profile: str = "default"
    notebooklm_auth_json: str | None = None
    storage_dir: str = str(Path(__file__).resolve().parent.parent / "storage")
    host: str = "0.0.0.0"
    port: int = 8000
    cors_origins: str = "*"

    @field_validator("notebooklm_home", "storage_dir", mode="before")
    @classmethod
    def _expand_user_paths(cls, value: str) -> str:
        if not value:
            return value
        return str(Path(value).expanduser())


settings = Settings()
