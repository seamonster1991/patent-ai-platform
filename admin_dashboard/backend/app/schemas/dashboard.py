"""
Dashboard-related Pydantic schemas
"""
from typing import List, Dict, Any
from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class MetricCard(BaseModel):
    """Schema for metric card"""
    title: str
    value: str
    change: str
    change_type: str  # increase, decrease, neutral
    icon: str


class ChartData(BaseModel):
    """Schema for chart data"""
    labels: List[str]
    datasets: List[Dict[str, Any]]


class DashboardMetrics(BaseModel):
    """Schema for dashboard metrics response"""
    # Overview metrics
    total_users: int
    active_users: int
    total_revenue: Decimal
    monthly_revenue: Decimal
    
    # Growth metrics
    user_growth_rate: float
    revenue_growth_rate: float
    
    # System metrics
    api_calls_today: int
    error_rate: float
    average_response_time: float
    
    # Recent activity
    recent_users: int
    recent_payments: int
    recent_errors: int
    
    # Chart data
    user_growth_chart: ChartData
    revenue_chart: ChartData
    api_usage_chart: ChartData
    
    # Metric cards
    metric_cards: List[MetricCard]
    
    # Last updated
    last_updated: datetime


class RealtimeMetrics(BaseModel):
    """Schema for real-time metrics"""
    active_users_now: int
    api_calls_per_minute: int
    current_cpu_usage: float
    current_memory_usage: float
    error_count_last_hour: int
    response_time_avg: float
    timestamp: datetime


class AlertResponse(BaseModel):
    """Schema for system alerts"""
    id: str
    type: str  # warning, error, info
    title: str
    message: str
    timestamp: datetime
    is_read: bool = False