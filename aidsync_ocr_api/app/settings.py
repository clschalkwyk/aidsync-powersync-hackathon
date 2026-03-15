from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )

    app_name: str = "AidSync OCR API"
    app_env: str = Field(default="development")
    max_image_mb: int = Field(default=12)
    max_dimension: int = Field(default=2400)
    tesseract_lang: str = Field(default="eng")
    request_timeout_seconds: int = Field(default=20)
    ocr_api_key: str | None = Field(default=None)
    db_url: str | None = Field(default=None, alias='DB_URL')
    db_ping_timeout_seconds: int = Field(default=5)


settings = Settings()
