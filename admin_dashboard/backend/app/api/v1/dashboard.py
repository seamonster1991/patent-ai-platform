"""
Dashboard API endpoints
대시보드 메트릭 및 통계 API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone, timedelta
import logging

from app.core.database import get_db, DatabaseManager
from app.core.security import get_current_admin, require_permission

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic 모델들
class DashboardStats(BaseModel):
    total_users: int
    active_users_today: int
    total_revenue: float
    monthly_revenue: float
    total_searches: int
    searches_today: int
    system_uptime: float
    active_sessions: int

class MetricData(BaseModel):
    timestamp: datetime
    value: float
    label: str

class ChartData(BaseModel):
    labels: List[str]
    datasets: List[Dict[str, Any]]

class SystemHealth(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    database_connections: int
    response_time: float
    uptime: int

class RecentActivity(BaseModel):
    id: str
    admin_name: str
    action: str
    resource_type: str
    timestamp: datetime
    success: bool

@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """대시보드 주요 통계 조회"""
    
    try:
        # 총 사용자 수
        total_users_query = "SELECT COUNT(*) as count FROM users WHERE deleted_at IS NULL"
        total_users_result = await db.execute_one(total_users_query)
        total_users = total_users_result["count"] if total_users_result else 0
        
        # 오늘 활성 사용자 수
        active_users_query = """
        SELECT COUNT(DISTINCT user_id) as count 
        FROM user_activities 
        WHERE created_at >= CURRENT_DATE
        """
        active_users_result = await db.execute_one(active_users_query)
        active_users_today = active_users_result["count"] if active_users_result else 0
        
        # 총 수익
        total_revenue_query = """
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payment_transactions 
        WHERE status = 'completed'
        """
        total_revenue_result = await db.execute_one(total_revenue_query)
        total_revenue = float(total_revenue_result["total"]) if total_revenue_result else 0.0
        
        # 이번 달 수익
        monthly_revenue_query = """
        SELECT COALESCE(SUM(amount), 0) as total 
        FROM payment_transactions 
        WHERE status = 'completed' 
        AND created_at >= date_trunc('month', CURRENT_DATE)
        """
        monthly_revenue_result = await db.execute_one(monthly_revenue_query)
        monthly_revenue = float(monthly_revenue_result["total"]) if monthly_revenue_result else 0.0
        
        # 총 검색 수
        total_searches_query = "SELECT COUNT(*) as count FROM search_history"
        total_searches_result = await db.execute_one(total_searches_query)
        total_searches = total_searches_result["count"] if total_searches_result else 0
        
        # 오늘 검색 수
        searches_today_query = """
        SELECT COUNT(*) as count 
        FROM search_history 
        WHERE created_at >= CURRENT_DATE
        """
        searches_today_result = await db.execute_one(searches_today_query)
        searches_today = searches_today_result["count"] if searches_today_result else 0
        
        # 시스템 업타임 (임시로 100% 설정)
        system_uptime = 99.9
        
        # 활성 세션 수
        active_sessions_query = """
        SELECT COUNT(*) as count 
        FROM admin_sessions 
        WHERE is_active = true AND expires_at > now()
        """
        active_sessions_result = await db.execute_one(active_sessions_query)
        active_sessions = active_sessions_result["count"] if active_sessions_result else 0
        
        return DashboardStats(
            total_users=total_users,
            active_users_today=active_users_today,
            total_revenue=total_revenue,
            monthly_revenue=monthly_revenue,
            total_searches=total_searches,
            searches_today=searches_today,
            system_uptime=system_uptime,
            active_sessions=active_sessions
        )
        
    except Exception as e:
        logger.error(f"대시보드 통계 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="통계 데이터를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/metrics/users", response_model=ChartData)
async def get_user_metrics(
    period: str = Query("7d", regex="^(24h|7d|30d|90d)$"),
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """사용자 메트릭 차트 데이터"""
    
    try:
        # 기간별 쿼리 설정
        if period == "24h":
            interval = "1 hour"
            date_format = "HH24:00"
            date_trunc = "hour"
        elif period == "7d":
            interval = "1 day"
            date_format = "MM-DD"
            date_trunc = "day"
        elif period == "30d":
            interval = "1 day"
            date_format = "MM-DD"
            date_trunc = "day"
        else:  # 90d
            interval = "1 week"
            date_format = "MM-DD"
            date_trunc = "week"
        
        # 신규 사용자 데이터
        new_users_query = f"""
        SELECT 
            to_char(date_trunc('{date_trunc}', created_at), '{date_format}') as label,
            COUNT(*) as value
        FROM users 
        WHERE created_at >= now() - interval '{period.replace('d', ' days').replace('h', ' hours')}'
        AND deleted_at IS NULL
        GROUP BY date_trunc('{date_trunc}', created_at)
        ORDER BY date_trunc('{date_trunc}', created_at)
        """
        
        new_users_data = await db.execute_query(new_users_query)
        
        # 활성 사용자 데이터
        active_users_query = f"""
        SELECT 
            to_char(date_trunc('{date_trunc}', created_at), '{date_format}') as label,
            COUNT(DISTINCT user_id) as value
        FROM user_activities 
        WHERE created_at >= now() - interval '{period.replace('d', ' days').replace('h', ' hours')}'
        GROUP BY date_trunc('{date_trunc}', created_at)
        ORDER BY date_trunc('{date_trunc}', created_at)
        """
        
        active_users_data = await db.execute_query(active_users_query)
        
        # 라벨 생성
        labels = list(set([item["label"] for item in new_users_data + active_users_data]))
        labels.sort()
        
        # 데이터셋 생성
        new_users_values = []
        active_users_values = []
        
        for label in labels:
            new_count = next((item["value"] for item in new_users_data if item["label"] == label), 0)
            active_count = next((item["value"] for item in active_users_data if item["label"] == label), 0)
            
            new_users_values.append(new_count)
            active_users_values.append(active_count)
        
        return ChartData(
            labels=labels,
            datasets=[
                {
                    "label": "신규 사용자",
                    "data": new_users_values,
                    "borderColor": "rgb(59, 130, 246)",
                    "backgroundColor": "rgba(59, 130, 246, 0.1)",
                    "type": "line"
                },
                {
                    "label": "활성 사용자",
                    "data": active_users_values,
                    "borderColor": "rgb(16, 185, 129)",
                    "backgroundColor": "rgba(16, 185, 129, 0.1)",
                    "type": "line"
                }
            ]
        )
        
    except Exception as e:
        logger.error(f"사용자 메트릭 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="사용자 메트릭 데이터를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/metrics/revenue", response_model=ChartData)
async def get_revenue_metrics(
    period: str = Query("30d", regex="^(7d|30d|90d|1y)$"),
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """수익 메트릭 차트 데이터"""
    
    try:
        # 기간별 쿼리 설정
        if period == "7d":
            date_format = "MM-DD"
            date_trunc = "day"
        elif period == "30d":
            date_format = "MM-DD"
            date_trunc = "day"
        elif period == "90d":
            date_format = "MM-DD"
            date_trunc = "week"
        else:  # 1y
            date_format = "YYYY-MM"
            date_trunc = "month"
        
        # 수익 데이터
        revenue_query = f"""
        SELECT 
            to_char(date_trunc('{date_trunc}', created_at), '{date_format}') as label,
            COALESCE(SUM(amount), 0) as revenue,
            COUNT(*) as transactions
        FROM payment_transactions 
        WHERE status = 'completed'
        AND created_at >= now() - interval '{period.replace('d', ' days').replace('y', ' year')}'
        GROUP BY date_trunc('{date_trunc}', created_at)
        ORDER BY date_trunc('{date_trunc}', created_at)
        """
        
        revenue_data = await db.execute_query(revenue_query)
        
        labels = [item["label"] for item in revenue_data]
        revenue_values = [float(item["revenue"]) for item in revenue_data]
        transaction_values = [item["transactions"] for item in revenue_data]
        
        return ChartData(
            labels=labels,
            datasets=[
                {
                    "label": "수익 (원)",
                    "data": revenue_values,
                    "borderColor": "rgb(34, 197, 94)",
                    "backgroundColor": "rgba(34, 197, 94, 0.1)",
                    "type": "bar",
                    "yAxisID": "y"
                },
                {
                    "label": "거래 수",
                    "data": transaction_values,
                    "borderColor": "rgb(168, 85, 247)",
                    "backgroundColor": "rgba(168, 85, 247, 0.1)",
                    "type": "line",
                    "yAxisID": "y1"
                }
            ]
        )
        
    except Exception as e:
        logger.error(f"수익 메트릭 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="수익 메트릭 데이터를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/system-health", response_model=SystemHealth)
async def get_system_health(
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """시스템 상태 조회"""
    
    try:
        # 데이터베이스 연결 수 조회
        db_connections_query = """
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
        """
        db_connections_result = await db.execute_one(db_connections_query)
        db_connections = db_connections_result["connections"] if db_connections_result else 0
        
        # 평균 응답 시간 (임시 데이터)
        avg_response_time = 150.5
        
        # 시스템 메트릭 (임시 데이터 - 실제로는 시스템 모니터링 도구에서 가져와야 함)
        return SystemHealth(
            cpu_usage=45.2,
            memory_usage=68.7,
            disk_usage=34.1,
            database_connections=db_connections,
            response_time=avg_response_time,
            uptime=86400  # 1일 (초)
        )
        
    except Exception as e:
        logger.error(f"시스템 상태 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시스템 상태 데이터를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/system-metrics")
async def get_system_metrics(
    period: str = Query("1h", regex="^(1h|24h|7d)$"),
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """
    시스템 메트릭 데이터 조회
    """
    try:
        # 실제 시스템 메트릭 조회
        system_metrics_query = """
        SELECT 
            metric_name,
            metric_value,
            metric_unit,
            status,
            description,
            updated_at
        FROM system_metrics 
        WHERE updated_at >= now() - interval '1 hour'
        ORDER BY updated_at DESC
        """
        
        metrics_data = await db.execute_query(system_metrics_query)
        
        # 기본 메트릭이 없는 경우 기본값 제공
        if not metrics_data:
            # 데이터베이스 연결 수 조회
            db_connections_query = """
            SELECT count(*) as connections 
            FROM pg_stat_activity 
            WHERE state = 'active'
            """
            db_connections_result = await db.execute_one(db_connections_query)
            db_connections = db_connections_result["connections"] if db_connections_result else 0
            
            # API 성능 로그에서 평균 응답 시간 조회
            avg_response_query = """
            SELECT AVG(response_time_ms) as avg_response_time
            FROM api_performance_logs
            WHERE created_at >= now() - interval '1 hour'
            """
            avg_response_result = await db.execute_one(avg_response_query)
            avg_response_time = avg_response_result["avg_response_time"] if avg_response_result else 150
            
            system_metrics = [
                {
                    "name": "데이터베이스 연결",
                    "description": "현재 활성 데이터베이스 연결 수",
                    "value": str(db_connections),
                    "status": "healthy" if db_connections < 50 else "warning"
                },
                {
                    "name": "API 응답 시간",
                    "description": "평균 API 응답 시간",
                    "value": f"{round(float(avg_response_time), 1)}ms",
                    "status": "healthy" if avg_response_time < 200 else "warning"
                },
                {
                    "name": "시스템 상태",
                    "description": "전체 시스템 상태",
                    "value": "정상",
                    "status": "healthy"
                }
            ]
        else:
            system_metrics = [
                {
                    "name": metric["metric_name"],
                    "description": metric["description"],
                    "value": f"{metric['metric_value']}{metric['metric_unit']}",
                    "status": metric["status"]
                }
                for metric in metrics_data
            ]
        
        return system_metrics
        
    except Exception as e:
        logger.error(f"시스템 메트릭 조회 오류: {e}")
        return []

@router.get("/recent-activities")
async def get_recent_activities(
    limit: int = Query(10, ge=1, le=100),
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """최근 활동 로그 조회"""
    
    try:
        # 실제 사용자 활동 로그 조회
        activities_query = """
        SELECT 
            ua.id,
            ua.activity_type,
            ua.description,
            ua.created_at,
            u.email as user_email,
            u.name as user_name
        FROM user_activities ua
        LEFT JOIN users u ON ua.user_id = u.id
        WHERE ua.created_at >= now() - interval '24 hours'
        ORDER BY ua.created_at DESC
        LIMIT $1
        """
        
        activities_data = await db.execute_query(activities_query, limit)
        
        # 관리자 활동 로그도 포함
        admin_activities_query = """
        SELECT 
            aal.id,
            aal.action as activity_type,
            aal.description,
            aal.created_at,
            au.email as user_email,
            au.name as user_name
        FROM admin_activity_logs aal
        LEFT JOIN admin_users au ON aal.admin_id = au.id
        WHERE aal.created_at >= now() - interval '24 hours'
        ORDER BY aal.created_at DESC
        LIMIT $1
        """
        
        admin_activities_data = await db.execute_query(admin_activities_query, limit // 2)
        
        # 두 활동을 합치고 시간순으로 정렬
        all_activities = []
        
        for activity in activities_data:
            all_activities.append({
                "id": str(activity["id"]),
                "type": "user_action",
                "description": activity["description"] or f"사용자 활동: {activity['activity_type']}",
                "timestamp": activity["created_at"].isoformat() + "Z",
                "user_email": activity["user_email"] or "unknown@example.com",
                "user_name": activity["user_name"] or "Unknown User"
            })
        
        for activity in admin_activities_data:
            all_activities.append({
                "id": str(activity["id"]),
                "type": "admin_action",
                "description": activity["description"] or f"관리자 활동: {activity['activity_type']}",
                "timestamp": activity["created_at"].isoformat() + "Z",
                "user_email": activity["user_email"] or "admin@example.com",
                "user_name": activity["user_name"] or "Admin User"
            })
        
        # 시간순으로 정렬하고 제한
        all_activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return all_activities[:limit]
        
    except Exception as e:
        logger.error(f"활동 조회 오류: {e}")
        # 오류 발생 시 빈 배열 반환
        return []

@router.get("/alerts")
async def get_system_alerts(
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """시스템 알림 조회"""
    
    try:
        # 시스템 알림 조회
        alerts_query = """
        SELECT * FROM system_alerts 
        WHERE is_resolved = false 
        ORDER BY created_at DESC 
        LIMIT 10
        """
        
        alerts = await db.execute_query(alerts_query)
        
        # 관리자 알림 조회
        admin_notifications_query = """
        SELECT * FROM admin_notifications 
        WHERE admin_id = $1 AND is_read = false 
        ORDER BY created_at DESC 
        LIMIT 5
        """
        
        notifications = await db.execute_query(admin_notifications_query, current_admin["id"])
        
        return {
            "system_alerts": alerts,
            "admin_notifications": notifications
        }
        
    except Exception as e:
        logger.error(f"알림 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="알림 데이터를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/metrics")
async def get_dashboard_metrics(
    period: str = Query("7d", regex="^(1h|24h|7d|30d|90d)$"),
    db: DatabaseManager = Depends(get_db)
):
    """
    대시보드 메트릭 데이터 조회 - 실제 Supabase 데이터 조회
    """
    try:
        # 실제 Supabase 데이터 조회
        
        # 총 사용자 수 조회
        total_users_result = await db.execute_query(
            "SELECT COUNT(*) as count FROM users"
        )
        total_users = total_users_result[0]['count'] if total_users_result else 0
        
        # 활성 사용자 수 조회 (최근 7일 내 로그인)
        active_users_result = await db.execute_query(
            """
            SELECT COUNT(DISTINCT user_id) as count 
            FROM user_sessions 
            WHERE created_at >= NOW() - INTERVAL '7 days'
            """
        )
        active_users = active_users_result[0]['count'] if active_users_result else 0
        
        # 총 수익 조회
        total_revenue_result = await db.execute_query(
            """
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payment_transactions 
            WHERE status = 'success'
            """
        )
        total_revenue = total_revenue_result[0]['total'] if total_revenue_result else 0
        
        # 월간 수익 조회
        monthly_revenue_result = await db.execute_query(
            """
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payment_transactions 
            WHERE status = 'success' 
            AND created_at >= DATE_TRUNC('month', NOW())
            """
        )
        monthly_revenue = monthly_revenue_result[0]['total'] if monthly_revenue_result else 0
        
        # 총 특허 분석 수 조회
        total_analyses_result = await db.execute_query(
            "SELECT COUNT(*) as count FROM ai_analysis_reports"
        )
        total_analyses = total_analyses_result[0]['count'] if total_analyses_result else 0
        
        # 대기 중인 분석 수 조회
        pending_analyses_result = await db.execute_query(
            """
            SELECT COUNT(*) as count 
            FROM ai_analysis_reports 
            WHERE status = 'pending'
            """
        )
        pending_analyses = pending_analyses_result[0]['count'] if pending_analyses_result else 0
        
        # 성장률 계산 (이전 기간 대비)
        period_days = {"1h": 1, "24h": 1, "7d": 7, "30d": 30, "90d": 90}[period]
        
        # 사용자 성장률
        prev_users_result = await db.execute_query(
            f"""
            SELECT COUNT(*) as count 
            FROM users 
            WHERE created_at <= NOW() - INTERVAL '{period_days} days'
            """
        )
        prev_users = prev_users_result[0]['count'] if prev_users_result else 1
        user_growth_rate = ((total_users - prev_users) / max(prev_users, 1)) * 100
        
        # 수익 성장률
        prev_revenue_result = await db.execute_query(
            f"""
            SELECT COALESCE(SUM(amount), 0) as total 
            FROM payment_transactions 
            WHERE status = 'success' 
            AND created_at <= NOW() - INTERVAL '{period_days} days'
            """
        )
        prev_revenue = prev_revenue_result[0]['total'] if prev_revenue_result else 1
        revenue_growth_rate = ((total_revenue - prev_revenue) / max(prev_revenue, 1)) * 100
        
        # 분석 성장률
        prev_analyses_result = await db.execute_query(
            f"""
            SELECT COUNT(*) as count 
            FROM ai_analysis_reports 
            WHERE created_at <= NOW() - INTERVAL '{period_days} days'
            """
        )
        prev_analyses = prev_analyses_result[0]['count'] if prev_analyses_result else 1
        analysis_growth_rate = ((total_analyses - prev_analyses) / max(prev_analyses, 1)) * 100
        
        # 시스템 상태 데이터 (실제 시스템 모니터링 데이터로 대체 가능)
        import psutil
        system_health = {
            "status": "healthy",
            "cpu_usage": psutil.cpu_percent(interval=1),
            "memory_usage": psutil.virtual_memory().percent,
            "disk_usage": psutil.disk_usage('/').percent
        }
        
        # 최근 활동 데이터
        recent_activities_result = await db.execute_query(
            """
            SELECT 
                ar.id,
                'patent_analysis' as type,
                CONCAT('특허 분석: ', ar.patent_number) as description,
                ar.created_at as timestamp,
                u.email as user_email
            FROM ai_analysis_reports ar
            JOIN users u ON ar.user_id = u.id
            ORDER BY ar.created_at DESC
            LIMIT 5
            """
        )
        
        recent_activities = [
            {
                "id": str(activity['id']),
                "type": activity['type'],
                "description": activity['description'],
                "timestamp": activity['timestamp'].isoformat() if activity['timestamp'] else None,
                "user_email": activity['user_email']
            }
            for activity in recent_activities_result
        ] if recent_activities_result else []
        
        return {
            "total_users": total_users,
            "active_users": active_users,
            "total_revenue": float(total_revenue),
            "monthly_revenue": float(monthly_revenue),
            "total_patents": total_analyses,  # 특허 분석 수로 대체
            "pending_patents": pending_analyses,
            "total_analyses": total_analyses,
            "user_growth_rate": round(user_growth_rate, 1),
            "revenue_growth_rate": round(revenue_growth_rate, 1),
            "analysis_growth_rate": round(analysis_growth_rate, 1),
            "system_health": system_health,
            "recent_activities": recent_activities
        }
        
    except Exception as e:
        logger.error(f"메트릭 조회 오류: {e}")
        # 오류 발생 시 기본값 반환
        return {
            "total_users": 0,
            "active_users": 0,
            "total_revenue": 0.0,
            "monthly_revenue": 0.0,
            "total_patents": 0,
            "pending_patents": 0,
            "total_analyses": 0,
            "user_growth_rate": 0.0,
            "revenue_growth_rate": 0.0,
            "analysis_growth_rate": 0.0,
            "system_health": {
                "status": "unknown",
                "cpu_usage": 0,
                "memory_usage": 0,
                "disk_usage": 0
            },
            "recent_activities": []
        }

@router.get("/activities")
async def get_dashboard_activities(
    limit: int = Query(10, ge=1, le=50),
    page: int = Query(1, ge=1),
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """
    대시보드 최근 활동 조회
    """
    try:
        offset = (page - 1) * limit
        
        # 사용자 활동 로그 조회
        activities_query = """
        SELECT 
            ua.id,
            ua.activity_type as action,
            ua.description,
            ua.created_at as timestamp,
            ua.ip_address,
            ua.user_agent,
            u.name as user_name,
            u.email as user_email,
            true as success
        FROM user_activities ua
        LEFT JOIN users u ON ua.user_id = u.id
        ORDER BY ua.created_at DESC
        LIMIT $1 OFFSET $2
        """
        
        activities_data = await db.execute_query(activities_query, limit, offset)
        
        # 총 활동 수 조회
        total_count_query = "SELECT COUNT(*) as count FROM user_activities"
        total_count_result = await db.execute_one(total_count_query)
        total_count = total_count_result["count"] if total_count_result else 0
        
        # 활동 데이터 포맷팅
        activities = []
        for activity in activities_data:
            activities.append({
                "id": str(activity["id"]),
                "user_name": activity["user_name"] or "Unknown User",
                "action": activity["action"] or "Unknown Action",
                "timestamp": activity["timestamp"].isoformat() if activity["timestamp"] else "",
                "success": activity["success"],
                "ip_address": activity["ip_address"] or "Unknown IP",
                "user_agent": activity["user_agent"] or "Unknown User Agent",
                "description": activity["description"] or ""
            })
        
        return {
            "activities": activities,
            "total_count": total_count,
            "page": page,
            "per_page": limit
        }
        
    except Exception as e:
        logger.error(f"활동 조회 오류: {e}")
        return {
            "activities": [],
            "total_count": 0,
            "page": page,
            "per_page": limit
        }

# 새로운 Pydantic 모델들 추가
class ExtendedDashboardStats(BaseModel):
    total_users: int
    total_logins: int
    total_searches: int
    total_reports: int
    avg_logins_per_user: float
    avg_searches_per_user: float
    avg_reports_per_user: float
    login_to_report_conversion: float
    search_to_report_conversion: float

class PopularKeyword(BaseModel):
    keyword: str
    search_count: int

class PopularPatent(BaseModel):
    application_number: str
    invention_title: str
    analysis_count: int

class UserDeleteResponse(BaseModel):
    success: bool
    message: str

@router.get("/extended-stats", response_model=ExtendedDashboardStats)
async def get_extended_dashboard_stats(
    period_days: int = Query(30, ge=1, le=365),
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """확장된 대시보드 통계 조회"""
    
    try:
        # 데이터베이스 함수 호출
        stats_query = "SELECT * FROM get_dashboard_extended_stats($1)"
        stats_result = await db.execute_one(stats_query, period_days)
        
        if not stats_result:
            # 기본값 반환
            return ExtendedDashboardStats(
                total_users=0,
                total_logins=0,
                total_searches=0,
                total_reports=0,
                avg_logins_per_user=0.0,
                avg_searches_per_user=0.0,
                avg_reports_per_user=0.0,
                login_to_report_conversion=0.0,
                search_to_report_conversion=0.0
            )
        
        return ExtendedDashboardStats(
            total_users=int(stats_result["total_users"]),
            total_logins=int(stats_result["total_logins"]),
            total_searches=int(stats_result["total_searches"]),
            total_reports=int(stats_result["total_reports"]),
            avg_logins_per_user=float(stats_result["avg_logins_per_user"]),
            avg_searches_per_user=float(stats_result["avg_searches_per_user"]),
            avg_reports_per_user=float(stats_result["avg_reports_per_user"]),
            login_to_report_conversion=float(stats_result["login_to_report_conversion"]),
            search_to_report_conversion=float(stats_result["search_to_report_conversion"])
        )
        
    except Exception as e:
        logger.error(f"확장된 대시보드 통계 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="확장된 통계 데이터를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/popular-keywords", response_model=List[PopularKeyword])
async def get_popular_keywords(
    period_days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """인기 검색어 상위 목록 조회"""
    
    try:
        # 데이터베이스 함수 호출
        keywords_query = "SELECT * FROM get_popular_keywords($1, $2)"
        keywords_result = await db.execute_query(keywords_query, period_days, limit)
        
        return [
            PopularKeyword(
                keyword=row["keyword"],
                search_count=int(row["search_count"])
            )
            for row in keywords_result
        ]
        
    except Exception as e:
        logger.error(f"인기 검색어 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="인기 검색어 데이터를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/popular-patents", response_model=List[PopularPatent])
async def get_popular_patents(
    period_days: int = Query(30, ge=1, le=365),
    limit: int = Query(10, ge=1, le=50),
    current_admin: Dict[str, Any] = Depends(require_permission("dashboard.read")),
    db: DatabaseManager = Depends(get_db)
):
    """인기 특허 상위 목록 조회"""
    
    try:
        # 데이터베이스 함수 호출
        patents_query = "SELECT * FROM get_popular_patents($1, $2)"
        patents_result = await db.execute_query(patents_query, period_days, limit)
        
        return [
            PopularPatent(
                application_number=row["application_number"],
                invention_title=row["invention_title"],
                analysis_count=int(row["analysis_count"])
            )
            for row in patents_result
        ]
        
    except Exception as e:
        logger.error(f"인기 특허 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="인기 특허 데이터를 가져오는 중 오류가 발생했습니다"
        )