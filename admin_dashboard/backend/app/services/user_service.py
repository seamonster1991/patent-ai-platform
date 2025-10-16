"""
User management service for admin dashboard
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from fastapi import HTTPException, status
import logging

from app.models.user import User
from app.models.payment import Payment, Subscription
from app.schemas.user import UserCreate, UserUpdate
from app.core.auth import get_password_hash
from app.core.supabase import get_supabase_client

logger = logging.getLogger(__name__)


class UserService:
    def __init__(self, db: Session):
        self.db = db
        self.supabase = get_supabase_client()
    
    def get_user_by_id(self, user_id: str) -> Optional[User]:
        """Get user by ID"""
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get user by email"""
        return self.db.query(User).filter(User.email == email).first()
    
    def list_users(
        self,
        skip: int = 0,
        limit: int = 100,
        search: Optional[str] = None,
        role: Optional[str] = None,
        subscription_plan: Optional[str] = None,
        is_active: Optional[bool] = None,
        sort_by: str = "created_at",
        sort_order: str = "desc"
    ) -> Tuple[List[Dict], int]:
        """List users with filtering and pagination from Supabase"""
        try:
            # Build query
            query = self.supabase.table('users').select('*')
            
            # Apply filters
            if search:
                query = query.or_(f"email.ilike.%{search}%,name.ilike.%{search}%")
            
            if role:
                query = query.eq('role', role)
            
            if subscription_plan:
                query = query.eq('subscription_plan', subscription_plan)
            
            if is_active is not None:
                query = query.eq('is_active', is_active)
            
            # Apply sorting
            if sort_order.lower() == "desc":
                query = query.order(sort_by, desc=True)
            else:
                query = query.order(sort_by)
            
            # Get total count first
            count_result = self.supabase.table('users').select('id', count='exact').execute()
            total = count_result.count if count_result.count else 0
            
            # Apply pagination
            result = query.range(skip, skip + limit - 1).execute()
            
            users = result.data if result.data else []
            
            logger.info(f"Retrieved {len(users)} users from Supabase")
            return users, total
            
        except Exception as e:
            logger.error(f"Error fetching users from Supabase: {e}")
            # Fallback to empty result
            return [], 0
    
    def create_user(self, user_data: UserCreate) -> User:
        """Create new user"""
        # Check if user already exists
        existing_user = self.get_user_by_email(user_data.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User with this email already exists"
            )
        
        # Create user
        db_user = User(
            email=user_data.email,
            name=user_data.name,
            password_hash=get_password_hash(user_data.password),
            role=user_data.role or "user",
            subscription_plan=user_data.subscription_plan or "free",
            is_active=user_data.is_active if user_data.is_active is not None else True
        )
        
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        
        return db_user
    
    def update_user(self, user_id: str, user_data: UserUpdate) -> Optional[User]:
        """Update user"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        # Update fields
        update_data = user_data.dict(exclude_unset=True)
        
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
    
    def delete_user(self, user_id: str) -> bool:
        """Delete user (soft delete by deactivating)"""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        user.is_active = False
        user.updated_at = datetime.utcnow()
        
        self.db.commit()
        
        return True
    
    def get_user_statistics(self) -> Dict[str, Any]:
        """Get user statistics from Supabase"""
        try:
            # Total users
            total_result = self.supabase.table('users').select('id', count='exact').execute()
            total_users = total_result.count if total_result.count else 0
            
            # Active users
            active_result = self.supabase.table('users').select('id', count='exact').eq('is_active', True).execute()
            active_users = active_result.count if active_result.count else 0
            
            # Users by role
            users_data = self.supabase.table('users').select('role').execute()
            role_stats = {}
            if users_data.data:
                for user in users_data.data:
                    role = user.get('role', 'unknown')
                    role_stats[role] = role_stats.get(role, 0) + 1
            
            # Users by subscription plan
            plan_data = self.supabase.table('users').select('subscription_plan').execute()
            plan_stats = {}
            if plan_data.data:
                for user in plan_data.data:
                    plan = user.get('subscription_plan', 'unknown')
                    plan_stats[plan] = plan_stats.get(plan, 0) + 1
            
            # New users in last 30 days
            thirty_days_ago = (datetime.utcnow() - timedelta(days=30)).isoformat()
            new_users_30d_result = self.supabase.table('users').select('id', count='exact').gte('created_at', thirty_days_ago).execute()
            new_users_30d = new_users_30d_result.count if new_users_30d_result.count else 0
            
            # New users today
            today = datetime.utcnow().date().isoformat()
            new_users_today_result = self.supabase.table('users').select('id', count='exact').gte('created_at', today).execute()
            new_users_today = new_users_today_result.count if new_users_today_result.count else 0
            
            return {
                "total_users": total_users,
                "active_users": active_users,
                "inactive_users": total_users - active_users,
                "new_users_30d": new_users_30d,
                "new_users_today": new_users_today,
                "users_by_role": role_stats,
                "users_by_plan": plan_stats
            }
            
        except Exception as e:
            logger.error(f"Error fetching user statistics from Supabase: {e}")
            return {
                "total_users": 0,
                "active_users": 0,
                "inactive_users": 0,
                "new_users_30d": 0,
                "new_users_today": 0,
                "users_by_role": {},
                "users_by_plan": {}
            }
    
    def get_user_activity_summary(self, user_id: str) -> Dict[str, Any]:
        """Get user activity summary"""
        user = self.get_user_by_id(user_id)
        if not user:
            return {}
        
        # Get payment history
        payments = self.db.query(Payment).filter(
            Payment.user_id == user_id
        ).order_by(desc(Payment.created_at)).limit(10).all()
        
        # Get subscription info
        subscription = self.db.query(Subscription).filter(
            Subscription.user_id == user_id,
            Subscription.is_active == True
        ).first()
        
        return {
            "user": {
                "id": user.id,
                "email": user.email,
                "name": user.name,
                "role": user.role,
                "subscription_plan": user.subscription_plan,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "last_login_at": user.last_login_at
            },
            "payments": [
                {
                    "id": payment.id,
                    "amount": payment.amount,
                    "status": payment.status,
                    "payment_method": payment.payment_method,
                    "created_at": payment.created_at
                }
                for payment in payments
            ],
            "subscription": {
                "id": subscription.id,
                "plan": subscription.plan,
                "status": subscription.status,
                "start_date": subscription.start_date,
                "end_date": subscription.end_date,
                "is_active": subscription.is_active
            } if subscription else None
        }
    
    def bulk_update_users(self, user_ids: List[str], update_data: Dict[str, Any]) -> int:
        """Bulk update users"""
        updated_count = self.db.query(User).filter(
            User.id.in_(user_ids)
        ).update(update_data, synchronize_session=False)
        
        self.db.commit()
        
        return updated_count
    
    def search_users_advanced(
        self,
        filters: Dict[str, Any],
        skip: int = 0,
        limit: int = 100
    ) -> Tuple[List[User], int]:
        """Advanced user search with complex filters"""
        query = self.db.query(User)
        
        # Date range filters
        if filters.get("created_after"):
            query = query.filter(User.created_at >= filters["created_after"])
        
        if filters.get("created_before"):
            query = query.filter(User.created_at <= filters["created_before"])
        
        if filters.get("last_login_after"):
            query = query.filter(User.last_login_at >= filters["last_login_after"])
        
        if filters.get("last_login_before"):
            query = query.filter(User.last_login_at <= filters["last_login_before"])
        
        # Multiple values filters
        if filters.get("roles"):
            query = query.filter(User.role.in_(filters["roles"]))
        
        if filters.get("subscription_plans"):
            query = query.filter(User.subscription_plan.in_(filters["subscription_plans"]))
        
        # Boolean filters
        if filters.get("is_active") is not None:
            query = query.filter(User.is_active == filters["is_active"])
        
        # Text search
        if filters.get("search"):
            search_term = f"%{filters['search']}%"
            query = query.filter(
                or_(
                    User.email.ilike(search_term),
                    User.name.ilike(search_term)
                )
            )
        
        total = query.count()
        users = query.offset(skip).limit(limit).all()
        
        return users, total