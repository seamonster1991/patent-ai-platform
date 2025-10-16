"""
System monitoring and logging models
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Numeric, Float
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.database import Base


class SystemMetric(Base):
    """System performance metrics model"""
    __tablename__ = "system_metrics"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Metric details
    metric_type = Column(String(50), nullable=False)  # cpu, memory, disk, network, api_calls
    metric_name = Column(String(100), nullable=False)
    value = Column(Float, nullable=False)
    unit = Column(String(20), nullable=True)  # %, MB, GB, requests/min, etc.
    
    # Additional data
    tags = Column(Text, nullable=True)  # JSON string with tags
    metadata = Column(Text, nullable=True)  # JSON string with additional data
    
    # Timestamps
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class APILog(Base):
    """API request logging model"""
    __tablename__ = "api_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Request details
    method = Column(String(10), nullable=False)  # GET, POST, PUT, DELETE
    endpoint = Column(String(255), nullable=False)
    status_code = Column(Integer, nullable=False)
    response_time = Column(Float, nullable=False)  # in milliseconds
    
    # User information
    user_id = Column(UUID(as_uuid=True), nullable=True)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    
    # Request/Response data
    request_size = Column(Integer, nullable=True)  # in bytes
    response_size = Column(Integer, nullable=True)  # in bytes
    error_message = Column(Text, nullable=True)
    
    # Additional data
    metadata = Column(Text, nullable=True)  # JSON string with additional data
    
    # Timestamps
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())