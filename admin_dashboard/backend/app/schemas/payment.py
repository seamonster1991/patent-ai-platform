"""
Payment and subscription-related Pydantic schemas
"""
from typing import Optional
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel, Field
from uuid import UUID


class PaymentResponse(BaseModel):
    """Schema for payment response"""
    id: UUID
    user_id: UUID
    amount: Decimal
    currency: str
    status: str
    payment_method: str
    description: Optional[str]
    created_at: datetime
    updated_at: Optional[datetime]
    completed_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    """Schema for subscription response"""
    id: UUID
    user_id: UUID
    plan_name: str
    status: str
    amount: Decimal
    currency: str
    billing_cycle: str
    monthly_limit: Optional[int]
    current_usage: int
    starts_at: datetime
    ends_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_at: datetime
    updated_at: Optional[datetime]
    
    class Config:
        from_attributes = True


class PaymentListResponse(BaseModel):
    """Schema for payment list response"""
    payments: list[PaymentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class SubscriptionListResponse(BaseModel):
    """Schema for subscription list response"""
    subscriptions: list[SubscriptionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class PaymentStatsResponse(BaseModel):
    """Schema for payment statistics response"""
    total_revenue: Decimal
    monthly_revenue: Decimal
    total_payments: int
    successful_payments: int
    failed_payments: int
    refunded_payments: int
    average_payment_amount: Decimal
    revenue_growth_rate: float


class SubscriptionStatsResponse(BaseModel):
    """Schema for subscription statistics response"""
    total_subscriptions: int
    active_subscriptions: int
    cancelled_subscriptions: int
    expired_subscriptions: int
    monthly_recurring_revenue: Decimal
    churn_rate: float
    subscription_growth_rate: float