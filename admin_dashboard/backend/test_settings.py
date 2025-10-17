#!/usr/bin/env python3
"""
Test script to check Pydantic Settings loading
"""
import os
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
from pydantic import Field

# Load .env file
load_dotenv()

class TestSettings(BaseSettings):
    database_url: str = Field(..., env="DATABASE_URL")
    supabase_url: str = Field(..., env="SUPABASE_URL")
    secret_key: str = Field(..., env="SECRET_KEY")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": True,
        "extra": "ignore"
    }

try:
    print("=== Testing Pydantic Settings ===")
    settings = TestSettings()
    print("✅ Settings loaded successfully!")
    print(f"DATABASE_URL: {settings.database_url}")
    print(f"SUPABASE_URL: {settings.supabase_url}")
    print(f"SECRET_KEY: {settings.secret_key[:20]}...")
except Exception as e:
    print(f"❌ Error loading settings: {e}")
    print(f"Error type: {type(e)}")