"""
Configuration settings for the Admin Dashboard API
"""
from typing import List
from pydantic_settings import BaseSettings
from pydantic import Field


class Settings(BaseSettings):
    """Application settings"""
    
    # Database
    database_url: str = Field(..., env="DATABASE_URL")
    supabase_url: str = Field(..., env="SUPABASE_URL")
    supabase_anon_key: str = Field(..., env="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(..., env="SUPABASE_SERVICE_ROLE_KEY")
    
    # Security
    secret_key: str = Field(..., env="SECRET_KEY")
    algorithm: str = Field(default="HS256", env="ALGORITHM")
    access_token_expire_minutes: int = Field(default=30, env="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(default=7, env="REFRESH_TOKEN_EXPIRE_DAYS")
    
    # Redis
    redis_url: str = Field(default="redis://localhost:6379/0", env="REDIS_URL")
    
    # Environment
    debug: bool = Field(default=False, env="DEBUG")
    environment: str = Field(default="production", env="ENVIRONMENT")
    
    # CORS
    allowed_origins: str = Field(
        default='["http://localhost:3000", "http://localhost:5173"]', 
        env="ALLOWED_ORIGINS"
    )
    allowed_hosts: str = Field(
        default='["localhost", "127.0.0.1"]', 
        env="ALLOWED_HOSTS"
    )
    
    # Email
    smtp_host: str = Field(default="smtp.gmail.com", env="SMTP_HOST")
    smtp_port: int = Field(default=587, env="SMTP_PORT")
    smtp_username: str = Field(default="", env="SMTP_USERNAME")
    smtp_password: str = Field(default="", env="SMTP_PASSWORD")
    
    # Admin
    super_admin_email: str = Field(..., env="SUPER_ADMIN_EMAIL")
    super_admin_password: str = Field(..., env="SUPER_ADMIN_PASSWORD")
    
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
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"


# Global settings instance
settings = Settings()