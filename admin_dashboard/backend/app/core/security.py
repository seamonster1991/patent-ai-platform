"""
Security utilities for Admin Dashboard
JWT 토큰, 비밀번호 해싱, 2FA 등 보안 기능
"""

import jwt
import pyotp
import qrcode
import io
import base64
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any, Tuple
from passlib.context import CryptContext
from fastapi import HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import secrets
import logging

from app.core.config import settings
from app.core.database import get_db, DatabaseManager

logger = logging.getLogger(__name__)

# 비밀번호 해싱 컨텍스트
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# HTTP Bearer 토큰 스키마
security = HTTPBearer()

class SecurityManager:
    """보안 관리자"""
    
    @staticmethod
    def hash_password(password: str) -> str:
        """비밀번호 해싱"""
        return pwd_context.hash(password)
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """비밀번호 검증"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
        """액세스 토큰 생성"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: Dict[str, Any]) -> str:
        """리프레시 토큰 생성"""
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        """토큰 검증"""
        try:
            payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
            return payload
        except jwt.ExpiredSignatureError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="토큰이 만료되었습니다"
            )
        except jwt.JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="유효하지 않은 토큰입니다"
            )
    
    @staticmethod
    def generate_2fa_secret() -> str:
        """2FA 시크릿 키 생성"""
        return pyotp.random_base32()
    
    @staticmethod
    def generate_2fa_qr_code(email: str, secret: str) -> str:
        """2FA QR 코드 생성"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            name=email,
            issuer_name="Patent AI Admin"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        img = qr.make_image(fill_color="black", back_color="white")
        img_buffer = io.BytesIO()
        img.save(img_buffer, format='PNG')
        img_buffer.seek(0)
        
        img_base64 = base64.b64encode(img_buffer.getvalue()).decode()
        return f"data:image/png;base64,{img_base64}"
    
    @staticmethod
    def verify_2fa_token(secret: str, token: str) -> bool:
        """2FA 토큰 검증"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    
    @staticmethod
    def generate_backup_codes(count: int = 10) -> list[str]:
        """백업 코드 생성"""
        return [secrets.token_hex(4).upper() for _ in range(count)]
    
    @staticmethod
    def generate_session_id() -> str:
        """세션 ID 생성"""
        return secrets.token_urlsafe(32)

# 보안 매니저 인스턴스
security_manager = SecurityManager()

async def get_current_admin(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DatabaseManager = Depends(get_db)
) -> Dict[str, Any]:
    """현재 관리자 정보 조회"""
    token = credentials.credentials
    payload = security_manager.verify_token(token)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="잘못된 토큰 타입입니다"
        )
    
    admin_id = payload.get("sub")
    if not admin_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰에서 사용자 ID를 찾을 수 없습니다"
        )
    
    # 관리자 정보 조회
    query = """
    SELECT au.*, ar.name as role_name, ar.permissions
    FROM admin_users au
    JOIN admin_roles ar ON au.role_id = ar.id
    WHERE au.id = $1 AND au.is_active = true
    """
    
    admin = await db.execute_one(query, admin_id)
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="관리자를 찾을 수 없거나 비활성화된 계정입니다"
        )
    
    # 세션 확인
    session_id = payload.get("session_id")
    if session_id:
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
    
    return admin

async def verify_admin_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: DatabaseManager = Depends(get_db)
) -> Dict[str, Any]:
    """관리자 토큰 검증 (별칭)"""
    return await get_current_admin(credentials, db)

def require_permission(permission: str):
    """권한 확인 데코레이터"""
    async def permission_checker(current_admin: Dict[str, Any] = Depends(get_current_admin)):
        permissions = current_admin.get("permissions", {})
        
        # 권한 체크 로직
        permission_parts = permission.split(".")
        if len(permission_parts) != 2:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="잘못된 권한 형식입니다"
            )
        
        resource, action = permission_parts
        resource_permissions = permissions.get(resource, {})
        
        if not resource_permissions.get(action, False):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"'{permission}' 권한이 없습니다"
            )
        
        return current_admin
    
    return permission_checker

async def require_super_admin(current_admin: Dict[str, Any] = Depends(get_current_admin)):
    """슈퍼 관리자 권한 확인"""
    if current_admin.get("role_name") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="슈퍼 관리자 권한이 필요합니다"
        )
    return current_admin

async def check_login_attempts(email: str, db: DatabaseManager) -> bool:
    """로그인 시도 횟수 확인"""
    query = """
    SELECT failed_login_attempts, locked_until
    FROM admin_users
    WHERE email = $1
    """
    
    result = await db.execute_one(query, email)
    if not result:
        return True
    
    # 계정 잠금 확인
    if result["locked_until"] and result["locked_until"] > datetime.now(timezone.utc):
        return False
    
    # 최대 시도 횟수 확인
    if result["failed_login_attempts"] >= settings.MAX_LOGIN_ATTEMPTS:
        return False
    
    return True

async def record_login_attempt(email: str, success: bool, db: DatabaseManager, ip_address: str = None):
    """로그인 시도 기록"""
    if success:
        # 성공 시 실패 횟수 초기화
        query = """
        UPDATE admin_users 
        SET failed_login_attempts = 0, locked_until = NULL, last_login = now()
        WHERE email = $1
        """
        await db.execute_command(query, email)
    else:
        # 실패 시 횟수 증가
        query = """
        UPDATE admin_users 
        SET failed_login_attempts = failed_login_attempts + 1,
            locked_until = CASE 
                WHEN failed_login_attempts + 1 >= $2 
                THEN now() + interval '%s minutes'
                ELSE locked_until 
            END
        WHERE email = $1
        """ % settings.LOCKOUT_DURATION_MINUTES
        
        await db.execute_command(query, email, settings.MAX_LOGIN_ATTEMPTS)
    
    # 로그인 기록 저장
    log_query = """
    INSERT INTO admin_activity_logs (admin_id, action, resource_type, details, ip_address, success)
    SELECT id, 'login_attempt', 'auth', $2, $3, $4
    FROM admin_users WHERE email = $1
    """
    
    details = {"success": success, "timestamp": datetime.now(timezone.utc).isoformat()}
    await db.execute_command(log_query, email, details, ip_address, success)