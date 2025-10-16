"""
Authentication API endpoints
관리자 인증 관련 API
"""

from fastapi import APIRouter, HTTPException, status, Depends, Request
from pydantic import BaseModel, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import logging

from app.core.database import get_db, DatabaseManager
from app.core.security import (
    security_manager, get_current_admin, check_login_attempts, 
    record_login_attempt, require_super_admin
)
from app.core.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic 모델들
class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None
    remember_me: bool = False

class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    admin: Dict[str, Any]
    requires_2fa: bool = False

class RefreshTokenRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class Setup2FAResponse(BaseModel):
    secret: str
    qr_code: str
    backup_codes: list[str]

class Verify2FARequest(BaseModel):
    totp_code: str

class ResetPasswordRequest(BaseModel):
    email: EmailStr

@router.post("/login", response_model=LoginResponse)
async def login(
    request: LoginRequest,
    http_request: Request
):
    """관리자 로그인"""
    
    # 임시 하드코딩된 관리자 계정 (데이터베이스 연결 문제 해결 후 제거 예정)
    if request.email == "admin@p-ai.co.kr" and request.password == "admin123":
        # 임시 관리자 정보
        admin_info = {
            "id": "temp-admin-id",
            "email": "admin@p-ai.co.kr",
            "name": "관리자",
            "role": "super_admin",
            "permissions": {"all": True},
            "last_login": None,
            "two_factor_enabled": False
        }
        
        # 토큰 생성
        token_data = {
            "sub": "temp-admin-id",
            "email": "admin@p-ai.co.kr",
            "role": "super_admin",
            "session_id": "temp-session"
        }
        
        access_token = security_manager.create_access_token(token_data)
        refresh_token = security_manager.create_refresh_token(token_data)
        
        return LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
            admin=admin_info,
            requires_2fa=False
        )
    
    # 잘못된 자격 증명
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="이메일 또는 비밀번호가 올바르지 않습니다"
    )


@router.post("/refresh", response_model=Dict[str, Any])
async def refresh_token(
    request: RefreshTokenRequest,
    db: DatabaseManager = Depends(get_db)
):
    """토큰 갱신"""
    
    try:
        payload = security_manager.verify_token(request.refresh_token)
        
        if payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="잘못된 토큰 타입입니다"
            )
        
        admin_id = payload.get("sub")
        session_id = payload.get("session_id")
        
        # 세션 확인
        session_query = """
        SELECT * FROM admin_sessions 
        WHERE id = $1 AND admin_id = $2 AND is_active = true AND expires_at > now()
        """
        session = await db.execute_one(session_query, session_id, admin_id)
        if not session:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="세션이 만료되었거나 유효하지 않습니다"
            )
        
        # 새 액세스 토큰 생성
        token_data = {
            "sub": admin_id,
            "email": payload.get("email"),
            "role": payload.get("role"),
            "session_id": session_id
        }
        
        new_access_token = security_manager.create_access_token(token_data)
        
        return {
            "access_token": new_access_token,
            "token_type": "bearer",
            "expires_in": settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60
        }
        
    except Exception as e:
        logger.error(f"토큰 갱신 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 갱신에 실패했습니다"
        )

@router.post("/logout")
async def logout(
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db: DatabaseManager = Depends(get_db)
):
    """로그아웃"""
    
    # 세션 비활성화
    query = """
    UPDATE admin_sessions 
    SET is_active = false, updated_at = now()
    WHERE admin_id = $1 AND is_active = true
    """
    
    await db.execute_command(query, current_admin["id"])
    
    # 로그아웃 기록
    log_query = """
    INSERT INTO admin_activity_logs (admin_id, action, resource_type, success)
    VALUES ($1, 'logout', 'auth', true)
    """
    
    await db.execute_command(log_query, current_admin["id"])
    
    return {"message": "로그아웃되었습니다"}

