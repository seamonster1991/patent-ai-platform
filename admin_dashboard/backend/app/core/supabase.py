"""
Supabase client configuration and utilities
"""
from supabase import create_client, Client
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

# Supabase client instance
supabase: Client = None

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    global supabase
    if supabase is None:
        try:
            supabase = create_client(
                settings.supabase_url,
                settings.supabase_service_role_key
            )
            logger.info("Supabase client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    return supabase

def test_supabase_connection() -> bool:
    """Test Supabase connection"""
    try:
        client = get_supabase_client()
        # Test connection by querying a simple table
        result = client.table('users').select('id').limit(1).execute()
        logger.info("Supabase connection test successful")
        return True
    except Exception as e:
        logger.error(f"Supabase connection test failed: {e}")
        return False