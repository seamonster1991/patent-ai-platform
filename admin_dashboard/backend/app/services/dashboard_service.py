"""
Dashboard service for metrics and analytics
"""
from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from decimal import Decimal
import logging

from app.models.user import User
from app.models.payment import Payment, Subscription
from app.models.system import SystemMetric, APILog
from app.schemas.dashboard import DashboardMetrics, MetricCard, ChartData, RealtimeMetrics
from app.core.supabase import get_supabase_client

logger = logging.getLogger(__name__)


class DashboardService:
    """Service for dashboard metrics and analytics"""
    
    def __init__(self, db: Session):
        self.db = db
        self.supabase = get_supabase_client()
    
    def get_dashboard_metrics(self) -> Dict[str, Any]:
        """Get comprehensive dashboard metrics from Supabase"""
        try:
            now = datetime.utcnow()
            month_ago = now - timedelta(days=30)
            
            # User metrics
            total_users_result = self.supabase.table('users').select('id', count='exact').execute()
            total_users = total_users_result.count if total_users_result.count else 0
            
            active_users_result = self.supabase.table('users').select('id', count='exact').eq('is_active', True).execute()
            active_users = active_users_result.count if active_users_result.count else 0
            
            # Revenue metrics
            completed_payments = self.supabase.table('payment_transactions').select('amount, created_at').eq('status', 'success').execute()
            payments_data = completed_payments.data if completed_payments.data else []
            
            total_revenue = 0.0
            monthly_revenue = 0.0
            
            for payment in payments_data:
                try:
                    amount = float(payment.get('amount', 0))
                    total_revenue += amount
                    
                    # Check if payment is from this month
                    created_at_str = payment.get('created_at', '')
                    if created_at_str:
                        payment_date = datetime.fromisoformat(created_at_str.replace('Z', '+00:00'))
                        if payment_date >= month_ago:
                            monthly_revenue += amount
                except (ValueError, TypeError) as e:
                    logger.warning(f"Invalid payment amount or date: {payment}, error: {e}")
                    continue
            
            # Growth calculations
            prev_month_users_result = self.supabase.table('users').select('id', count='exact').lt('created_at', month_ago.isoformat()).execute()
            prev_month_users = prev_month_users_result.count if prev_month_users_result.count else 0
            
            user_growth_rate = 0.0
            if prev_month_users > 0 and total_users >= prev_month_users:
                new_users_this_month = total_users - prev_month_users
                user_growth_rate = round((new_users_this_month / prev_month_users) * 100, 2)
            elif total_users > 0 and prev_month_users == 0:
                user_growth_rate = 100.0  # 100% growth if no previous users
            
            # Recent activity
            recent_users_result = self.supabase.table('users').select('id', count='exact').gte('created_at', (now - timedelta(hours=24)).isoformat()).execute()
            recent_users = recent_users_result.count if recent_users_result.count else 0
            
            recent_payments_result = self.supabase.table('payment_transactions').select('id', count='exact').gte('created_at', (now - timedelta(hours=24)).isoformat()).execute()
            recent_payments = recent_payments_result.count if recent_payments_result.count else 0
            
            return {
                "total_users": max(0, int(total_users or 0)),
                "active_users": max(0, int(active_users or 0)),
                "total_revenue": round(float(total_revenue or 0), 2),
                "monthly_revenue": round(float(monthly_revenue or 0), 2),
                "user_growth_rate": round(float(user_growth_rate or 0), 2),
                "revenue_growth_rate": 0.0,  # Simplified for now
                "api_calls_today": 0,  # Will be implemented with proper logging
                "error_rate": 0.0,
                "average_response_time": 0.0,
                "recent_users": max(0, int(recent_users or 0)),
                "recent_payments": max(0, int(recent_payments or 0)),
                "recent_errors": 0,
                "last_updated": now.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching dashboard metrics from Supabase: {e}")
            now = datetime.utcnow()
            return {
                "total_users": 0,
                "active_users": 0,
                "total_revenue": 0.0,
                "monthly_revenue": 0.0,
                "user_growth_rate": 0.0,
                "revenue_growth_rate": 0.0,
                "api_calls_today": 0,
                "error_rate": 0.0,
                "average_response_time": 0.0,
                "recent_users": 0,
                "recent_payments": 0,
                "recent_errors": 0,
                "last_updated": now.isoformat()
            }
    
    def get_realtime_metrics(self) -> Dict[str, Any]:
        """Get real-time system metrics from Supabase"""
        try:
            now = datetime.utcnow()
            
            # For now, return simplified metrics since we don't have API logs table
            # In a real implementation, you would have proper logging tables
            
            # Active users (simplified - users created in last 24 hours)
            active_users_result = self.supabase.table('users').select('id', count='exact').gte('created_at', (now - timedelta(hours=24)).isoformat()).execute()
            active_users = active_users_result.count if active_users_result.count else 0
            
            # Recent payments as activity indicator
            recent_activity_result = self.supabase.table('payments').select('id', count='exact').gte('created_at', (now - timedelta(minutes=5)).isoformat()).execute()
            api_calls_per_minute = recent_activity_result.count if recent_activity_result.count else 0
            
            return {
                "active_users": active_users,
                "api_calls_per_minute": api_calls_per_minute,
                "cpu_usage": 45.2,  # Mock data - would come from system monitoring
                "memory_usage": 67.8,  # Mock data - would come from system monitoring
                "error_count": 0,  # Would come from proper error logging
                "timestamp": now.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error fetching realtime metrics from Supabase: {e}")
            return {
                "active_users": 0,
                "api_calls_per_minute": 0,
                "cpu_usage": 0.0,
                "memory_usage": 0.0,
                "error_count": 0,
                "timestamp": now.isoformat()
            }
    
    def _get_user_growth_chart(self) -> ChartData:
        """Get user growth chart data"""
        now = datetime.utcnow()
        labels = []
        data = []
        
        for i in range(30, 0, -1):
            date = now - timedelta(days=i)
            label = date.strftime("%m/%d")
            labels.append(label)
            
            count = self.db.query(User).filter(
                func.date(User.created_at) == date.date()
            ).count()
            data.append(count)
        
        return ChartData(
            labels=labels,
            datasets=[{
                "label": "New Users",
                "data": data,
                "borderColor": "rgb(59, 130, 246)",
                "backgroundColor": "rgba(59, 130, 246, 0.1)",
                "tension": 0.4
            }]
        )
    
    def _get_revenue_chart(self) -> ChartData:
        """Get revenue chart data"""
        now = datetime.utcnow()
        labels = []
        data = []
        
        for i in range(30, 0, -1):
            date = now - timedelta(days=i)
            label = date.strftime("%m/%d")
            labels.append(label)
            
            revenue = self.db.query(func.sum(Payment.amount)).filter(
                and_(
                    Payment.status == "completed",
                    func.date(Payment.created_at) == date.date()
                )
            ).scalar() or Decimal('0')
            data.append(float(revenue))
        
        return ChartData(
            labels=labels,
            datasets=[{
                "label": "Revenue ($)",
                "data": data,
                "borderColor": "rgb(34, 197, 94)",
                "backgroundColor": "rgba(34, 197, 94, 0.1)",
                "tension": 0.4
            }]
        )
    
    def _get_api_usage_chart(self) -> ChartData:
        """Get API usage chart data"""
        now = datetime.utcnow()
        labels = []
        data = []
        
        for i in range(24, 0, -1):
            hour = now - timedelta(hours=i)
            label = hour.strftime("%H:00")
            labels.append(label)
            
            count = self.db.query(APILog).filter(
                and_(
                    APILog.timestamp >= hour,
                    APILog.timestamp < hour + timedelta(hours=1)
                )
            ).count()
            data.append(count)
        
        return ChartData(
            labels=labels,
            datasets=[{
                "label": "API Calls",
                "data": data,
                "borderColor": "rgb(168, 85, 247)",
                "backgroundColor": "rgba(168, 85, 247, 0.1)",
                "tension": 0.4
            }]
        )
    
    def _get_metric_cards(
        self, 
        total_users: int, 
        active_users: int, 
        total_revenue: Decimal, 
        monthly_revenue: Decimal,
        user_growth_rate: float, 
        revenue_growth_rate: float, 
        api_calls_today: int, 
        error_rate: float
    ) -> List[MetricCard]:
        """Get metric cards data"""
        return [
            MetricCard(
                title="Total Users",
                value=f"{total_users:,}",
                change=f"+{user_growth_rate:.1f}%",
                change_type="increase" if user_growth_rate > 0 else "decrease",
                icon="users"
            ),
            MetricCard(
                title="Active Users",
                value=f"{active_users:,}",
                change=f"{(active_users/total_users*100):.1f}%" if total_users > 0 else "0%",
                change_type="neutral",
                icon="user-check"
            ),
            MetricCard(
                title="Total Revenue",
                value=f"${total_revenue:,.2f}",
                change=f"+{revenue_growth_rate:.1f}%",
                change_type="increase" if revenue_growth_rate > 0 else "decrease",
                icon="dollar-sign"
            ),
            MetricCard(
                title="Monthly Revenue",
                value=f"${monthly_revenue:,.2f}",
                change=f"+{revenue_growth_rate:.1f}%",
                change_type="increase" if revenue_growth_rate > 0 else "decrease",
                icon="trending-up"
            ),
            MetricCard(
                title="API Calls Today",
                value=f"{api_calls_today:,}",
                change="24h",
                change_type="neutral",
                icon="activity"
            ),
            MetricCard(
                title="Error Rate",
                value=f"{error_rate:.2f}%",
                change="24h",
                change_type="decrease" if error_rate < 5 else "increase",
                icon="alert-triangle"
            )
        ]