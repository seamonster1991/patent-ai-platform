"""
User management API routes
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_admin
from app.models.admin import AdminUser
from app.models.user import User
from app.schemas.user import UserResponse, UserCreate, UserUpdate, UserListResponse
from app.services.user_service import UserService

router = APIRouter()


@router.get("/", response_model=UserListResponse)
async def list_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    subscription_plan: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get list of users with filtering and pagination"""
    user_service = UserService(db)
    
    users, total = user_service.list_users(
        skip=skip,
        limit=limit,
        search=search,
        role=role,
        subscription_plan=subscription_plan,
        is_active=is_active,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return UserListResponse(
        users=[UserResponse(**user) for user in users],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/statistics")
async def get_user_statistics(
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get user statistics"""
    user_service = UserService(db)
    return user_service.get_user_statistics()


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get user by ID"""
    user_service = UserService(db)
    user = user_service.get_user_by_id(user_id)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)


@router.get("/{user_id}/activity")
async def get_user_activity(
    user_id: str,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get user activity summary"""
    user_service = UserService(db)
    activity = user_service.get_user_activity_summary(user_id)
    
    if not activity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return activity


@router.post("/", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Create new user"""
    user_service = UserService(db)
    user = user_service.create_user(user_data)
    
    return UserResponse.from_orm(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Update user"""
    user_service = UserService(db)
    user = user_service.update_user(user_id, user_data)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return UserResponse.from_orm(user)


@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Delete user (soft delete)"""
    user_service = UserService(db)
    success = user_service.delete_user(user_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return {"message": "User deleted successfully"}


@router.post("/bulk-update")
async def bulk_update_users(
    user_ids: List[str],
    update_data: dict,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Bulk update users"""
    user_service = UserService(db)
    updated_count = user_service.bulk_update_users(user_ids, update_data)
    
    return {
        "message": f"Updated {updated_count} users",
        "updated_count": updated_count
    }


@router.post("/search")
async def search_users_advanced(
    filters: dict,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Advanced user search with complex filters"""
    user_service = UserService(db)
    users, total = user_service.search_users_advanced(filters, skip, limit)
    
    return UserListResponse(
        users=[UserResponse.from_orm(user) for user in users],
        total=total,
        skip=skip,
        limit=limit
    )