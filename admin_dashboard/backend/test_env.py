#!/usr/bin/env python3
"""
Test script to check environment variable loading
"""
import os
from dotenv import load_dotenv

# Load .env file
load_dotenv()

print("=== Environment Variables Test ===")
print(f"DATABASE_URL: {os.getenv('DATABASE_URL', 'NOT FOUND')}")
print(f"SUPABASE_URL: {os.getenv('SUPABASE_URL', 'NOT FOUND')}")
print(f"SUPABASE_ANON_KEY: {os.getenv('SUPABASE_ANON_KEY', 'NOT FOUND')}")
print(f"SUPABASE_SERVICE_ROLE_KEY: {os.getenv('SUPABASE_SERVICE_ROLE_KEY', 'NOT FOUND')}")
print(f"SECRET_KEY: {os.getenv('SECRET_KEY', 'NOT FOUND')}")
print(f"SUPER_ADMIN_EMAIL: {os.getenv('SUPER_ADMIN_EMAIL', 'NOT FOUND')}")
print(f"SUPER_ADMIN_PASSWORD: {os.getenv('SUPER_ADMIN_PASSWORD', 'NOT FOUND')}")

print("\n=== All Environment Variables ===")
for key, value in os.environ.items():
    if any(keyword in key.upper() for keyword in ['DATABASE', 'SUPABASE', 'SECRET', 'ADMIN']):
        print(f"{key}: {value}")