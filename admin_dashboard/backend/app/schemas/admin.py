"""
Admin-related Pydantic schemas
"""
from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class AdminUserBase(BaseModel):
    """Base admin user schema"""
    email: EmailStr
    name: str = Field(..., min_length=1, max_length=100)
    role: str = Field(default="admin", regex="^(super_admin|admin|operator)$")


class AdminUserCreate(AdminUserBase):
    """Schema for creating admin user"""
    password: str = Field(..., min_length=8, max_length=100)


class AdminUserUpdate(BaseModel):
    """Schema for updating admin user"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    role: Optional[str] = Field(None, regex="^(super_admin|admin|operator)$")
    is_active: Optional[bool] = None
    two_fa_enabled: Optional[bool] = None


class AdminUserResponse(AdminUserBase):
    """Schema for admin user response"""
    id: UUID
    is_active: bool
    two_fa_enabled: bool
    created_at: datetime
    updated_at: Optional[datetime]
    last_login_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class AdminLoginRequest(BaseModel):
    """Schema for admin login request"""
    email: EmailStr
    password: str
    totp_code: Optional[str] = Field(None, min_length=6, max_length=6)


class TokenResponse(BaseModel):
    """Schema for token response"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class AdminLoginResponse(BaseModel):
    """Schema for admin login response"""
    admin: AdminUserResponse
    tokens: TokenResponse
    requires_2fa: bool = False


class AdminSessionResponse(BaseModel):
    """Schema for admin session response"""
    id: UUID
    admin_user_id: UUID
    ip_address: Optional[str]
    user_agent: Optional[str]
    is_active: bool
    created_at: datetime
    expires_at: datetime
    
    class Config:
        from_attributes = True


class AdminLogResponse(BaseModel):
    """Schema for admin log response"""
    id: UUID
    admin_user_id: UUID
    action: str
    resource: Optional[str]
    resource_id: Optional[str]
    details: Optional[str]
    ip_address: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


class AdminLogCreate(BaseModel):
    """Schema for creating admin log"""
    action: str
    resource: Optional[str] = None
    resource_id: Optional[str] = None
    details: Optional[str] = None