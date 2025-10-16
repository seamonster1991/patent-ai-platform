"""
Authentication API routes
"""
from typing import Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.admin import (
    AdminLoginRequest, AdminLoginResponse, TokenResponse,
    AdminUserResponse, AdminUserCreate
)
from app.services.admin_service import AdminService
from app.core.auth import TokenManager, generate_2fa_qr_url
from app.core.security import get_client_ip, get_user_agent
from app.dependencies import get_current_admin

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=AdminLoginResponse)
async def login(
    request: Request,
    login_data: AdminLoginRequest,
    db: Session = Depends(get_db)
):
    """Admin login endpoint - Simplified for testing"""
    
    # Temporary hardcoded admin credentials for testing
    if login_data.email == "admin@p-ai.co.kr" and login_data.password == "admin123":
        # Create mock admin user
        mock_admin = {
            "id": "temp-admin-id",
            "email": "admin@p-ai.co.kr",
            "name": "System Administrator",
            "role": "super_admin",
            "permissions": {"all": True},
            "is_active": True,
            "last_login_at": None,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z"
        }
        
        # Create mock tokens
        mock_tokens = {
            "access_token": "mock-access-token-for-testing",
            "refresh_token": "mock-refresh-token-for-testing",
            "expires_in": 3600
        }
        
        return AdminLoginResponse(
            admin=mock_admin,
            tokens=TokenResponse(**mock_tokens),
            requires_2fa=False
        )
    
    # Invalid credentials
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password"
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    """Refresh access token"""
    tokens = TokenManager.refresh_access_token(refresh_token)
    
    if not tokens:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    return TokenResponse(**tokens)


@router.post("/logout")
async def logout(
    request: Request,
    current_admin: AdminUserResponse = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin logout endpoint"""
    admin_service = AdminService(db)
    
    # Get client info
    ip_address = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Revoke all sessions for this admin
    revoked_count = admin_service.revoke_all_sessions(str(current_admin.id))
    
    # Log logout activity
    admin_service.log_activity(
        admin_id=str(current_admin.id),
        log_data={"action": "logout", "resource": "auth"},
        ip_address=ip_address,
        user_agent=user_agent
    )
    
    return {"message": f"Logged out successfully. {revoked_count} sessions revoked."}


@router.post("/enable-2fa")
async def enable_2fa(
    current_admin: AdminUserResponse = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Enable 2FA for current admin"""
    admin_service = AdminService(db)
    
    secret = admin_service.enable_2fa(str(current_admin.id))
    qr_url = generate_2fa_qr_url(secret, current_admin.email)
    
    # Log 2FA enable activity
    admin_service.log_activity(
        admin_id=str(current_admin.id),
        log_data={"action": "enable_2fa", "resource": "auth"}
    )
    
    return {
        "secret": secret,
        "qr_url": qr_url,
        "message": "2FA enabled successfully"
    }


@router.post("/disable-2fa")
async def disable_2fa(
    current_admin: AdminUserResponse = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Disable 2FA for current admin"""
    admin_service = AdminService(db)
    
    success = admin_service.disable_2fa(str(current_admin.id))
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )
    
    # Log 2FA disable activity
    admin_service.log_activity(
        admin_id=str(current_admin.id),
        log_data={"action": "disable_2fa", "resource": "auth"}
    )
    
    return {"message": "2FA disabled successfully"}


@router.get("/me", response_model=AdminUserResponse)
async def get_current_admin_info(
    current_admin: AdminUserResponse = Depends(get_current_admin)
):
    """Get current admin information"""
    return current_admin


@router.get("/sessions")
async def get_active_sessions(
    current_admin: AdminUserResponse = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Get active sessions for current admin"""
    admin_service = AdminService(db)
    sessions = admin_service.get_active_sessions(str(current_admin.id))
    
    return {
        "sessions": [
            {
                "id": str(session.id),
                "ip_address": session.ip_address,
                "user_agent": session.user_agent,
                "created_at": session.created_at,
                "expires_at": session.expires_at
            }
            for session in sessions
        ]
    }


@router.delete("/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    current_admin: AdminUserResponse = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Revoke a specific session"""
    admin_service = AdminService(db)
    
    success = admin_service.revoke_session(session_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Log session revoke activity
    admin_service.log_activity(
        admin_id=str(current_admin.id),
        log_data={
            "action": "revoke_session", 
            "resource": "auth",
            "resource_id": session_id
        }
    )
    
    return {"message": "Session revoked successfully"}