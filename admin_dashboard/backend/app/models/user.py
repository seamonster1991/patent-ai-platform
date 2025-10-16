"""
User models for admin dashboard management
"""
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer, Numeric
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


class User(Base):
    """User model for managing application users"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=True)
    phone = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    is_verified = Column(Boolean, default=False, nullable=False)
    subscription_status = Column(String(20), default="free", nullable=False)  # free, premium, enterprise
    subscription_expires_at = Column(DateTime(timezone=True), nullable=True)
    total_usage = Column(Integer, default=0, nullable=False)  # Total API calls or usage count
    monthly_usage = Column(Integer, default=0, nullable=False)  # Current month usage
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)
    
    # Profile information
    company = Column(String(100), nullable=True)
    job_title = Column(String(100), nullable=True)
    country = Column(String(50), nullable=True)
    
    # Relationships
    payments = relationship("Payment", back_populates="user")
    subscriptions = relationship("Subscription", back_populates="user")