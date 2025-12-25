# app/core/config.py
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "Local AI Service"
    APP_VERSION: str = "1.0.0"

    DATABASE_URL: str = "sqlite:///./app.db"

    # 默认 Provider / 模型配置（全局兜底，实际配置从数据库读取）
    AI_API_BASE: str = ""
    AI_API_KEY: str = ""
    AI_MODEL: str = ""
    AI_MODELS: str = ""

    DEFAULT_SYSTEM_PROMPT: str = "You are a helpful AI assistant. Answer in Chinese."

    # Embedding 相关（从数据库 Provider 配置读取）
    EMBEDDING_MODEL: str = ""
    EMBEDDING_MODELS: str = ""

    # 搜索API配置
    TAVILY_API_KEY: str = ""

    @property
    def embedding_models(self) -> List[str]:
        if not self.EMBEDDING_MODELS:
            if self.EMBEDDING_MODEL:
                return [self.EMBEDDING_MODEL]
            return []
        return [x.strip() for x in self.EMBEDDING_MODELS.split(",") if x.strip()]

    # 知识库相关默认配置
    KNOWLEDGE_DEFAULT_KB_NAME: str = "default"
    KNOWLEDGE_DEFAULT_KB_DESCRIPTION: str = "Default knowledge base"

    @property
    def ai_models(self) -> List[str]:
        if not self.AI_MODELS:
            if self.AI_MODEL:
                return [self.AI_MODEL]
            return []
        return [x.strip() for x in self.AI_MODELS.split(",") if x.strip()]


settings = Settings()
