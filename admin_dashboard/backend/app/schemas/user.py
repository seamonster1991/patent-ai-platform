"""
User-related Pydantic schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID


class UserBase(BaseModel):
    """Base user schema"""
    email: EmailStr
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    company: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=50)


class UserCreate(UserBase):
    """Schema for creating user"""
    password: Optional[str] = Field(None, min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """Schema for updating user"""
    name: Optional[str] = Field(None, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    subscription_status: Optional[str] = Field(None, regex="^(free|premium|enterprise)$")
    company: Optional[str] = Field(None, max_length=100)
    job_title: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=50)


class UserResponse(UserBase):
    """Schema for user response"""
    id: UUID
    is_active: bool
    is_verified: bool
    subscription_status: str
    subscription_expires_at: Optional[datetime]
    total_usage: int
    monthly_usage: int
    created_at: datetime
    updated_at: Optional[datetime]
    last_login_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Schema for user list response"""
    users: list[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class UserStatsResponse(BaseModel):
    """Schema for user statistics response"""
    total_users: int
    active_users: int
    verified_users: int
    premium_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int