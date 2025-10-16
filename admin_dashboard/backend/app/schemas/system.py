"""
System monitoring and logging-related Pydantic schemas
"""
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, Field
from uuid import UUID


class SystemMetricResponse(BaseModel):
    """Schema for system metric response"""
    id: UUID
    metric_type: str
    metric_name: str
    value: float
    unit: Optional[str]
    tags: Optional[str]
    metadata: Optional[str]
    timestamp: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class APILogResponse(BaseModel):
    """Schema for API log response"""
    id: UUID
    method: str
    endpoint: str
    status_code: int
    response_time: float
    user_id: Optional[UUID]
    ip_address: Optional[str]
    user_agent: Optional[str]
    request_size: Optional[int]
    response_size: Optional[int]
    error_message: Optional[str]
    metadata: Optional[str]
    timestamp: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


class SystemMetricListResponse(BaseModel):
    """Schema for system metric list response"""
    metrics: list[SystemMetricResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class APILogListResponse(BaseModel):
    """Schema for API log list response"""
    logs: list[APILogResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class SystemStatsResponse(BaseModel):
    """Schema for system statistics response"""
    total_api_calls: int
    successful_api_calls: int
    failed_api_calls: int
    average_response_time: float
    error_rate: float
    uptime_percentage: float
    current_cpu_usage: float
    current_memory_usage: float
    current_disk_usage: float


class SystemHealthResponse(BaseModel):
    """Schema for system health response"""
    status: str  # healthy, warning, critical
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    database_status: str
    redis_status: str
    api_response_time: float
    error_rate: float
    uptime: int  # in seconds
    last_check: datetime