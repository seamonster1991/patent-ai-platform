"""
Admin service for managing admin users and authentication
"""
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from fastapi import HTTPException, status
import json

from app.models.admin import AdminUser, AdminSession, AdminLog
from app.schemas.admin import AdminUserCreate, AdminUserUpdate, AdminLogCreate
from app.core.auth import (
    get_password_hash, verify_password, generate_2fa_secret,
    verify_2fa_token, TokenManager, generate_session_token
)
from app.config import settings


class AdminService:
    """Service for admin user management"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def create_admin(self, admin_data: AdminUserCreate) -> AdminUser:
        """Create a new admin user"""
        # Check if email already exists
        existing_admin = self.db.query(AdminUser).filter(
            AdminUser.email == admin_data.email
        ).first()
        
        if existing_admin:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
        
        # Create new admin
        admin = AdminUser(
            email=admin_data.email,
            name=admin_data.name,
            role=admin_data.role,
            password_hash=get_password_hash(admin_data.password)
        )
        
        self.db.add(admin)
        self.db.commit()
        self.db.refresh(admin)
        
        return admin
    
    def authenticate_admin(
        self, 
        email: str, 
        password: str, 
        totp_code: Optional[str] = None
    ) -> Dict[str, Any]:
        """Authenticate admin user"""
        admin = self.db.query(AdminUser).filter(
            AdminUser.email == email
        ).first()
        
        if not admin or not verify_password(password, admin.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid credentials"
            )
        
        if not admin.is_active:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin account is inactive"
            )
        
        # Check 2FA if enabled
        if admin.two_fa_enabled:
            if not totp_code:
                return {
                    "requires_2fa": True,
                    "admin": admin
                }
            
            if not verify_2fa_token(admin.two_fa_secret, totp_code):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid 2FA code"
                )
        
        # Update last login
        admin.last_login_at = datetime.utcnow()
        self.db.commit()
        
        return {
            "requires_2fa": False,
            "admin": admin
        }
    
    def create_session(
        self, 
        admin: AdminUser, 
        ip_address: str, 
        user_agent: str
    ) -> AdminSession:
        """Create admin session"""
        # Generate tokens
        tokens = TokenManager.create_tokens(str(admin.id))
        session_token = generate_session_token()
        
        # Create session
        session = AdminSession(
            admin_user_id=admin.id,
            session_token=session_token,
            refresh_token=tokens["refresh_token"],
            expires_at=datetime.utcnow() + timedelta(
                minutes=settings.access_token_expire_minutes
            ),
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(session)
        self.db.commit()
        self.db.refresh(session)
        
        return session
    
    def get_admin_by_id(self, admin_id: str) -> Optional[AdminUser]:
        """Get admin by ID"""
        return self.db.query(AdminUser).filter(
            AdminUser.id == admin_id
        ).first()
    
    def get_admin_by_email(self, email: str) -> Optional[AdminUser]:
        """Get admin by email"""
        return self.db.query(AdminUser).filter(
            AdminUser.email == email
        ).first()
    
    def update_admin(
        self, 
        admin_id: str, 
        admin_data: AdminUserUpdate
    ) -> Optional[AdminUser]:
        """Update admin user"""
        admin = self.get_admin_by_id(admin_id)
        if not admin:
            return None
        
        update_data = admin_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(admin, field, value)
        
        admin.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(admin)
        
        return admin
    
    def delete_admin(self, admin_id: str) -> bool:
        """Delete admin user"""
        admin = self.get_admin_by_id(admin_id)
        if not admin:
            return False
        
        self.db.delete(admin)
        self.db.commit()
        return True
    
    def list_admins(
        self, 
        skip: int = 0, 
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Dict[str, Any]:
        """List admin users with filters"""
        query = self.db.query(AdminUser)
        
        # Apply filters
        if search:
            query = query.filter(
                or_(
                    AdminUser.name.ilike(f"%{search}%"),
                    AdminUser.email.ilike(f"%{search}%")
                )
            )
        
        if role:
            query = query.filter(AdminUser.role == role)
        
        if is_active is not None:
            query = query.filter(AdminUser.is_active == is_active)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        admins = query.offset(skip).limit(limit).all()
        
        return {
            "admins": admins,
            "total": total,
            "page": (skip // limit) + 1,
            "per_page": limit,
            "total_pages": (total + limit - 1) // limit
        }
    
    def enable_2fa(self, admin_id: str) -> str:
        """Enable 2FA for admin"""
        admin = self.get_admin_by_id(admin_id)
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Admin not found"
            )
        
        secret = generate_2fa_secret()
        admin.two_fa_secret = secret
        admin.two_fa_enabled = True
        
        self.db.commit()
        return secret
    
    def disable_2fa(self, admin_id: str) -> bool:
        """Disable 2FA for admin"""
        admin = self.get_admin_by_id(admin_id)
        if not admin:
            return False
        
        admin.two_fa_enabled = False
        admin.two_fa_secret = None
        
        self.db.commit()
        return True
    
    def log_activity(
        self, 
        admin_id: str, 
        log_data: AdminLogCreate,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AdminLog:
        """Log admin activity"""
        log = AdminLog(
            admin_user_id=admin_id,
            action=log_data.action,
            resource=log_data.resource,
            resource_id=log_data.resource_id,
            details=log_data.details,
            ip_address=ip_address,
            user_agent=user_agent
        )
        
        self.db.add(log)
        self.db.commit()
        self.db.refresh(log)
        
        return log
    
    def get_admin_logs(
        self,
        admin_id: Optional[str] = None,
        skip: int = 0,
        limit: int = 100,
        action: Optional[str] = None,
        resource: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get admin activity logs"""
        query = self.db.query(AdminLog)
        
        if admin_id:
            query = query.filter(AdminLog.admin_user_id == admin_id)
        
        if action:
            query = query.filter(AdminLog.action == action)
        
        if resource:
            query = query.filter(AdminLog.resource == resource)
        
        # Order by created_at desc
        query = query.order_by(AdminLog.created_at.desc())
        
        total = query.count()
        logs = query.offset(skip).limit(limit).all()
        
        return {
            "logs": logs,
            "total": total,
            "page": (skip // limit) + 1,
            "per_page": limit,
            "total_pages": (total + limit - 1) // limit
        }
    
    def get_active_sessions(self, admin_id: str) -> List[AdminSession]:
        """Get active sessions for admin"""
        return self.db.query(AdminSession).filter(
            and_(
                AdminSession.admin_user_id == admin_id,
                AdminSession.is_active == True,
                AdminSession.expires_at > datetime.utcnow()
            )
        ).all()
    
    def revoke_session(self, session_id: str) -> bool:
        """Revoke admin session"""
        session = self.db.query(AdminSession).filter(
            AdminSession.id == session_id
        ).first()
        
        if not session:
            return False
        
        session.is_active = False
        self.db.commit()
        return True
    
    def revoke_all_sessions(self, admin_id: str) -> int:
        """Revoke all sessions for admin"""
        count = self.db.query(AdminSession).filter(
            and_(
                AdminSession.admin_user_id == admin_id,
                AdminSession.is_active == True
            )
        ).update({"is_active": False})
        
        self.db.commit()
        return count