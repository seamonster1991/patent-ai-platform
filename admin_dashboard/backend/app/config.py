"""
Configuration settings for the Admin Dashboard API
"""
import os
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = Field(default=os.getenv("DATABASE_URL", ""))
    supabase_url: str = Field(default=os.getenv("SUPABASE_URL", ""))
    supabase_anon_key: str = Field(default=os.getenv("SUPABASE_ANON_KEY", ""))
    supabase_service_role_key: str = Field(default=os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""))
    
    # Security
    secret_key: str = Field(default=os.getenv("SECRET_KEY", ""))
    algorithm: str = Field(default=os.getenv("ALGORITHM", "HS256"))
    access_token_expire_minutes: int = Field(default=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30")))
    refresh_token_expire_days: int = Field(default=int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7")))
    
    # Redis
    redis_url: str = Field(default=os.getenv("REDIS_URL", "redis://localhost:6379/0"))
    
    # Environment
    debug: bool = Field(default=os.getenv("DEBUG", "false").lower() == "true")
    environment: str = Field(default=os.getenv("ENVIRONMENT", "production"))
    
    # CORS
    allowed_origins: str = Field(
        default=os.getenv("ALLOWED_ORIGINS", '["http://localhost:3000", "http://localhost:5173"]')
    )
    allowed_hosts: str = Field(
        default=os.getenv("ALLOWED_HOSTS", '["localhost", "127.0.0.1"]')
    )
    
    # Email
    smtp_host: str = Field(default=os.getenv("SMTP_HOST", "smtp.gmail.com"))
    smtp_port: int = Field(default=int(os.getenv("SMTP_PORT", "587")))
    smtp_username: str = Field(default=os.getenv("SMTP_USERNAME", ""))
    smtp_password: str = Field(default=os.getenv("SMTP_PASSWORD", ""))
    
    # Admin
    super_admin_email: str = Field(default=os.getenv("SUPER_ADMIN_EMAIL", ""))
    super_admin_password: str = Field(default=os.getenv("SUPER_ADMIN_PASSWORD", ""))
    
    def get_allowed_origins(self) -> List[str]:
        """Parse allowed origins from string to list"""
        import json
        try:
            return json.loads(self.allowed_origins)
        except:
            return ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
    
    def get_allowed_hosts(self) -> List[str]:
        """Parse allowed hosts from string to list"""
        import json
        try:
            return json.loads(self.allowed_hosts)
        except:
            return ["localhost", "127.0.0.1"]
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }


# Global settings instance
def get_settings():
    return Settings()

settings = get_settings()