"""
Dashboard API routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.admin import AdminUserResponse
from app.services.dashboard_service import DashboardService
from app.dependencies import get_current_active_admin

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])


@router.get("/metrics")
async def get_dashboard_metrics(
    current_admin: AdminUserResponse = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get comprehensive dashboard metrics"""
    dashboard_service = DashboardService(db)
    return dashboard_service.get_dashboard_metrics()


@router.get("/realtime")
async def get_realtime_metrics(
    current_admin: AdminUserResponse = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get real-time metrics"""
    dashboard_service = DashboardService(db)
    return dashboard_service.get_realtime_metrics()


@router.get("/overview")
async def get_dashboard_overview(
    current_admin: AdminUserResponse = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard overview with key metrics"""
    dashboard_service = DashboardService(db)
    metrics = dashboard_service.get_dashboard_metrics()
    
    return {
        "overview": {
            "total_users": metrics.get("total_users", 0),
            "active_users": metrics.get("active_users", 0),
            "total_revenue": metrics.get("total_revenue", 0),
            "monthly_revenue": metrics.get("monthly_revenue", 0),
            "user_growth_rate": metrics.get("user_growth_rate", 0.0),
            "revenue_growth_rate": metrics.get("revenue_growth_rate", 0.0),
            "api_calls_today": metrics.get("api_calls_today", 0),
            "error_rate": metrics.get("error_rate", 0.0)
        },
        "recent_activity": {
            "recent_users": metrics.get("recent_users", 0),
            "recent_payments": metrics.get("recent_payments", 0),
            "recent_errors": metrics.get("recent_errors", 0)
        },
        "last_updated": metrics.get("last_updated")
    }


@router.get("/charts")
async def get_dashboard_charts(
    current_admin: AdminUserResponse = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get dashboard chart data"""
    dashboard_service = DashboardService(db)
    
    # For now, return simplified chart data
    # In a real implementation, you would generate charts from Supabase data
    return {
        "user_growth": {
            "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            "data": [10, 25, 40, 60, 85, 100]
        },
        "revenue": {
            "labels": ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
            "data": [1000, 2500, 4000, 6000, 8500, 10000]
        },
        "api_usage": {
            "labels": ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00"],
            "data": [120, 80, 200, 350, 280, 150]
        }
    }


@router.get("/activities")
async def get_dashboard_activities(
    current_admin: AdminUserResponse = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get recent user activities"""
    dashboard_service = DashboardService(db)
    
    try:
        # Get recent activities from Supabase
        activities_result = dashboard_service.supabase.table('user_activities').select(
            'id, user_id, activity_type, activity_data, created_at'
        ).order('created_at', desc=True).limit(50).execute()
        
        activities = activities_result.data if activities_result.data else []
        
        # Format activities for frontend
        formatted_activities = []
        for activity in activities:
            formatted_activities.append({
                "id": activity.get("id"),
                "user_id": activity.get("user_id"),
                "type": activity.get("activity_type"),
                "description": f"{activity.get('activity_type', 'Unknown')} activity",
                "timestamp": activity.get("created_at"),
                "details": activity.get("activity_data", {})
            })
        
        return {
            "activities": formatted_activities,
            "total": len(formatted_activities)
        }
        
    except Exception as e:
        # Return empty activities if there's an error
        return {
            "activities": [],
            "total": 0
        }