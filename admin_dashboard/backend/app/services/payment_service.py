"""
Payment management service for admin dashboard
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, extract
from fastapi import HTTPException, status
from decimal import Decimal
import logging

from app.models.payment import Payment, Subscription
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentUpdate, SubscriptionCreate, SubscriptionUpdate
from app.core.supabase import get_supabase_client

logger = logging.getLogger(__name__)


class PaymentService:
    def __init__(self, db: Session):
        self.db = db
        self.supabase = get_supabase_client()
    
    def get_payment_by_id(self, payment_id: str) -> Optional[Payment]:
        """Get payment by ID"""
        return self.db.query(Payment).filter(Payment.id == payment_id).first()
    
    def list_payments(
        self,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[str] = None,
        status: Optional[str] = None,
        payment_method: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Dict], int]:
        """List payments with filtering and pagination from Supabase"""
        try:
            # Build query
            query = self.supabase.table('payments').select('*')
            
            # Apply filters
            if user_id:
                query = query.eq('user_id', user_id)
            
            if status:
                query = query.eq('status', status)
            
            if payment_method:
                query = query.eq('payment_method', payment_method)
            
            if date_from:
                query = query.gte('created_at', date_from.isoformat())
            
            if date_to:
                query = query.lte('created_at', date_to.isoformat())
            
            # Apply sorting
            if sort_order.lower() == "desc":
                query = query.order(sort_by, desc=True)
            else:
                query = query.order(sort_by)
            
            # Get total count first
            count_result = self.supabase.table('payments').select('id', count='exact').execute()
            total = count_result.count if count_result.count else 0
            
            # Apply pagination
            result = query.range(skip, skip + limit - 1).execute()
            
            payments = result.data if result.data else []
            
            logger.info(f"Retrieved {len(payments)} payments from Supabase")
            return payments, total
            
        except Exception as e:
            logger.error(f"Error fetching payments from Supabase: {e}")
            return [], 0
    
    def create_payment(self, payment_data: PaymentCreate) -> Payment:
        """Create new payment record"""
        db_payment = Payment(
            user_id=payment_data.user_id,
            amount=payment_data.amount,
            currency=payment_data.currency or "KRW",
            payment_method=payment_data.payment_method,
            status=payment_data.status or "pending",
            transaction_id=payment_data.transaction_id,
            description=payment_data.description,
            metadata=payment_data.metadata or {}
        )
        
        self.db.add(db_payment)
        self.db.commit()
        self.db.refresh(db_payment)
        
        return db_payment
    
    def update_payment(self, payment_id: str, payment_data: PaymentUpdate) -> Optional[Payment]:
        """Update payment"""
        payment = self.get_payment_by_id(payment_id)
        if not payment:
            return None
        
        update_data = payment_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(payment, field, value)
        
        payment.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(payment)
        
        return payment
    
    def get_payment_statistics(self) -> Dict[str, Any]:
        """Get payment statistics from Supabase"""
        try:
            # Total payments
            total_result = self.supabase.table('payments').select('id', count='exact').execute()
            total_payments = total_result.count if total_result.count else 0
            
            # Successful payments
            successful_result = self.supabase.table('payments').select('id', count='exact').eq('status', 'completed').execute()
            successful_payments = successful_result.count if successful_result.count else 0
            
            # Get all completed payments for revenue calculations
            completed_payments = self.supabase.table('payments').select('amount, created_at, payment_method').eq('status', 'completed').execute()
            payments_data = completed_payments.data if completed_payments.data else []
            
            # Calculate total revenue
            total_revenue = sum(float(payment.get('amount', 0)) for payment in payments_data)
            
            # Calculate monthly revenue
            current_month = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            monthly_revenue = sum(
                float(payment.get('amount', 0)) 
                for payment in payments_data 
                if datetime.fromisoformat(payment.get('created_at', '').replace('Z', '+00:00')) >= current_month
            )
            
            # Payment methods distribution
            payment_methods = {}
            for payment in payments_data:
                method = payment.get('payment_method', 'unknown')
                if method not in payment_methods:
                    payment_methods[method] = {'count': 0, 'total_amount': 0}
                payment_methods[method]['count'] += 1
                payment_methods[method]['total_amount'] += float(payment.get('amount', 0))
            
            # Get all payments for status distribution
            all_payments = self.supabase.table('payments').select('status').execute()
            all_payments_data = all_payments.data if all_payments.data else []
            
            payment_status = {}
            for payment in all_payments_data:
                status = payment.get('status', 'unknown')
                payment_status[status] = payment_status.get(status, 0) + 1
            
            return {
                "total_payments": total_payments,
                "successful_payments": successful_payments,
                "failed_payments": total_payments - successful_payments,
                "success_rate": (successful_payments / total_payments * 100) if total_payments > 0 else 0,
                "total_revenue": total_revenue,
                "monthly_revenue": monthly_revenue,
                "payment_methods": [
                    {
                        "method": method,
                        "count": data['count'],
                        "total_amount": data['total_amount']
                    }
                    for method, data in payment_methods.items()
                ],
                "payment_status": [
                    {
                        "status": status,
                        "count": count
                    }
                    for status, count in payment_status.items()
                ]
            }
            
        except Exception as e:
            logger.error(f"Error fetching payment statistics from Supabase: {e}")
            return {
                "total_payments": 0,
                "successful_payments": 0,
                "failed_payments": 0,
                "success_rate": 0,
                "total_revenue": 0,
                "monthly_revenue": 0,
                "payment_methods": [],
                "payment_status": []
            }
    
    def get_revenue_analytics(self, days: int = 30) -> Dict[str, Any]:
        """Get detailed revenue analytics"""
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # Daily revenue trend
        daily_revenue = self.db.query(
            func.date(Payment.created_at).label('date'),
            func.sum(Payment.amount).label('revenue'),
            func.count(Payment.id).label('transactions')
        ).filter(
            and_(
                Payment.status == "completed",
                Payment.created_at >= start_date
            )
        ).group_by(func.date(Payment.created_at)).order_by('date').all()
        
        # Monthly comparison
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        
        current_month_revenue = self.db.query(
            func.sum(Payment.amount)
        ).filter(
            and_(
                Payment.status == "completed",
                Payment.created_at >= current_month_start
            )
        ).scalar() or 0
        
        last_month_revenue = self.db.query(
            func.sum(Payment.amount)
        ).filter(
            and_(
                Payment.status == "completed",
                Payment.created_at >= last_month_start,
                Payment.created_at < current_month_start
            )
        ).scalar() or 0
        
        # Average transaction value
        avg_transaction = self.db.query(
            func.avg(Payment.amount)
        ).filter(
            and_(
                Payment.status == "completed",
                Payment.created_at >= start_date
            )
        ).scalar() or 0
        
        return {
            "daily_revenue": [
                {
                    "date": date.isoformat(),
                    "revenue": float(revenue),
                    "transactions": transactions
                }
                for date, revenue, transactions in daily_revenue
            ],
            "current_month_revenue": float(current_month_revenue),
            "last_month_revenue": float(last_month_revenue),
            "month_over_month_growth": (
                ((current_month_revenue - last_month_revenue) / last_month_revenue * 100)
                if last_month_revenue > 0 else 0
            ),
            "average_transaction_value": float(avg_transaction)
        }
    
    # Subscription Management
    def get_subscription_by_id(self, subscription_id: str) -> Optional[Subscription]:
        """Get subscription by ID"""
        return self.db.query(Subscription).filter(Subscription.id == subscription_id).first()
    
    def list_subscriptions(
        self,
        skip: int = 0,
        limit: int = 100,
        user_id: Optional[str] = None,
        plan: Optional[str] = None,
        status: Optional[str] = None,
        is_active: Optional[bool] = None
    ) -> Tuple[List[Subscription], int]:
        """List subscriptions with filtering"""
        query = self.db.query(Subscription).join(User)
        
        if user_id:
            query = query.filter(Subscription.user_id == user_id)
        
        if plan:
            query = query.filter(Subscription.plan == plan)
        
        if status:
            query = query.filter(Subscription.status == status)
        
        if is_active is not None:
            query = query.filter(Subscription.is_active == is_active)
        
        total = query.count()
        subscriptions = query.offset(skip).limit(limit).all()
        
        return subscriptions, total
    
    def create_subscription(self, subscription_data: SubscriptionCreate) -> Subscription:
        """Create new subscription"""
        db_subscription = Subscription(
            user_id=subscription_data.user_id,
            plan=subscription_data.plan,
            status=subscription_data.status or "active",
            start_date=subscription_data.start_date or datetime.utcnow(),
            end_date=subscription_data.end_date,
            is_active=subscription_data.is_active if subscription_data.is_active is not None else True,
            metadata=subscription_data.metadata or {}
        )
        
        self.db.add(db_subscription)
        self.db.commit()
        self.db.refresh(db_subscription)
        
        return db_subscription
    
    def update_subscription(self, subscription_id: str, subscription_data: SubscriptionUpdate) -> Optional[Subscription]:
        """Update subscription"""
        subscription = self.get_subscription_by_id(subscription_id)
        if not subscription:
            return None
        
        update_data = subscription_data.dict(exclude_unset=True)
        
        for field, value in update_data.items():
            setattr(subscription, field, value)
        
        subscription.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(subscription)
        
        return subscription
    
    def get_subscription_statistics(self) -> Dict[str, Any]:
        """Get subscription statistics"""
        total_subscriptions = self.db.query(Subscription).count()
        active_subscriptions = self.db.query(Subscription).filter(
            Subscription.is_active == True
        ).count()
        
        # Subscriptions by plan
        plan_stats = self.db.query(
            Subscription.plan,
            func.count(Subscription.id).label('count')
        ).filter(Subscription.is_active == True).group_by(Subscription.plan).all()
        
        # Subscriptions by status
        status_stats = self.db.query(
            Subscription.status,
            func.count(Subscription.id).label('count')
        ).group_by(Subscription.status).all()
        
        # Expiring subscriptions (next 30 days)
        thirty_days_later = datetime.utcnow() + timedelta(days=30)
        expiring_soon = self.db.query(Subscription).filter(
            and_(
                Subscription.is_active == True,
                Subscription.end_date <= thirty_days_later,
                Subscription.end_date >= datetime.utcnow()
            )
        ).count()
        
        return {
            "total_subscriptions": total_subscriptions,
            "active_subscriptions": active_subscriptions,
            "inactive_subscriptions": total_subscriptions - active_subscriptions,
            "expiring_soon": expiring_soon,
            "subscriptions_by_plan": {plan: count for plan, count in plan_stats},
            "subscriptions_by_status": {status: count for status, count in status_stats}
        }
    
    def process_refund(self, payment_id: str, amount: Optional[Decimal] = None, reason: str = "") -> Dict[str, Any]:
        """Process payment refund"""
        payment = self.get_payment_by_id(payment_id)
        if not payment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Payment not found"
            )
        
        if payment.status != "completed":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Can only refund completed payments"
            )
        
        refund_amount = amount or payment.amount
        
        if refund_amount > payment.amount:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Refund amount cannot exceed payment amount"
            )
        
        # Update payment status
        payment.status = "refunded" if refund_amount == payment.amount else "partially_refunded"
        payment.metadata = payment.metadata or {}
        payment.metadata.update({
            "refund_amount": str(refund_amount),
            "refund_reason": reason,
            "refund_date": datetime.utcnow().isoformat()
        })
        
        self.db.commit()
        
        return {
            "payment_id": payment_id,
            "refund_amount": float(refund_amount),
            "status": payment.status,
            "reason": reason
        }