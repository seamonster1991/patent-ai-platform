"""
Payment management API routes
"""
from typing import Optional
from datetime import datetime
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_active_admin
from app.models.admin import AdminUser
from app.schemas.payment import (
    PaymentResponse, PaymentCreate, PaymentUpdate, PaymentListResponse,
    SubscriptionResponse, SubscriptionCreate, SubscriptionUpdate, SubscriptionListResponse
)
from app.services.payment_service import PaymentService

router = APIRouter()


# Payment endpoints
@router.get("/", response_model=PaymentListResponse)
async def list_payments(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    payment_method: Optional[str] = Query(None),
    date_from: Optional[datetime] = Query(None),
    date_to: Optional[datetime] = Query(None),
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc"),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get list of payments with filtering and pagination"""
    payment_service = PaymentService(db)
    
    payments, total = payment_service.list_payments(
        skip=skip,
        limit=limit,
        user_id=user_id,
        status=status,
        payment_method=payment_method,
        date_from=date_from,
        date_to=date_to,
        sort_by=sort_by,
        sort_order=sort_order
    )
    
    return PaymentListResponse(
        payments=[PaymentResponse(**payment) for payment in payments],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/statistics")
async def get_payment_statistics(
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get payment statistics"""
    payment_service = PaymentService(db)
    return payment_service.get_payment_statistics()


@router.get("/analytics")
async def get_revenue_analytics(
    days: int = Query(30, ge=1, le=365),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get revenue analytics"""
    payment_service = PaymentService(db)
    return payment_service.get_revenue_analytics(days)


@router.get("/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: str,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get payment by ID"""
    payment_service = PaymentService(db)
    payment = payment_service.get_payment_by_id(payment_id)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return PaymentResponse.from_orm(payment)


@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment_data: PaymentCreate,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Create new payment record"""
    payment_service = PaymentService(db)
    payment = payment_service.create_payment(payment_data)
    
    return PaymentResponse.from_orm(payment)


@router.put("/{payment_id}", response_model=PaymentResponse)
async def update_payment(
    payment_id: str,
    payment_data: PaymentUpdate,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Update payment"""
    payment_service = PaymentService(db)
    payment = payment_service.update_payment(payment_id, payment_data)
    
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Payment not found"
        )
    
    return PaymentResponse.from_orm(payment)


@router.post("/{payment_id}/refund")
async def process_refund(
    payment_id: str,
    amount: Optional[Decimal] = None,
    reason: str = "",
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Process payment refund"""
    payment_service = PaymentService(db)
    result = payment_service.process_refund(payment_id, amount, reason)
    
    return result


# Subscription endpoints
@router.get("/subscriptions/", response_model=SubscriptionListResponse)
async def list_subscriptions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    user_id: Optional[str] = Query(None),
    plan: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get list of subscriptions with filtering"""
    payment_service = PaymentService(db)
    
    subscriptions, total = payment_service.list_subscriptions(
        skip=skip,
        limit=limit,
        user_id=user_id,
        plan=plan,
        status=status,
        is_active=is_active
    )
    
    return SubscriptionListResponse(
        subscriptions=[SubscriptionResponse.from_orm(sub) for sub in subscriptions],
        total=total,
        skip=skip,
        limit=limit
    )


@router.get("/subscriptions/statistics")
async def get_subscription_statistics(
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get subscription statistics"""
    payment_service = PaymentService(db)
    return payment_service.get_subscription_statistics()


@router.get("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def get_subscription(
    subscription_id: str,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get subscription by ID"""
    payment_service = PaymentService(db)
    subscription = payment_service.get_subscription_by_id(subscription_id)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return SubscriptionResponse.from_orm(subscription)


@router.post("/subscriptions/", response_model=SubscriptionResponse)
async def create_subscription(
    subscription_data: SubscriptionCreate,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Create new subscription"""
    payment_service = PaymentService(db)
    subscription = payment_service.create_subscription(subscription_data)
    
    return SubscriptionResponse.from_orm(subscription)


@router.put("/subscriptions/{subscription_id}", response_model=SubscriptionResponse)
async def update_subscription(
    subscription_id: str,
    subscription_data: SubscriptionUpdate,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Update subscription"""
    payment_service = PaymentService(db)
    subscription = payment_service.update_subscription(subscription_id, subscription_data)
    
    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Subscription not found"
        )
    
    return SubscriptionResponse.from_orm(subscription)