@router.get("/me")
async def get_current_user(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """현재 관리자 정보 조회"""
    
    admin_info = {
        "id": current_admin["id"],
        "email": current_admin["email"],
        "name": current_admin["name"],
        "role": current_admin["role_name"],
        "permissions": current_admin["permissions"],
        "last_login": current_admin.get("last_login"),
        "two_factor_enabled": current_admin["two_factor_enabled"],
        "created_at": current_admin.get("created_at"),
        "updated_at": current_admin.get("updated_at")
    }
    
    return admin_info

@router.post("/change-password")
async def change_password(
    request: ChangePasswordRequest,
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db: DatabaseManager = Depends(get_db)
):
    """비밀번호 변경"""
    
    # 현재 비밀번호 확인
    if not security_manager.verify_password(request.current_password, current_admin["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="현재 비밀번호가 올바르지 않습니다"
        )
    
    # 새 비밀번호 해싱
    new_password_hash = security_manager.hash_password(request.new_password)
    
    # 비밀번호 업데이트
    query = """
    UPDATE admin_users 
    SET password_hash = $1, password_changed_at = now(), updated_at = now()
    WHERE id = $2
    """
    
    await db.execute_command(query, new_password_hash, current_admin["id"])
    
    # 활동 로그 기록
    log_query = """
    INSERT INTO admin_activity_logs (admin_id, action, resource_type, success)
    VALUES ($1, 'change_password', 'auth', true)
    """
    
    await db.execute_command(log_query, current_admin["id"])
    
    return {"message": "비밀번호가 성공적으로 변경되었습니다"}

@router.post("/setup-2fa", response_model=Setup2FAResponse)
async def setup_2fa(
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db: DatabaseManager = Depends(get_db)
):
    """2FA 설정"""
    
    # 2FA 시크릿 생성
    secret = security_manager.generate_2fa_secret()
    qr_code = security_manager.generate_2fa_qr_code(current_admin["email"], secret)
    backup_codes = security_manager.generate_backup_codes()
    
    # 데이터베이스에 저장 (아직 활성화하지 않음)
    query = """
    UPDATE admin_users 
    SET two_factor_secret = $1, backup_codes = $2, updated_at = now()
    WHERE id = $3
    """
    
    await db.execute_command(query, secret, backup_codes, current_admin["id"])
    
    return Setup2FAResponse(
        secret=secret,
        qr_code=qr_code,
        backup_codes=backup_codes
    )

@router.post("/verify-2fa")
async def verify_2fa(
    request: Verify2FARequest,
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db: DatabaseManager = Depends(get_db)
):
    """2FA 인증 및 활성화"""
    
    # 2FA 토큰 검증
    if not security_manager.verify_2fa_token(current_admin["two_factor_secret"], request.totp_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA 코드가 올바르지 않습니다"
        )
    
    # 2FA 활성화
    query = """
    UPDATE admin_users 
    SET two_factor_enabled = true, updated_at = now()
    WHERE id = $1
    """
    
    await db.execute_command(query, current_admin["id"])
    
    # 활동 로그 기록
    log_query = """
    INSERT INTO admin_activity_logs (admin_id, action, resource_type, success)
    VALUES ($1, 'enable_2fa', 'auth', true)
    """
    
    await db.execute_command(log_query, current_admin["id"])
    
    return {"message": "2FA가 성공적으로 활성화되었습니다"}

@router.post("/disable-2fa")
async def disable_2fa(
    current_admin: Dict[str, Any] = Depends(get_current_admin),
    db: DatabaseManager = Depends(get_db)
):
    """2FA 비활성화"""
    
    # 2FA 비활성화
    query = """
    UPDATE admin_users 
    SET two_factor_enabled = false, two_factor_secret = NULL, backup_codes = '[]'::jsonb, updated_at = now()
    WHERE id = $1
    """
    
    await db.execute_command(query, current_admin["id"])
    
    # 활동 로그 기록
    log_query = """
    INSERT INTO admin_activity_logs (admin_id, action, resource_type, success)
    VALUES ($1, 'disable_2fa', 'auth', true)
    """
    
    await db.execute_command(log_query, current_admin["id"])
    
    return {"message": "2FA가 비활성화되었습니다"}