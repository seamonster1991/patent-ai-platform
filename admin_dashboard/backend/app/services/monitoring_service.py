"""
System monitoring service for admin dashboard
"""
from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc, text
from fastapi import HTTPException, status
import psutil
import time
import json

from app.models.system import SystemMetric, APILog
from app.schemas.system import SystemMetricCreate, APILogCreate


class MonitoringService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_system_health(self) -> Dict[str, Any]:
        """Get current system health metrics"""
        try:
            # CPU usage
            cpu_percent = psutil.cpu_percent(interval=1)
            
            # Memory usage
            memory = psutil.virtual_memory()
            memory_percent = memory.percent
            memory_used = memory.used / (1024**3)  # GB
            memory_total = memory.total / (1024**3)  # GB
            
            # Disk usage
            disk = psutil.disk_usage('/')
            disk_percent = disk.percent
            disk_used = disk.used / (1024**3)  # GB
            disk_total = disk.total / (1024**3)  # GB
            
            # Network I/O
            network = psutil.net_io_counters()
            
            # Process count
            process_count = len(psutil.pids())
            
            # Load average (Unix-like systems)
            try:
                load_avg = psutil.getloadavg()
            except AttributeError:
                load_avg = [0, 0, 0]  # Windows doesn't have load average
            
            # Determine overall health status
            health_status = "healthy"
            if cpu_percent > 80 or memory_percent > 85 or disk_percent > 90:
                health_status = "warning"
            if cpu_percent > 95 or memory_percent > 95 or disk_percent > 95:
                health_status = "critical"
            
            return {
                "status": health_status,
                "timestamp": datetime.utcnow().isoformat(),
                "cpu": {
                    "usage_percent": cpu_percent,
                    "load_average": load_avg
                },
                "memory": {
                    "usage_percent": memory_percent,
                    "used_gb": round(memory_used, 2),
                    "total_gb": round(memory_total, 2),
                    "available_gb": round((memory_total - memory_used), 2)
                },
                "disk": {
                    "usage_percent": disk_percent,
                    "used_gb": round(disk_used, 2),
                    "total_gb": round(disk_total, 2),
                    "free_gb": round((disk_total - disk_used), 2)
                },
                "network": {
                    "bytes_sent": network.bytes_sent,
                    "bytes_recv": network.bytes_recv,
                    "packets_sent": network.packets_sent,
                    "packets_recv": network.packets_recv
                },
                "processes": {
                    "count": process_count
                }
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def record_system_metric(self, metric_data: SystemMetricCreate) -> SystemMetric:
        """Record system metric"""
        db_metric = SystemMetric(
            metric_name=metric_data.metric_name,
            metric_value=metric_data.metric_value,
            metric_unit=metric_data.metric_unit,
            category=metric_data.category,
            metadata=metric_data.metadata or {}
        )
        
        self.db.add(db_metric)
        self.db.commit()
        self.db.refresh(db_metric)
        
        return db_metric
    
    def get_system_metrics_history(
        self,
        metric_name: Optional[str] = None,
        category: Optional[str] = None,
        hours: int = 24,
        limit: int = 1000
    ) -> List[SystemMetric]:
        """Get system metrics history"""
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = self.db.query(SystemMetric).filter(
            SystemMetric.created_at >= start_time
        )
        
        if metric_name:
            query = query.filter(SystemMetric.metric_name == metric_name)
        
        if category:
            query = query.filter(SystemMetric.category == category)
        
        return query.order_by(desc(SystemMetric.created_at)).limit(limit).all()
    
    def get_performance_metrics(self, hours: int = 24) -> Dict[str, Any]:
        """Get performance metrics for the specified time period"""
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # API response times
        api_metrics = self.db.query(APILog).filter(
            APILog.created_at >= start_time
        ).all()
        
        if api_metrics:
            response_times = [log.response_time for log in api_metrics if log.response_time]
            avg_response_time = sum(response_times) / len(response_times) if response_times else 0
            max_response_time = max(response_times) if response_times else 0
            min_response_time = min(response_times) if response_times else 0
            
            # Error rate
            total_requests = len(api_metrics)
            error_requests = len([log for log in api_metrics if log.status_code >= 400])
            error_rate = (error_requests / total_requests * 100) if total_requests > 0 else 0
            
            # Requests per minute
            requests_per_minute = total_requests / (hours * 60) if hours > 0 else 0
        else:
            avg_response_time = 0
            max_response_time = 0
            min_response_time = 0
            error_rate = 0
            requests_per_minute = 0
            total_requests = 0
            error_requests = 0
        
        # System metrics
        system_metrics = self.get_system_metrics_history(hours=hours)
        
        # CPU usage trend
        cpu_metrics = [m for m in system_metrics if m.metric_name == "cpu_usage"]
        cpu_trend = [m.metric_value for m in cpu_metrics[-50:]]  # Last 50 readings
        
        # Memory usage trend
        memory_metrics = [m for m in system_metrics if m.metric_name == "memory_usage"]
        memory_trend = [m.metric_value for m in memory_metrics[-50:]]
        
        return {
            "api_performance": {
                "total_requests": total_requests,
                "error_requests": error_requests,
                "error_rate": round(error_rate, 2),
                "avg_response_time": round(avg_response_time, 2),
                "max_response_time": round(max_response_time, 2),
                "min_response_time": round(min_response_time, 2),
                "requests_per_minute": round(requests_per_minute, 2)
            },
            "system_performance": {
                "cpu_trend": cpu_trend,
                "memory_trend": memory_trend,
                "avg_cpu": round(sum(cpu_trend) / len(cpu_trend), 2) if cpu_trend else 0,
                "avg_memory": round(sum(memory_trend) / len(memory_trend), 2) if memory_trend else 0
            }
        }
    
    def log_api_request(self, log_data: APILogCreate) -> APILog:
        """Log API request"""
        db_log = APILog(
            endpoint=log_data.endpoint,
            method=log_data.method,
            status_code=log_data.status_code,
            response_time=log_data.response_time,
            user_id=log_data.user_id,
            ip_address=log_data.ip_address,
            user_agent=log_data.user_agent,
            request_size=log_data.request_size,
            response_size=log_data.response_size,
            metadata=log_data.metadata or {}
        )
        
        self.db.add(db_log)
        self.db.commit()
        self.db.refresh(db_log)
        
        return db_log
    
    def get_api_logs(
        self,
        skip: int = 0,
        limit: int = 100,
        endpoint: Optional[str] = None,
        method: Optional[str] = None,
        status_code: Optional[int] = None,
        user_id: Optional[str] = None,
        hours: int = 24
    ) -> Tuple[List[APILog], int]:
        """Get API logs with filtering"""
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        query = self.db.query(APILog).filter(
            APILog.created_at >= start_time
        )
        
        if endpoint:
            query = query.filter(APILog.endpoint.ilike(f"%{endpoint}%"))
        
        if method:
            query = query.filter(APILog.method == method)
        
        if status_code:
            query = query.filter(APILog.status_code == status_code)
        
        if user_id:
            query = query.filter(APILog.user_id == user_id)
        
        total = query.count()
        logs = query.order_by(desc(APILog.created_at)).offset(skip).limit(limit).all()
        
        return logs, total
    
    def get_error_analysis(self, hours: int = 24) -> Dict[str, Any]:
        """Get error analysis for the specified time period"""
        start_time = datetime.utcnow() - timedelta(hours=hours)
        
        # Error logs
        error_logs = self.db.query(APILog).filter(
            and_(
                APILog.created_at >= start_time,
                APILog.status_code >= 400
            )
        ).all()
        
        if not error_logs:
            return {
                "total_errors": 0,
                "error_rate": 0,
                "errors_by_status": {},
                "errors_by_endpoint": {},
                "error_trend": []
            }
        
        # Total requests for error rate calculation
        total_requests = self.db.query(APILog).filter(
            APILog.created_at >= start_time
        ).count()
        
        # Errors by status code
        errors_by_status = {}
        for log in error_logs:
            status = str(log.status_code)
            errors_by_status[status] = errors_by_status.get(status, 0) + 1
        
        # Errors by endpoint
        errors_by_endpoint = {}
        for log in error_logs:
            endpoint = log.endpoint
            errors_by_endpoint[endpoint] = errors_by_endpoint.get(endpoint, 0) + 1
        
        # Error trend (hourly)
        error_trend = []
        for i in range(hours):
            hour_start = start_time + timedelta(hours=i)
            hour_end = hour_start + timedelta(hours=1)
            
            hour_errors = len([
                log for log in error_logs
                if hour_start <= log.created_at < hour_end
            ])
            
            error_trend.append({
                "hour": hour_start.isoformat(),
                "errors": hour_errors
            })
        
        return {
            "total_errors": len(error_logs),
            "error_rate": (len(error_logs) / total_requests * 100) if total_requests > 0 else 0,
            "errors_by_status": errors_by_status,
            "errors_by_endpoint": dict(sorted(errors_by_endpoint.items(), key=lambda x: x[1], reverse=True)[:10]),
            "error_trend": error_trend
        }
    
    def get_realtime_metrics(self) -> Dict[str, Any]:
        """Get real-time system metrics"""
        # Current system health
        system_health = self.get_system_health()
        
        # Recent API activity (last 5 minutes)
        five_minutes_ago = datetime.utcnow() - timedelta(minutes=5)
        recent_requests = self.db.query(APILog).filter(
            APILog.created_at >= five_minutes_ago
        ).count()
        
        recent_errors = self.db.query(APILog).filter(
            and_(
                APILog.created_at >= five_minutes_ago,
                APILog.status_code >= 400
            )
        ).count()
        
        # Active users (last hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        active_users = self.db.query(APILog.user_id).filter(
            and_(
                APILog.created_at >= one_hour_ago,
                APILog.user_id.isnot(None)
            )
        ).distinct().count()
        
        return {
            "timestamp": datetime.utcnow().isoformat(),
            "system_health": system_health,
            "api_activity": {
                "requests_last_5min": recent_requests,
                "errors_last_5min": recent_errors,
                "requests_per_minute": recent_requests / 5,
                "error_rate": (recent_errors / recent_requests * 100) if recent_requests > 0 else 0
            },
            "user_activity": {
                "active_users_last_hour": active_users
            }
        }
    
    def cleanup_old_logs(self, days: int = 30) -> Dict[str, int]:
        """Clean up old logs and metrics"""
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Delete old API logs
        deleted_api_logs = self.db.query(APILog).filter(
            APILog.created_at < cutoff_date
        ).delete()
        
        # Delete old system metrics
        deleted_metrics = self.db.query(SystemMetric).filter(
            SystemMetric.created_at < cutoff_date
        ).delete()
        
        self.db.commit()
        
        return {
            "deleted_api_logs": deleted_api_logs,
            "deleted_metrics": deleted_metrics
        }
    
    def get_database_stats(self) -> Dict[str, Any]:
        """Get database statistics"""
        try:
            # Table sizes and row counts
            tables_info = []
            
            # Get table names from information_schema
            result = self.db.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            
            for (table_name,) in result:
                try:
                    # Get row count
                    count_result = self.db.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
                    row_count = count_result.scalar()
                    
                    tables_info.append({
                        "table_name": table_name,
                        "row_count": row_count
                    })
                except Exception as e:
                    tables_info.append({
                        "table_name": table_name,
                        "row_count": 0,
                        "error": str(e)
                    })
            
            return {
                "tables": tables_info,
                "total_tables": len(tables_info),
                "timestamp": datetime.utcnow().isoformat()
            }
        
        except Exception as e:
            return {
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }