"""
System monitoring API routes
"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
import psutil
from datetime import datetime, timedelta

from app.database import get_db
from app.dependencies import get_current_active_admin
from app.models.admin import AdminUser
from app.core.supabase import get_supabase_client

router = APIRouter()


@router.get("/health")
async def get_system_health(
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get current system health metrics"""
    try:
        # Get basic system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        return {
            "status": "healthy" if cpu_percent < 80 and memory.percent < 80 else "warning",
            "cpu_usage": cpu_percent,
            "memory_usage": memory.percent,
            "disk_usage": disk.percent,
            "uptime": psutil.boot_time(),
            "timestamp": datetime.utcnow().isoformat()
        }
    except Exception as e:
        return {
            "status": "error",
            "cpu_usage": 0,
            "memory_usage": 0,
            "disk_usage": 0,
            "uptime": 0,
            "timestamp": datetime.utcnow().isoformat(),
            "error": str(e)
        }


@router.get("/realtime")
async def get_realtime_metrics(
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get real-time system metrics"""
    try:
        supabase = get_supabase_client()
        
        # Get recent user activities as a proxy for system activity
        recent_activities = supabase.table('user_activities').select('id', count='exact').gte('created_at', (datetime.utcnow() - timedelta(minutes=5)).isoformat()).execute()
        
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu_usage": cpu_percent,
            "memory_usage": memory.percent,
            "active_users": 0,  # Would need proper session tracking
            "requests_per_minute": recent_activities.count if recent_activities.count else 0,
            "error_rate": 0.0,  # Would need proper error logging
            "response_time": 0.0  # Would need proper API logging
        }
    except Exception as e:
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "cpu_usage": 0,
            "memory_usage": 0,
            "active_users": 0,
            "requests_per_minute": 0,
            "error_rate": 0.0,
            "response_time": 0.0,
            "error": str(e)
        }


@router.get("/performance")
async def get_performance_metrics(
    hours: int = Query(24, ge=1, le=168),  # Max 1 week
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get performance metrics for the specified time period"""
    try:
        # For now, return simplified performance metrics
        # In a real implementation, you would store and retrieve historical data
        return {
            "api_performance": {
                "total_requests": 0,
                "error_requests": 0,
                "error_rate": 0.0,
                "avg_response_time": 0.0,
                "max_response_time": 0.0,
                "min_response_time": 0.0,
                "requests_per_minute": 0.0
            },
            "system_performance": {
                "cpu_trend": [],
                "memory_trend": [],
                "avg_cpu": 0.0,
                "avg_memory": 0.0
            }
        }
    except Exception as e:
        return {
            "api_performance": {
                "total_requests": 0,
                "error_requests": 0,
                "error_rate": 0.0,
                "avg_response_time": 0.0,
                "max_response_time": 0.0,
                "min_response_time": 0.0,
                "requests_per_minute": 0.0
            },
            "system_performance": {
                "cpu_trend": [],
                "memory_trend": [],
                "avg_cpu": 0.0,
                "avg_memory": 0.0
            },
            "error": str(e)
        }


@router.get("/metrics/history")
async def get_metrics_history(
    metric_name: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    limit: int = Query(1000, ge=1, le=10000),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get system metrics history"""
    monitoring_service = MonitoringService(db)
    metrics = monitoring_service.get_system_metrics_history(
        metric_name=metric_name,
        category=category,
        hours=hours,
        limit=limit
    )
    
    return {
        "metrics": [
            {
                "id": metric.id,
                "metric_name": metric.metric_name,
                "metric_value": metric.metric_value,
                "metric_unit": metric.metric_unit,
                "category": metric.category,
                "metadata": metric.metadata,
                "created_at": metric.created_at
            }
            for metric in metrics
        ],
        "total": len(metrics)
    }


@router.post("/metrics")
async def record_system_metric(
    metric_data: SystemMetricCreate,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Record system metric"""
    monitoring_service = MonitoringService(db)
    metric = monitoring_service.record_system_metric(metric_data)
    
    return {
        "id": metric.id,
        "metric_name": metric.metric_name,
        "metric_value": metric.metric_value,
        "metric_unit": metric.metric_unit,
        "category": metric.category,
        "created_at": metric.created_at
    }


@router.get("/logs/api")
async def get_api_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    endpoint: Optional[str] = Query(None),
    method: Optional[str] = Query(None),
    status_code: Optional[int] = Query(None),
    user_id: Optional[str] = Query(None),
    hours: int = Query(24, ge=1, le=168),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get API logs with filtering"""
    monitoring_service = MonitoringService(db)
    logs, total = monitoring_service.get_api_logs(
        skip=skip,
        limit=limit,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        user_id=user_id,
        hours=hours
    )
    
    return {
        "logs": [
            {
                "id": log.id,
                "endpoint": log.endpoint,
                "method": log.method,
                "status_code": log.status_code,
                "response_time": log.response_time,
                "user_id": log.user_id,
                "ip_address": log.ip_address,
                "user_agent": log.user_agent,
                "request_size": log.request_size,
                "response_size": log.response_size,
                "metadata": log.metadata,
                "created_at": log.created_at
            }
            for log in logs
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }


@router.post("/logs/api")
async def log_api_request(
    log_data: APILogCreate,
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Log API request"""
    monitoring_service = MonitoringService(db)
    log = monitoring_service.log_api_request(log_data)
    
    return {
        "id": log.id,
        "endpoint": log.endpoint,
        "method": log.method,
        "status_code": log.status_code,
        "created_at": log.created_at
    }


@router.get("/errors/analysis")
async def get_error_analysis(
    hours: int = Query(24, ge=1, le=168),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get error analysis for the specified time period"""
    monitoring_service = MonitoringService(db)
    return monitoring_service.get_error_analysis(hours)


@router.get("/database/stats")
async def get_database_stats(
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Get database statistics"""
    monitoring_service = MonitoringService(db)
    return monitoring_service.get_database_stats()


@router.post("/cleanup")
async def cleanup_old_logs(
    days: int = Query(30, ge=1, le=365),
    current_admin: AdminUser = Depends(get_current_active_admin),
    db: Session = Depends(get_db)
):
    """Clean up old logs and metrics"""
    monitoring_service = MonitoringService(db)
    result = monitoring_service.cleanup_old_logs(days)
    
    return {
        "message": f"Cleaned up logs older than {days} days",
        "deleted_api_logs": result["deleted_api_logs"],
        "deleted_metrics": result["deleted_metrics"]
    }