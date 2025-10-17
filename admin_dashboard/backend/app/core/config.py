"""
Configuration settings for Admin Dashboard Backend
환경 변수 및 설정 관리
"""

from pydantic_settings import BaseSettings
from typing import List, Optional
import os
from pathlib import Path

class Settings(BaseSettings):
    """애플리케이션 설정"""
    
    # 기본 설정
    PROJECT_NAME: str = "Patent AI Admin Dashboard"
    VERSION: str = "1.0.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    HOST: str = "127.0.0.1"
    PORT: int = 8001
    
    # Supabase 설정
    SUPABASE_URL: str
    SUPABASE_ANON_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: str
    
    # JWT 설정
    JWT_SECRET_KEY: str = "your-secret-key-here"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # 관리자 기본 설정
    ADMIN_DEFAULT_PASSWORD: str = "admin123!"
    SUPER_ADMIN_EMAIL: str = "admin@patent-ai.com"
    SUPER_ADMIN_PASSWORD: str = "admin123"
    SECRET_KEY: str = "your-secret-key-here"
    
    # Redis 설정 (선택사항)
    REDIS_URL: Optional[str] = None
    
    # 데이터베이스 설정
    DATABASE_URL: str
    
    # CORS 설정
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:5174"
    
    @property
    def cors_origins_list(self) -> List[str]:
        """CORS origins를 리스트로 반환"""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",")]
    
    # 보안 설정
    MAX_LOGIN_ATTEMPTS: int = 5
    LOCKOUT_DURATION_MINUTES: int = 30
    SESSION_TIMEOUT_MINUTES: int = 60
    ENABLE_2FA: bool = False
    
    # 모니터링 설정
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    
    # WebSocket 설정
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30
    
    # 로깅 설정
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_FILE_PATH: str = "logs/admin_dashboard.log"
    LOG_MAX_SIZE_MB: int = 10
    LOG_BACKUP_COUNT: int = 5
    
    # 파일 업로드 설정
    MAX_FILE_SIZE_MB: int = 10
    ALLOWED_FILE_TYPES: str = "jpg,jpeg,png,gif,pdf,doc,docx,xls,xlsx"
    
    @property
    def allowed_file_types_list(self) -> List[str]:
        """환경변수에서 읽은 문자열을 리스트로 변환"""
        return [ext.strip() for ext in self.ALLOWED_FILE_TYPES.split(",")]
    
    @property
    def max_file_size(self) -> int:
        """MB를 바이트로 변환"""
        return self.MAX_FILE_SIZE_MB * 1024 * 1024
    
    # 이메일 설정 (선택사항)
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_USE_TLS: bool = True
    FROM_EMAIL: Optional[str] = None
    
    # 백업 설정
    BACKUP_ENABLED: bool = False
    BACKUP_SCHEDULE: str = "0 2 * * *"  # 매일 새벽 2시
    BACKUP_RETENTION_DAYS: int = 30
    BACKUP_STORAGE_PATH: str = "backups/"
    
    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "case_sensitive": True
    }

# 설정 인스턴스 생성
settings = Settings()

# 개발 환경에서 디버그 정보 출력
if settings.DEBUG:
    print(f"🔧 Environment: {settings.ENVIRONMENT}")
    print(f"🔧 Debug Mode: {settings.DEBUG}")
    print(f"🔧 Host: {settings.HOST}:{settings.PORT}")
    print(f"🔧 Database: {settings.DATABASE_URL[:50]}...")
    print(f"🔧 CORS Origins: {settings.CORS_ORIGINS}")