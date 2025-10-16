"""
Payment Management API endpoints
결제 관리 API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, date
from decimal import Decimal
import logging

from app.core.database import get_db, DatabaseManager
from app.core.security import get_current_admin, require_permission

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic 모델들
class PaymentResponse(BaseModel):
    id: str
    user_id: str
    user_email: str
    amount: float
    currency: str
    status: str
    payment_method: str
    transaction_id: Optional[str]
    created_at: datetime
    completed_at: Optional[datetime]
    refunded_at: Optional[datetime]
    refund_amount: Optional[float]

class PaymentStats(BaseModel):
    total_revenue: float
    total_transactions: int
    successful_transactions: int
    failed_transactions: int
    refunded_transactions: int
    pending_transactions: int
    average_transaction_amount: float
    revenue_today: float
    revenue_this_week: float
    revenue_this_month: float

class PaymentListResponse(BaseModel):
    payments: List[PaymentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class RefundRequest(BaseModel):
    reason: str
    amount: Optional[float] = None  # 부분 환불용

class RevenueMetrics(BaseModel):
    date: date
    revenue: float
    transaction_count: int

# 테스트 엔드포인트 (인증 없음)
@router.get("/stats", response_model=PaymentStats)
async def get_payment_stats():
    """결제 통계 조회 (테스트용 데이터)"""
    
    return PaymentStats(
        total_revenue=125000.50,
        total_transactions=450,
        successful_transactions=420,
        failed_transactions=25,
        refunded_transactions=5,
        pending_transactions=10,
        average_transaction_amount=278.89,
        revenue_today=3500.00,
        revenue_this_week=18750.25,
        revenue_this_month=45200.75
    )

# 테스트 엔드포인트 (인증 없음)
@router.get("", response_model=PaymentListResponse)
async def get_payments(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status_filter: Optional[str] = Query(None, alias="status"),
    user_email: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", regex="^(asc|desc)$")
):
    """결제 목록 조회 (테스트용 데이터)"""
    
    # 테스트용 결제 데이터
    test_payments = [
        PaymentResponse(
            id="pay_001",
            user_id="user_001",
            user_email="user1@example.com",
            amount=29.99,
            currency="USD",
            status="completed",
            payment_method="credit_card",
            transaction_id="txn_001",
            created_at=datetime.now(),
            completed_at=datetime.now(),
            refunded_at=None,
            refund_amount=None
        ),
        PaymentResponse(
            id="pay_002",
            user_id="user_002",
            user_email="user2@example.com",
            amount=49.99,
            currency="USD",
            status="pending",
            payment_method="paypal",
            transaction_id="txn_002",
            created_at=datetime.now(),
            completed_at=None,
            refunded_at=None,
            refund_amount=None
        ),
        PaymentResponse(
            id="pay_003",
            user_id="user_003",
            user_email="user3@example.com",
            amount=99.99,
            currency="USD",
            status="failed",
            payment_method="credit_card",
            transaction_id="txn_003",
            created_at=datetime.now(),
            completed_at=None,
            refunded_at=None,
            refund_amount=None
        )
    ]
    
    # 필터링 적용
    filtered_payments = test_payments
    if status_filter:
        filtered_payments = [p for p in filtered_payments if p.status == status_filter]
    if user_email:
        filtered_payments = [p for p in filtered_payments if user_email.lower() in p.user_email.lower()]
    
    # 페이징 적용
    total = len(filtered_payments)
    start_idx = (page - 1) * per_page
    end_idx = start_idx + per_page
    paginated_payments = filtered_payments[start_idx:end_idx]
    
    total_pages = (total + per_page - 1) // per_page
    
    return PaymentListResponse(
        payments=paginated_payments,
        total=total,
        page=page,
        per_page=per_page,
        total_pages=total_pages
    )

@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission("payments.read")),
    db: DatabaseManager = Depends(get_db)
):
    """특정 결제 상세 조회"""
    
    try:
        query = """
        SELECT 
            pt.id,
            pt.user_id,
            u.email as user_email,
            pt.amount,
            pt.currency,
            pt.status,
            pt.payment_method,
            pt.transaction_id,
            pt.created_at,
            pt.completed_at,
            pt.refunded_at,
            pt.refund_amount
        FROM payment_transactions pt
        LEFT JOIN users u ON pt.user_id = u.id
        WHERE pt.id = $1
        """
        
        payment_data = await db.execute_one(query, payment_id)
        
        if not payment_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="결제 정보를 찾을 수 없습니다"
            )
        
        return PaymentResponse(
            id=str(payment_data["id"]),
            user_id=str(payment_data["user_id"]),
            user_email=payment_data["user_email"] or "",
            amount=float(payment_data["amount"]),
            currency=payment_data["currency"],
            status=payment_data["status"],
            payment_method=payment_data["payment_method"],
            transaction_id=payment_data["transaction_id"],
            created_at=payment_data["created_at"],
            completed_at=payment_data["completed_at"],
            refunded_at=payment_data["refunded_at"],
            refund_amount=float(payment_data["refund_amount"]) if payment_data["refund_amount"] else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"결제 상세 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="결제 정보를 가져오는 중 오류가 발생했습니다"
        )

@router.post("/{payment_id}/refund")
async def refund_payment(
    payment_id: str,
    request: RefundRequest,
    current_admin: Dict[str, Any] = Depends(require_permission("payments.refund")),
    db: DatabaseManager = Depends(get_db)
):
    """결제 환불 처리"""
    
    try:
        # 결제 정보 확인
        payment_query = """
        SELECT id, amount, status, user_id
        FROM payment_transactions 
        WHERE id = $1
        """
        
        payment_data = await db.execute_one(payment_query, payment_id)
        
        if not payment_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="결제 정보를 찾을 수 없습니다"
            )
        
        if payment_data["status"] != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="완료된 결제만 환불할 수 있습니다"
            )
        
        # 환불 금액 결정
        refund_amount = request.amount if request.amount else float(payment_data["amount"])
        
        if refund_amount > float(payment_data["amount"]):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="환불 금액이 결제 금액을 초과할 수 없습니다"
            )
        
        # 환불 처리
        async with db.get_connection() as conn:
            async with conn.transaction():
                # 결제 상태 업데이트
                update_payment_query = """
                UPDATE payment_transactions 
                SET status = 'refunded', 
                    refunded_at = now(), 
                    refund_amount = $1,
                    updated_at = now()
                WHERE id = $2
                """
                
                await conn.execute(update_payment_query, refund_amount, payment_id)
                
                # 사용자 포인트 차감 (환불된 만큼)
                points_to_deduct = int(refund_amount)  # 1원 = 1포인트로 가정
                
                deduct_points_query = """
                UPDATE user_point_balances 
                SET balance = balance - $1, updated_at = now()
                WHERE user_id = $2
                """
                
                await conn.execute(deduct_points_query, points_to_deduct, payment_data["user_id"])
                
                # 포인트 거래 이력 추가
                point_transaction_query = """
                INSERT INTO user_point_transactions 
                (user_id, transaction_type, amount, description, created_at)
                VALUES ($1, 'deduct', $2, $3, now())
                """
                
                description = f"결제 환불 (결제 ID: {payment_id}, 사유: {request.reason})"
                await conn.execute(point_transaction_query, payment_data["user_id"], points_to_deduct, description)
        
        # 활동 로그 기록
        log_query = """
        INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, details, success)
        VALUES ($1, 'refund_payment', 'payment', $2, $3, true)
        """
        
        details = {
            "refund_amount": refund_amount,
            "reason": request.reason,
            "admin_email": current_admin["email"]
        }
        
        await db.execute_command(log_query, current_admin["id"], payment_id, details)
        
        return {"message": "환불이 성공적으로 처리되었습니다", "refund_amount": refund_amount}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"결제 환불 처리 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="환불 처리 중 오류가 발생했습니다"
        )

@router.get("/metrics/revenue")
async def get_revenue_metrics(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    current_admin: Dict[str, Any] = Depends(require_permission("payments.read")),
    db: DatabaseManager = Depends(get_db)
):
    """매출 메트릭 조회"""
    
    try:
        # 기간별 쿼리 설정
        period_mapping = {
            "7d": "7 days",
            "30d": "30 days", 
            "90d": "90 days",
            "1y": "1 year"
        }
        
        interval = period_mapping.get(period, "30 days")
        
        query = """
        SELECT 
            DATE(created_at) as date,
            COALESCE(SUM(amount), 0) as revenue,
            COUNT(*) as transaction_count
        FROM payment_transactions
        WHERE status = 'completed'
        AND created_at >= now() - interval %s
        GROUP BY DATE(created_at)
        ORDER BY date DESC
        """ % f"'{interval}'"
        
        metrics_data = await db.execute_query(query)
        
        metrics = [
            RevenueMetrics(
                date=metric["date"],
                revenue=float(metric["revenue"]),
                transaction_count=metric["transaction_count"]
            )
            for metric in metrics_data
        ]
        
        return {"metrics": metrics, "period": period}
        
    except Exception as e:
        logger.error(f"매출 메트릭 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="매출 메트릭을 가져오는 중 오류가 발생했습니다"
        )

@router.get("/analytics/top-users")
async def get_top_paying_users(
    limit: int = Query(10, ge=1, le=50),
    period: str = Query("30d", regex="^(7d|30d|90d|1y|all)$"),
    current_admin: Dict[str, Any] = Depends(require_permission("payments.read")),
    db: DatabaseManager = Depends(get_db)
):
    """최고 결제 사용자 조회"""
    
    try:
        # 기간 조건 설정
        date_condition = ""
        if period != "all":
            period_mapping = {
                "7d": "7 days",
                "30d": "30 days",
                "90d": "90 days", 
                "1y": "1 year"
            }
            interval = period_mapping.get(period, "30 days")
            date_condition = f"AND pt.created_at >= now() - interval '{interval}'"
        
        query = f"""
        SELECT 
            u.id,
            u.email,
            u.name,
            COALESCE(SUM(pt.amount), 0) as total_spent,
            COUNT(pt.id) as transaction_count,
            MAX(pt.created_at) as last_payment
        FROM users u
        INNER JOIN payment_transactions pt ON u.id = pt.user_id
        WHERE pt.status = 'completed' {date_condition}
        GROUP BY u.id, u.email, u.name
        ORDER BY total_spent DESC
        LIMIT $1
        """
        
        top_users = await db.execute_query(query, limit)
        
        return {
            "top_users": [
                {
                    "user_id": str(user["id"]),
                    "email": user["email"],
                    "name": user["name"],
                    "total_spent": float(user["total_spent"]),
                    "transaction_count": user["transaction_count"],
                    "last_payment": user["last_payment"]
                }
                for user in top_users
            ],
            "period": period,
            "limit": limit
        }
        
    except Exception as e:
        logger.error(f"최고 결제 사용자 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="최고 결제 사용자 정보를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/analytics/payment-methods")
async def get_payment_method_analytics(
    period: str = Query("30d", regex="^(7d|30d|90d|1y|all)$"),
    current_admin: Dict[str, Any] = Depends(require_permission("payments.read")),
    db: DatabaseManager = Depends(get_db)
):
    """결제 수단별 분석"""
    
    try:
        # 기간 조건 설정
        date_condition = ""
        if period != "all":
            period_mapping = {
                "7d": "7 days",
                "30d": "30 days",
                "90d": "90 days",
                "1y": "1 year"
            }
            interval = period_mapping.get(period, "30 days")
            date_condition = f"WHERE created_at >= now() - interval '{interval}'"
        
        query = f"""
        SELECT 
            payment_method,
            COUNT(*) as transaction_count,
            COALESCE(SUM(amount), 0) as total_revenue,
            COALESCE(AVG(amount), 0) as average_amount
        FROM payment_transactions
        {date_condition}
        {"AND" if date_condition else "WHERE"} status = 'completed'
        GROUP BY payment_method
        ORDER BY total_revenue DESC
        """
        
        analytics_data = await db.execute_query(query)
        
        return {
            "payment_methods": [
                {
                    "method": method["payment_method"],
                    "transaction_count": method["transaction_count"],
                    "total_revenue": float(method["total_revenue"]),
                    "average_amount": float(method["average_amount"])
                }
                for method in analytics_data
            ],
            "period": period
        }
        
    except Exception as e:
        logger.error(f"결제 수단별 분석 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="결제 수단별 분석 데이터를 가져오는 중 오류가 발생했습니다"
        )