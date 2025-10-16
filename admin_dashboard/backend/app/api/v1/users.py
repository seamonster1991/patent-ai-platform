"""
User Management API endpoints
사용자 관리 API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, EmailStr
from typing import List, Dict, Any, Optional
from datetime import datetime
import logging

from app.core.database import get_db, DatabaseManager
from app.core.security import get_current_admin, require_permission

logger = logging.getLogger(__name__)
router = APIRouter()

# 테스트 엔드포인트 (인증 없음)
@router.get("/test")
async def test_endpoint():
    """테스트 엔드포인트 - 인증 없음"""
    return {"message": "테스트 성공", "status": "ok"}

# Pydantic 모델들
class UserResponse(BaseModel):
    id: str
    email: str
    name: Optional[str]
    status: str
    role: str
    created_at: datetime
    last_login: Optional[datetime]
    point_balance: int
    total_searches: int
    total_payments: float

class UserStats(BaseModel):
    total_users: int
    active_users: int
    inactive_users: int
    premium_users: int
    new_users_today: int
    new_users_this_week: int
    new_users_this_month: int

class UserListResponse(BaseModel):
    users: List[UserResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    status: Optional[str] = None
    role: Optional[str] = None

class UserDeleteResponse(BaseModel):
    success: bool
    message: str

@router.get("/stats", response_model=UserStats)
async def get_user_stats(
    current_admin: Dict[str, Any] = Depends(require_permission("users.read")),
    db: DatabaseManager = Depends(get_db)
):
    """사용자 통계 조회"""
    
    try:
        # 총 사용자 수
        total_users_query = "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL"
        total_users_result = await db.execute_one(total_users_query)
        total_users = total_users_result["count"] if total_users_result else 0
        
        # 활성 사용자 수 (최근 30일 내 로그인)
        active_users_query = """
        SELECT COUNT(*) as count FROM users 
        WHERE last_login >= now() - interval '30 days' 
        AND deleted_at IS NULL
        """
        active_users_result = await db.execute_one(active_users_query)
        active_users = active_users_result["count"] if active_users_result else 0
        
        # 비활성 사용자 수
        inactive_users = total_users - active_users
        
        # 프리미엄 사용자 수 (role이 premium인 사용자)
        premium_users_query = """
        SELECT COUNT(*) as count FROM users 
        WHERE role = 'premium' AND deleted_at IS NULL
        """
        premium_users_result = await db.execute_one(premium_users_query)
        premium_users = premium_users_result["count"] if premium_users_result else 0
        
        # 오늘 신규 사용자
        new_users_today_query = """
        SELECT COUNT(*) as count FROM users 
        WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL
        """
        new_users_today_result = await db.execute_one(new_users_today_query)
        new_users_today = new_users_today_result["count"] if new_users_today_result else 0
        
        # 이번 주 신규 사용자
        new_users_week_query = """
        SELECT COUNT(*) as count FROM users 
        WHERE created_at >= date_trunc('week', CURRENT_DATE) AND deleted_at IS NULL
        """
        new_users_week_result = await db.execute_one(new_users_week_query)
        new_users_this_week = new_users_week_result["count"] if new_users_week_result else 0
        
        # 이번 달 신규 사용자
        new_users_month_query = """
        SELECT COUNT(*) as count FROM users 
        WHERE created_at >= date_trunc('month', CURRENT_DATE) AND deleted_at IS NULL
        """
        new_users_month_result = await db.execute_one(new_users_month_query)
        new_users_this_month = new_users_month_result["count"] if new_users_month_result else 0
        
        return UserStats(
            total_users=total_users,
            active_users=active_users,
            inactive_users=inactive_users,
            premium_users=premium_users,
            new_users_today=new_users_today,
            new_users_this_week=new_users_this_week,
            new_users_this_month=new_users_this_month
        )
        
    except Exception as e:
        logger.error(f"사용자 통계 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 통계를 가져오는 중 오류가 발생했습니다"
        )

@router.get("", response_model=UserListResponse)
async def get_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    current_admin: Dict[str, Any] = Depends(require_permission("users.read")),
    db: DatabaseManager = Depends(get_db)
):
    """사용자 목록 조회"""
    
    try:
        # 기본 쿼리
        base_query = """
        SELECT 
            u.id,
            u.email,
            u.name,
            u.status,
            u.role,
            u.created_at,
            u.last_login,
            COALESCE(upb.balance, 0) as point_balance,
            COALESCE(search_count.total, 0) as total_searches,
            COALESCE(payment_sum.total, 0) as total_payments,
            CASE 
                WHEN payment_sum.total > 0 THEN 'paid'
                ELSE 'free'
            END as subscription_type,
            payment_latest.last_payment_date
        FROM users u
        LEFT JOIN user_point_balances upb ON u.id = upb.user_id
        LEFT JOIN (
            SELECT user_id, COUNT(*) as total 
            FROM search_history 
            GROUP BY user_id
        ) search_count ON u.id = search_count.user_id
        LEFT JOIN (
            SELECT user_id, SUM(amount) as total 
            FROM payment_transactions 
            WHERE status = 'completed'
            GROUP BY user_id
        ) payment_sum ON u.id = payment_sum.user_id
        LEFT JOIN (
            SELECT user_id, MAX(created_at) as last_payment_date
            FROM payment_transactions 
            WHERE status = 'completed'
            GROUP BY user_id
        ) payment_latest ON u.id = payment_latest.user_id
        WHERE u.deleted_at IS NULL
        """
        
        # 필터 조건 추가
        conditions = []
        params = []
        param_count = 0
        
        if search:
            param_count += 1
            conditions.append(f"(u.email ILIKE ${param_count} OR u.name ILIKE ${param_count})")
            params.append(f"%{search}%")
        
        if status:
            param_count += 1
            conditions.append(f"u.status = ${param_count}")
            params.append(status)
        
        if role:
            param_count += 1
            conditions.append(f"u.role = ${param_count}")
            params.append(role)
        
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        # 정렬 추가
        sort_column = "u.created_at"
        if sort_by == "email":
            sort_column = "u.email"
        elif sort_by == "name":
            sort_column = "u.name"
        elif sort_by == "status":
            sort_column = "u.status"
        elif sort_by == "role":
            sort_column = "u.role"
        
        base_query += f" ORDER BY {sort_column} {sort_order.upper()}"
        
        # 총 개수 조회
        count_query = f"""
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.deleted_at IS NULL
        """
        
        if conditions:
            count_query += " AND " + " AND ".join(conditions)
        
        total_result = await db.execute_one(count_query, *params)
        total = total_result["total"] if total_result else 0
        
        # 페이징 추가
        offset = (page - 1) * per_page
        param_count += 1
        base_query += f" LIMIT ${param_count}"
        params.append(per_page)
        
        param_count += 1
        base_query += f" OFFSET ${param_count}"
        params.append(offset)
        
        # 사용자 데이터 조회
        users_data = await db.execute_query(base_query, *params)
        
        users = [
            UserResponse(
                id=str(user["id"]),
                email=user["email"],
                name=user["name"] or "",
                status=user["status"] or "active",
                role=user["role"] or "user",
                created_at=user["created_at"],
                last_login=user["last_login"],
                point_balance=int(user["point_balance"]),
                total_searches=int(user["total_searches"]),
                total_payments=float(user["total_payments"])
            )
            for user in users_data
        ]
        
        total_pages = (total + per_page - 1) // per_page
        
        return UserListResponse(
            users=users,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"사용자 목록 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 목록을 가져오는 중 오류가 발생했습니다"
        )

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission("users.read")),
    db: DatabaseManager = Depends(get_db)
):
    """특정 사용자 상세 조회"""
    
    try:
        query = """
        SELECT 
            u.id,
            u.email,
            u.name,
            u.status,
            u.role,
            u.created_at,
            u.last_login,
            COALESCE(upb.balance, 0) as point_balance,
            COALESCE(search_count.total, 0) as total_searches,
            COALESCE(payment_sum.total, 0) as total_payments
        FROM users u
        LEFT JOIN user_point_balances upb ON u.id = upb.user_id
        LEFT JOIN (
            SELECT user_id, COUNT(*) as total 
            FROM search_history 
            WHERE user_id = $1
            GROUP BY user_id
        ) search_count ON u.id = search_count.user_id
        LEFT JOIN (
            SELECT user_id, SUM(amount) as total 
            FROM payment_transactions 
            WHERE user_id = $1 AND status = 'completed'
            GROUP BY user_id
        ) payment_sum ON u.id = payment_sum.user_id
        WHERE u.id = $1 AND u.deleted_at IS NULL
        """
        
        user_data = await db.execute_one(query, user_id)
        
        if not user_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        return UserResponse(
            id=str(user_data["id"]),
            email=user_data["email"],
            name=user_data["name"],
            status=user_data["status"],
            role=user_data["role"],
            created_at=user_data["created_at"],
            last_login=user_data["last_login"],
            point_balance=user_data["point_balance"],
            total_searches=user_data["total_searches"],
            total_payments=float(user_data["total_payments"]) if user_data["total_payments"] else 0.0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 상세 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 정보를 가져오는 중 오류가 발생했습니다"
        )

@router.put("/{user_id}")
async def update_user(
    user_id: str,
    request: UserUpdateRequest,
    current_admin: Dict[str, Any] = Depends(require_permission("users.write")),
    db: DatabaseManager = Depends(get_db)
):
    """사용자 정보 수정"""
    
    try:
        # 사용자 존재 확인
        user_check_query = "SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL"
        user_exists = await db.execute_one(user_check_query, user_id)
        
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        # 업데이트할 필드 준비
        update_fields = []
        params = []
        param_count = 0
        
        if request.name is not None:
            param_count += 1
            update_fields.append(f"name = ${param_count}")
            params.append(request.name)
        
        if request.status is not None:
            param_count += 1
            update_fields.append(f"status = ${param_count}")
            params.append(request.status)
        
        if request.role is not None:
            param_count += 1
            update_fields.append(f"role = ${param_count}")
            params.append(request.role)
        
        if not update_fields:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="업데이트할 필드가 없습니다"
            )
        
        # 업데이트 쿼리 실행
        param_count += 1
        update_fields.append(f"updated_at = now()")
        update_query = f"""
        UPDATE users 
        SET {', '.join(update_fields)}
        WHERE id = ${param_count}
        """
        params.append(user_id)
        
        await db.execute_command(update_query, *params)
        
        # 활동 로그 기록
        log_query = """
        INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, details, success)
        VALUES ($1, 'update_user', 'user', $2, $3, true)
        """
        
        details = {
            "updated_fields": {k: v for k, v in request.dict().items() if v is not None},
            "admin_email": current_admin["email"]
        }
        
        await db.execute_command(log_query, current_admin["id"], user_id, details)
        
        return {"message": "사용자 정보가 성공적으로 업데이트되었습니다"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 정보 수정 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 정보 수정 중 오류가 발생했습니다"
        )

@router.post("/{user_id}/activate")
async def activate_user(
    user_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission("users.write")),
    db: DatabaseManager = Depends(get_db)
):
    """사용자 활성화"""
    
    try:
        query = """
        UPDATE users 
        SET status = 'active', updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        """
        
        result = await db.execute_command(query, user_id)
        
        if "UPDATE 0" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        # 활동 로그 기록
        log_query = """
        INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, success)
        VALUES ($1, 'activate_user', 'user', $2, true)
        """
        
        await db.execute_command(log_query, current_admin["id"], user_id)
        
        return {"message": "사용자가 활성화되었습니다"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 활성화 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 활성화 중 오류가 발생했습니다"
        )

@router.post("/{user_id}/suspend")
async def suspend_user(
    user_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission("users.write")),
    db: DatabaseManager = Depends(get_db)
):
    """사용자 정지"""
    
    try:
        query = """
        UPDATE users 
        SET status = 'suspended', updated_at = now()
        WHERE id = $1 AND deleted_at IS NULL
        """
        
        result = await db.execute_command(query, user_id)
        
        if "UPDATE 0" in result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        # 활동 로그 기록
        log_query = """
        INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, success)
        VALUES ($1, 'suspend_user', 'user', $2, true)
        """
        
        await db.execute_command(log_query, current_admin["id"], user_id)
        
        return {"message": "사용자가 정지되었습니다"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 정지 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 정지 중 오류가 발생했습니다"
        )

@router.delete("/{user_id}")
async def delete_user(
    user_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission("users.delete")),
    db: DatabaseManager = Depends(get_db)
):
    """사용자 삭제 (안전한 소프트 삭제)"""
    
    try:
        # 데이터베이스 함수를 사용한 안전한 삭제
        delete_query = "SELECT safe_delete_user($1) as result"
        result = await db.execute_one(delete_query, user_id)
        
        if not result or not result["result"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없거나 이미 삭제된 사용자입니다"
            )
        
        # 활동 로그 기록
        log_query = """
        INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, details, success)
        VALUES ($1, 'safe_delete_user', 'user', $2, $3, true)
        """
        
        details = {
            "admin_email": current_admin["email"],
            "deletion_type": "soft_delete"
        }
        
        await db.execute_command(log_query, current_admin["id"], user_id, details)
        
        return UserDeleteResponse(
            success=True,
            message="사용자가 안전하게 삭제되었습니다. 필요시 복원할 수 있습니다."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 안전 삭제 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 삭제 중 오류가 발생했습니다"
        )

@router.post("/{user_id}/restore")
async def restore_user(
    user_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission("users.write")),
    db: DatabaseManager = Depends(get_db)
):
    """삭제된 사용자 복원"""
    
    try:
        # 데이터베이스 함수를 사용한 사용자 복원
        restore_query = "SELECT restore_deleted_user($1) as result"
        result = await db.execute_one(restore_query, user_id)
        
        if not result or not result["result"]:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="삭제된 사용자를 찾을 수 없거나 이미 활성 상태입니다"
            )
        
        # 활동 로그 기록
        log_query = """
        INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, details, success)
        VALUES ($1, 'restore_user', 'user', $2, $3, true)
        """
        
        details = {
            "admin_email": current_admin["email"],
            "restoration_type": "soft_restore"
        }
        
        await db.execute_command(log_query, current_admin["id"], user_id, details)
        
        return UserDeleteResponse(
            success=True,
            message="사용자가 성공적으로 복원되었습니다."
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 복원 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 복원 중 오류가 발생했습니다"
        )

@router.get("/deleted", response_model=UserListResponse)
async def get_deleted_users(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    current_admin: Dict[str, Any] = Depends(require_permission("users.read")),
    db: DatabaseManager = Depends(get_db)
):
    """삭제된 사용자 목록 조회"""
    
    try:
        # 기본 쿼리 (삭제된 사용자만)
        base_query = """
        SELECT 
            u.id,
            u.email,
            u.name,
            u.status,
            u.role,
            u.created_at,
            u.last_login,
            u.deleted_at,
            COALESCE(upb.balance, 0) as point_balance,
            COALESCE(search_count.total, 0) as total_searches,
            COALESCE(payment_sum.total, 0) as total_payments,
            CASE 
                WHEN payment_sum.total > 0 THEN 'paid'
                ELSE 'free'
            END as subscription_type,
            payment_latest.last_payment_date
        FROM users u
        LEFT JOIN user_point_balances upb ON u.id = upb.user_id
        LEFT JOIN (
            SELECT user_id, COUNT(*) as total 
            FROM search_history 
            GROUP BY user_id
        ) search_count ON u.id = search_count.user_id
        LEFT JOIN (
            SELECT user_id, SUM(amount) as total 
            FROM payment_transactions 
            WHERE status = 'completed'
            GROUP BY user_id
        ) payment_sum ON u.id = payment_sum.user_id
        LEFT JOIN (
            SELECT user_id, MAX(created_at) as last_payment_date
            FROM payment_transactions 
            WHERE status = 'completed'
            GROUP BY user_id
        ) payment_latest ON u.id = payment_latest.user_id
        WHERE u.deleted_at IS NOT NULL
        """
        
        # 검색 조건 추가
        conditions = []
        params = []
        param_count = 0
        
        if search:
            param_count += 1
            conditions.append(f"(u.email ILIKE ${param_count} OR u.name ILIKE ${param_count})")
            params.append(f"%{search}%")
        
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        # 정렬 추가 (삭제일 기준 내림차순)
        base_query += " ORDER BY u.deleted_at DESC"
        
        # 총 개수 조회
        count_query = f"""
        SELECT COUNT(*) as total
        FROM users u
        WHERE u.deleted_at IS NOT NULL
        """
        
        if conditions:
            count_query += " AND " + " AND ".join(conditions)
        
        total_result = await db.execute_one(count_query, *params)
        total = total_result["total"] if total_result else 0
        
        # 페이징 추가
        offset = (page - 1) * per_page
        param_count += 1
        base_query += f" LIMIT ${param_count}"
        params.append(per_page)
        
        param_count += 1
        base_query += f" OFFSET ${param_count}"
        params.append(offset)
        
        # 삭제된 사용자 데이터 조회
        users_data = await db.execute_query(base_query, *params)
        
        users = [
            UserResponse(
                id=str(user["id"]),
                email=user["email"],
                name=user["name"] or "",
                status="deleted",  # 삭제된 상태로 표시
                role=user["role"] or "user",
                created_at=user["created_at"],
                last_login=user["last_login"],
                point_balance=int(user["point_balance"]),
                total_searches=int(user["total_searches"]),
                total_payments=float(user["total_payments"])
            )
            for user in users_data
        ]
        
        total_pages = (total + per_page - 1) // per_page
        
        return UserListResponse(
            users=users,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"삭제된 사용자 목록 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="삭제된 사용자 목록을 가져오는 중 오류가 발생했습니다"
        )

@router.get("/{user_id}/activities")
async def get_user_activities(
    user_id: str,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    current_admin: Dict[str, Any] = Depends(require_permission("users.read")),
    db: DatabaseManager = Depends(get_db)
):
    """사용자 활동 이력 조회"""
    
    try:
        # 사용자 존재 확인
        user_check_query = "SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL"
        user_exists = await db.execute_one(user_check_query, user_id)
        
        if not user_exists:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="사용자를 찾을 수 없습니다"
            )
        
        # 활동 이력 조회
        offset = (page - 1) * per_page
        
        activities_query = """
        SELECT 
            activity_type,
            details,
            created_at
        FROM user_activities
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
        """
        
        activities = await db.execute_query(activities_query, user_id, per_page, offset)
        
        # 총 개수 조회
        count_query = "SELECT COUNT(*) as total FROM user_activities WHERE user_id = $1"
        total_result = await db.execute_one(count_query, user_id)
        total = total_result["total"] if total_result else 0
        
        total_pages = (total + per_page - 1) // per_page
        
        return {
            "activities": activities,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"사용자 활동 이력 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 활동 이력을 가져오는 중 오류가 발생했습니다"
        )