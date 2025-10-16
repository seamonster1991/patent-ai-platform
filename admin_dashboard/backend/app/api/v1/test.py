"""
Test API endpoints without authentication
인증 없는 테스트 API
"""

from fastapi import APIRouter
from typing import List, Dict, Any
import uuid
import random
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/health")
async def test_health():
    """테스트 헬스체크"""
    return {"status": "ok", "message": "테스트 API 정상 작동"}

@router.get("/users")
async def test_get_users():
    """테스트 사용자 목록"""
    # 임시 사용자 데이터 생성
    sample_users = []
    for i in range(10):
        user_id = str(uuid.uuid4())
        created_date = datetime.now() - timedelta(days=random.randint(1, 365))
        
        sample_users.append({
            "id": user_id,
            "email": f"user{i+1}@example.com",
            "name": f"사용자 {i+1}",
            "status": random.choice(["active", "inactive", "suspended"]),
            "role": random.choice(["user", "premium", "admin"]),
            "created_at": created_date.isoformat(),
            "point_balance": random.randint(0, 1000),
            "total_searches": random.randint(0, 100),
            "total_payments": round(random.uniform(0, 500), 2)
        })
    
    return {
        "users": sample_users,
        "total": len(sample_users),
        "page": 1,
        "per_page": 10,
        "total_pages": 1
    }

@router.get("/stats")
async def test_get_stats():
    """테스트 사용자 통계"""
    total_users = random.randint(1000, 5000)
    active_users = int(total_users * 0.7)
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "premium_users": int(total_users * 0.15),
        "new_users_today": random.randint(5, 50),
        "new_users_this_week": random.randint(50, 200),
        "new_users_this_month": random.randint(200, 800)
    }