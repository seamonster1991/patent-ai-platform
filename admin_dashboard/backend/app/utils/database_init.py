"""
Database initialization utilities
"""
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.admin import AdminUser
from app.core.auth import get_password_hash
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)


def create_tables():
    """Create all database tables"""
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {e}")
        raise


def create_super_admin():
    """Create initial super admin user"""
    db = SessionLocal()
    try:
        # Check if super admin already exists
        existing_admin = db.query(AdminUser).filter(
            AdminUser.email == settings.super_admin_email
        ).first()
        
        if existing_admin:
            logger.info("Super admin already exists")
            return existing_admin
        
        # Create super admin
        super_admin = AdminUser(
            email=settings.super_admin_email,
            name="Super Administrator",
            role="super_admin",
            password_hash=get_password_hash(settings.super_admin_password),
            is_active=True
        )
        
        db.add(super_admin)
        db.commit()
        db.refresh(super_admin)
        
        logger.info(f"Super admin created: {settings.super_admin_email}")
        return super_admin
        
    except Exception as e:
        logger.error(f"Error creating super admin: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def init_database():
    """Initialize database with tables and super admin"""
    logger.info("Initializing database...")
    
    # Create tables
    create_tables()
    
    # Create super admin
    create_super_admin()
    
    logger.info("Database initialization completed")


if __name__ == "__main__":
    init_database()