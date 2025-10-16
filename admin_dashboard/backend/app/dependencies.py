"""
FastAPI dependencies for authentication and authorization
"""
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt

from app.database import get_db
from app.config import settings
from app.models.admin import AdminUser
from app.core.auth import verify_token

security = HTTPBearer()


async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> AdminUser:
    """Get current authenticated admin user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(
            credentials.credentials, 
            settings.secret_key, 
            algorithms=[settings.algorithm]
        )
        admin_id: str = payload.get("sub")
        if admin_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
    if admin is None:
        raise credentials_exception
    
    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    
    return admin


async def get_current_active_admin(
    current_admin: AdminUser = Depends(get_current_admin)
) -> AdminUser:
    """Get current active admin user"""
    if not current_admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is inactive"
        )
    return current_admin


async def require_super_admin(
    current_admin: AdminUser = Depends(get_current_active_admin)
) -> AdminUser:
    """Require super admin role"""
    if current_admin.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required"
        )
    return current_admin


async def require_admin_or_super_admin(
    current_admin: AdminUser = Depends(get_current_active_admin)
) -> AdminUser:
    """Require admin or super admin role"""
    if current_admin.role not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_admin


async def get_current_active_admin_ws(
    admin_id: str,
    db: Session
) -> Optional[AdminUser]:
    """Get current active admin user for WebSocket connections"""
    try:
        admin = db.query(AdminUser).filter(AdminUser.id == admin_id).first()
        if admin and admin.is_active:
            return admin
        return None
    except Exception:
        return None