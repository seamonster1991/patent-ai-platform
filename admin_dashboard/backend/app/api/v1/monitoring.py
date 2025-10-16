"""
System Monitoring API endpoints
시스템 모니터링 API
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import psutil
import logging
import asyncio
import time

from app.core.database import get_db, DatabaseManager
from app.core.security import get_current_admin, require_permission

logger = logging.getLogger(__name__)
router = APIRouter()

# Pydantic 모델들
class SystemHealth(BaseModel):
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    database_connections: int
    response_time: float
    uptime: str
    status: str

class MetricData(BaseModel):
    timestamp: datetime
    value: float
    metric_type: str

class AlertResponse(BaseModel):
    id: str
    alert_type: str
    severity: str
    message: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]

class SystemLog(BaseModel):
    id: str
    level: str
    message: str
    source: str
    timestamp: datetime
    details: Optional[Dict[str, Any]]

class PerformanceMetrics(BaseModel):
    avg_response_time: float
    requests_per_minute: float
    error_rate: float
    active_sessions: int
    database_query_time: float

# 시스템 시작 시간 저장
system_start_time = time.time()

def get_system_uptime() -> str:
    """시스템 업타임 계산"""
    uptime_seconds = time.time() - system_start_time
    uptime_delta = timedelta(seconds=uptime_seconds)
    
    days = uptime_delta.days
    hours, remainder = divmod(uptime_delta.seconds, 3600)
    minutes, _ = divmod(remainder, 60)
    
    if days > 0:
        return f"{days}일 {hours}시간 {minutes}분"
    elif hours > 0:
        return f"{hours}시간 {minutes}분"
    else:
        return f"{minutes}분"

async def measure_db_response_time(db: DatabaseManager) -> float:
    """데이터베이스 응답 시간 측정"""
    start_time = time.time()
    try:
        await db.execute_one("SELECT 1")
        return (time.time() - start_time) * 1000  # 밀리초 단위
    except Exception:
        return -1  # 오류 시 -1 반환

@router.get("/health", response_model=SystemHealth)
async def get_system_health(
    current_admin: Dict[str, Any] = Depends(require_permission("monitoring.read")),
    db: DatabaseManager = Depends(get_db)
):
    """시스템 상태 조회"""
    
    try:
        # CPU 사용률
        cpu_usage = psutil.cpu_percent(interval=1)
        
        # 메모리 사용률
        memory = psutil.virtual_memory()
        memory_usage = memory.percent
        
        # 디스크 사용률
        disk = psutil.disk_usage('/')
        disk_usage = (disk.used / disk.total) * 100
        
        # 데이터베이스 연결 수 조회
        db_connections_query = """
        SELECT count(*) as connections 
        FROM pg_stat_activity 
        WHERE state = 'active'
        """
        db_connections_result = await db.execute_one(db_connections_query)
        database_connections = db_connections_result["connections"] if db_connections_result else 0
        
        # 데이터베이스 응답 시간 측정
        response_time = await measure_db_response_time(db)
        
        # 업타임
        uptime = get_system_uptime()
        
        # 전체 상태 판단
        status = "healthy"
        if cpu_usage > 80 or memory_usage > 80 or disk_usage > 80 or response_time > 1000:
            status = "warning"
        if cpu_usage > 95 or memory_usage > 95 or disk_usage > 95 or response_time > 5000:
            status = "critical"
        
        # 실시간 메트릭 저장
        metrics_query = """
        INSERT INTO real_time_metrics (metric_type, value, timestamp)
        VALUES 
            ('cpu_usage', $1, now()),
            ('memory_usage', $2, now()),
            ('disk_usage', $3, now()),
            ('response_time', $4, now())
        """
        
        await db.execute_command(metrics_query, cpu_usage, memory_usage, disk_usage, response_time)
        
        return SystemHealth(
            cpu_usage=cpu_usage,
            memory_usage=memory_usage,
            disk_usage=disk_usage,
            database_connections=database_connections,
            response_time=response_time,
            uptime=uptime,
            status=status
        )
        
    except Exception as e:
        logger.error(f"시스템 상태 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시스템 상태를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/metrics")
async def get_metrics(
    metric_type: str = Query("cpu_usage", regex="^(cpu_usage|memory_usage|disk_usage|response_time|requests_per_minute)$"),
    period: str = Query("1h", regex="^(1h|6h|24h|7d|30d)$")
):
    """메트릭 데이터 조회 (임시 데이터)"""
    
    try:
        import random
        from datetime import datetime, timedelta
        
        # 기간별 데이터 포인트 수 결정
        period_mapping = {
            "1h": (60, timedelta(minutes=1)),    # 1분 간격
            "6h": (72, timedelta(minutes=5)),    # 5분 간격
            "24h": (96, timedelta(minutes=15)),  # 15분 간격
            "7d": (168, timedelta(hours=1)),     # 1시간 간격
            "30d": (120, timedelta(hours=6))     # 6시간 간격
        }
        
        points, delta = period_mapping.get(period, (60, timedelta(minutes=1)))
        
        # 시간 라벨 생성
        now = datetime.now()
        timestamps = []
        for i in range(points):
            timestamps.append(now - delta * (points - 1 - i))
        
        # 메트릭별 임시 데이터 생성
        metric_ranges = {
            "cpu_usage": (10, 90),
            "memory_usage": (30, 85),
            "disk_usage": (20, 70),
            "response_time": (50, 500),
            "requests_per_minute": (10, 200)
        }
        
        min_val, max_val = metric_ranges.get(metric_type, (0, 100))
        
        # 실제 시스템 메트릭 가져오기 (가능한 경우)
        if metric_type == "cpu_usage":
            try:
                import psutil
                current_cpu = psutil.cpu_percent(interval=0.1)
                # 현재 값 주변으로 변동하는 데이터 생성
                base_value = current_cpu
            except:
                base_value = random.uniform(min_val, max_val)
        elif metric_type == "memory_usage":
            try:
                import psutil
                current_memory = psutil.virtual_memory().percent
                base_value = current_memory
            except:
                base_value = random.uniform(min_val, max_val)
        elif metric_type == "disk_usage":
            try:
                import psutil
                current_disk = psutil.disk_usage('/').percent
                base_value = current_disk
            except:
                base_value = random.uniform(min_val, max_val)
        else:
            base_value = random.uniform(min_val, max_val)
        
        # 데이터 포인트 생성 (기준값 주변으로 변동)
        values = []
        for i in range(points):
            # 기준값에서 ±20% 범위로 변동
            variation = random.uniform(-0.2, 0.2) * base_value
            value = max(min_val, min(max_val, base_value + variation))
            values.append(round(value, 2))
        
        # MetricData 객체 생성
        metrics = [
            {
                "timestamp": ts.isoformat(),
                "value": val,
                "metric_type": metric_type
            }
            for ts, val in zip(timestamps, values)
        ]
        
        return {"metrics": metrics, "period": period, "metric_type": metric_type}
        
    except Exception as e:
        logger.error(f"메트릭 데이터 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="메트릭 데이터를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/alerts", response_model=List[AlertResponse])
async def get_alerts(
    status_filter: Optional[str] = Query(None, alias="status"),
    severity: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    current_admin: Dict[str, Any] = Depends(require_permission("monitoring.read")),
    db: DatabaseManager = Depends(get_db)
):
    """시스템 알림 조회"""
    
    try:
        # 기본 쿼리
        base_query = """
        SELECT 
            id,
            alert_type,
            severity,
            message,
            status,
            created_at,
            resolved_at
        FROM system_alerts
        WHERE 1=1
        """
        
        # 필터 조건 추가
        conditions = []
        params = []
        param_count = 0
        
        if status_filter:
            param_count += 1
            conditions.append(f"status = ${param_count}")
            params.append(status_filter)
        
        if severity:
            param_count += 1
            conditions.append(f"severity = ${param_count}")
            params.append(severity)
        
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        # 정렬 및 제한
        base_query += " ORDER BY created_at DESC"
        
        param_count += 1
        base_query += f" LIMIT ${param_count}"
        params.append(limit)
        
        alerts_data = await db.execute_query(base_query, *params)
        
        alerts = [
            AlertResponse(
                id=str(alert["id"]),
                alert_type=alert["alert_type"],
                severity=alert["severity"],
                message=alert["message"],
                status=alert["status"],
                created_at=alert["created_at"],
                resolved_at=alert["resolved_at"]
            )
            for alert in alerts_data
        ]
        
        return alerts
        
    except Exception as e:
        logger.error(f"시스템 알림 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시스템 알림을 가져오는 중 오류가 발생했습니다"
        )

@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    current_admin: Dict[str, Any] = Depends(require_permission("monitoring.write")),
    db: DatabaseManager = Depends(get_db)
):
    """알림 해결 처리"""
    
    try:
        # 알림 존재 확인
        alert_check_query = "SELECT id, status FROM system_alerts WHERE id = $1"
        alert_data = await db.execute_one(alert_check_query, alert_id)
        
        if not alert_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="알림을 찾을 수 없습니다"
            )
        
        if alert_data["status"] == "resolved":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="이미 해결된 알림입니다"
            )
        
        # 알림 해결 처리
        resolve_query = """
        UPDATE system_alerts 
        SET status = 'resolved', resolved_at = now(), updated_at = now()
        WHERE id = $1
        """
        
        await db.execute_command(resolve_query, alert_id)
        
        # 활동 로그 기록
        log_query = """
        INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, success)
        VALUES ($1, 'resolve_alert', 'alert', $2, true)
        """
        
        await db.execute_command(log_query, current_admin["id"], alert_id)
        
        return {"message": "알림이 해결되었습니다"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"알림 해결 처리 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="알림 해결 처리 중 오류가 발생했습니다"
        )

@router.get("/logs")
async def get_system_logs(
    level: Optional[str] = Query(None, regex="^(DEBUG|INFO|WARNING|ERROR|CRITICAL)$"),
    source: Optional[str] = Query(None),
    start_time: Optional[datetime] = Query(None),
    end_time: Optional[datetime] = Query(None),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    current_admin: Dict[str, Any] = Depends(require_permission("monitoring.read")),
    db: DatabaseManager = Depends(get_db)
):
    """시스템 로그 조회"""
    
    try:
        # 기본 쿼리
        base_query = """
        SELECT 
            id,
            level,
            message,
            source,
            timestamp,
            details
        FROM system_logs
        WHERE 1=1
        """
        
        # 필터 조건 추가
        conditions = []
        params = []
        param_count = 0
        
        if level:
            param_count += 1
            conditions.append(f"level = ${param_count}")
            params.append(level)
        
        if source:
            param_count += 1
            conditions.append(f"source ILIKE ${param_count}")
            params.append(f"%{source}%")
        
        if start_time:
            param_count += 1
            conditions.append(f"timestamp >= ${param_count}")
            params.append(start_time)
        
        if end_time:
            param_count += 1
            conditions.append(f"timestamp <= ${param_count}")
            params.append(end_time)
        
        if conditions:
            base_query += " AND " + " AND ".join(conditions)
        
        # 총 개수 조회
        count_query = f"SELECT COUNT(*) as total FROM ({base_query}) as filtered_logs"
        total_result = await db.execute_one(count_query, *params)
        total = total_result["total"] if total_result else 0
        
        # 정렬 및 페이징
        order_clause = "ORDER BY timestamp DESC"
        offset = (page - 1) * per_page
        
        param_count += 1
        limit_clause = f"LIMIT ${param_count}"
        params.append(per_page)
        
        param_count += 1
        offset_clause = f"OFFSET ${param_count}"
        params.append(offset)
        
        final_query = f"{base_query} {order_clause} {limit_clause} {offset_clause}"
        
        logs_data = await db.execute_query(final_query, *params)
        
        logs = [
            SystemLog(
                id=str(log["id"]),
                level=log["level"],
                message=log["message"],
                source=log["source"],
                timestamp=log["timestamp"],
                details=log["details"]
            )
            for log in logs_data
        ]
        
        total_pages = (total + per_page - 1) // per_page
        
        return {
            "logs": logs,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
        
    except Exception as e:
        logger.error(f"시스템 로그 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시스템 로그를 가져오는 중 오류가 발생했습니다"
        )

@router.get("/performance", response_model=PerformanceMetrics)
async def get_performance_metrics(
    current_admin: Dict[str, Any] = Depends(require_permission("monitoring.read")),
    db: DatabaseManager = Depends(get_db)
):
    """성능 메트릭 조회"""
    
    try:
        # 평균 응답 시간 (최근 1시간)
        avg_response_query = """
        SELECT COALESCE(AVG(value), 0) as avg_response_time
        FROM real_time_metrics
        WHERE metric_type = 'response_time'
        AND timestamp >= now() - interval '1 hour'
        """
        avg_response_result = await db.execute_one(avg_response_query)
        avg_response_time = float(avg_response_result["avg_response_time"]) if avg_response_result else 0.0
        
        # 분당 요청 수 (최근 5분 평균)
        requests_per_minute_query = """
        SELECT COALESCE(AVG(value), 0) as requests_per_minute
        FROM real_time_metrics
        WHERE metric_type = 'requests_per_minute'
        AND timestamp >= now() - interval '5 minutes'
        """
        requests_result = await db.execute_one(requests_per_minute_query)
        requests_per_minute = float(requests_result["requests_per_minute"]) if requests_result else 0.0
        
        # 오류율 (최근 1시간)
        error_rate_query = """
        SELECT 
            CASE 
                WHEN total_requests > 0 THEN (error_requests::float / total_requests::float) * 100
                ELSE 0
            END as error_rate
        FROM (
            SELECT 
                COUNT(*) as total_requests,
                COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_requests
            FROM system_logs
            WHERE timestamp >= now() - interval '1 hour'
        ) as error_stats
        """
        error_rate_result = await db.execute_one(error_rate_query)
        error_rate = float(error_rate_result["error_rate"]) if error_rate_result else 0.0
        
        # 활성 세션 수
        active_sessions_query = """
        SELECT COUNT(*) as active_sessions
        FROM admin_sessions
        WHERE expires_at > now()
        """
        sessions_result = await db.execute_one(active_sessions_query)
        active_sessions = sessions_result["active_sessions"] if sessions_result else 0
        
        # 데이터베이스 쿼리 시간
        db_query_time = await measure_db_response_time(db)
        
        return PerformanceMetrics(
            avg_response_time=avg_response_time,
            requests_per_minute=requests_per_minute,
            error_rate=error_rate,
            active_sessions=active_sessions,
            database_query_time=db_query_time
        )
        
    except Exception as e:
        logger.error(f"성능 메트릭 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="성능 메트릭을 가져오는 중 오류가 발생했습니다"
        )

@router.post("/alerts/create")
async def create_alert(
    alert_type: str,
    severity: str,
    message: str,
    current_admin: Dict[str, Any] = Depends(require_permission("monitoring.write")),
    db: DatabaseManager = Depends(get_db)
):
    """수동 알림 생성"""
    
    try:
        # 알림 생성
        create_alert_query = """
        INSERT INTO system_alerts (alert_type, severity, message, status, created_at)
        VALUES ($1, $2, $3, 'active', now())
        RETURNING id
        """
        
        result = await db.execute_one(create_alert_query, alert_type, severity, message)
        alert_id = result["id"] if result else None
        
        # 활동 로그 기록
        log_query = """
        INSERT INTO admin_activity_logs (admin_id, action, resource_type, resource_id, details, success)
        VALUES ($1, 'create_alert', 'alert', $2, $3, true)
        """
        
        details = {
            "alert_type": alert_type,
            "severity": severity,
            "message": message,
            "admin_email": current_admin["email"]
        }
        
        await db.execute_command(log_query, current_admin["id"], str(alert_id), details)
        
        return {"message": "알림이 생성되었습니다", "alert_id": str(alert_id)}
        
    except Exception as e:
        logger.error(f"알림 생성 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="알림 생성 중 오류가 발생했습니다"
        )

@router.get("/system")
async def get_system_metrics(
    period: str = Query("1h", regex="^(1h|6h|24h|7d|30d)$")
):
    """시스템 메트릭 데이터 조회"""
    
    try:
        import random
        from datetime import datetime, timedelta
        
        # 기간별 데이터 포인트 수 결정
        period_mapping = {
            "1h": (12, timedelta(minutes=5)),    # 5분 간격
            "6h": (24, timedelta(minutes=15)),   # 15분 간격
            "24h": (24, timedelta(hours=1)),     # 1시간 간격
            "7d": (28, timedelta(hours=6)),      # 6시간 간격
            "30d": (30, timedelta(days=1))       # 1일 간격
        }
        
        points, delta = period_mapping.get(period, (12, timedelta(minutes=5)))
        
        # 시간 라벨 생성
        now = datetime.now()
        timestamps = []
        for i in range(points):
            timestamps.append(now - delta * (points - 1 - i))
        
        # 시스템 메트릭 데이터 생성
        metrics = []
        
        # CPU 사용률 메트릭
        cpu_data = []
        for timestamp in timestamps:
            cpu_data.append({
                "timestamp": timestamp.isoformat(),
                "value": round(random.uniform(20, 80), 2)
            })
        
        metrics.append({
            "name": "CPU 사용률",
            "type": "cpu_usage",
            "unit": "%",
            "data": cpu_data,
            "current": round(random.uniform(20, 80), 2),
            "status": "normal"
        })
        
        # 메모리 사용률 메트릭
        memory_data = []
        for timestamp in timestamps:
            memory_data.append({
                "timestamp": timestamp.isoformat(),
                "value": round(random.uniform(30, 85), 2)
            })
        
        metrics.append({
            "name": "메모리 사용률",
            "type": "memory_usage",
            "unit": "%",
            "data": memory_data,
            "current": round(random.uniform(30, 85), 2),
            "status": "normal"
        })
        
        # 응답 시간 메트릭
        response_data = []
        for timestamp in timestamps:
            response_data.append({
                "timestamp": timestamp.isoformat(),
                "value": round(random.uniform(50, 300), 2)
            })
        
        metrics.append({
            "name": "응답 시간",
            "type": "response_time",
            "unit": "ms",
            "data": response_data,
            "current": round(random.uniform(50, 300), 2),
            "status": "normal"
        })
        
        # 활성 연결 수 메트릭
        connections_data = []
        for timestamp in timestamps:
            connections_data.append({
                "timestamp": timestamp.isoformat(),
                "value": random.randint(10, 100)
            })
        
        metrics.append({
            "name": "활성 연결",
            "type": "active_connections",
            "unit": "개",
            "data": connections_data,
            "current": random.randint(10, 100),
            "status": "normal"
        })
        
        return metrics
        
    except Exception as e:
        logger.error(f"시스템 메트릭 조회 오류: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="시스템 메트릭을 가져오는 중 오류가 발생했습니다"
        )