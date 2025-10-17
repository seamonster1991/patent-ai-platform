"""
Admin Dashboard Backend - Main Application
FastAPI 기반 관리자 대시보드 백엔드 서버
"""

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import uvicorn
import logging
from typing import AsyncGenerator

from app.core.config import settings
from app.core.database import init_db, close_db
from app.core.security import verify_admin_token
from app.api.v1 import auth, dashboard, users, payments, monitoring, websocket, test
from app.core.logging import setup_logging

# 로깅 설정
setup_logging()
logger = logging.getLogger(__name__)

# Security
security = HTTPBearer()

@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """애플리케이션 생명주기 관리"""
    # 시작 시
    logger.info("🚀 Admin Dashboard Backend 시작 중...")
    # 임시로 데이터베이스 초기화 비활성화 - 연결 문제 해결 후 활성화 예정
    # await init_db()
    logger.info("✅ 서버 시작 완료")
    
    yield
    
    # 종료 시
    logger.info("🔄 Admin Dashboard Backend 종료 중...")
    # await close_db()
    logger.info("✅ 서버 종료 완료")

# FastAPI 앱 생성
app = FastAPI(
    title="Patent AI Admin Dashboard",
    description="Python 기반 관리자 대시보드 백엔드 API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# CORS 미들웨어 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
)

# Trusted Host 미들웨어 (보안)
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["localhost", "127.0.0.1", "*.patent-ai.com"]
    )

# 헬스체크 엔드포인트
@app.get("/health", tags=["Health"])
async def health_check():
    """서버 상태 확인"""
    return {
        "status": "healthy",
        "service": "admin-dashboard-backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT
    }

# 보호된 헬스체크 (관리자 전용)
@app.get("/admin/health", tags=["Health"])
async def admin_health_check(current_admin=Depends(verify_admin_token)):
    """관리자 전용 상세 헬스체크"""
    return {
        "status": "healthy",
        "service": "admin-dashboard-backend",
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "admin": current_admin.email,
        "database": "connected",
        "redis": "connected" if settings.REDIS_URL else "not_configured"
    }

# API 라우터 등록
app.include_router(test.router, prefix="/api/v1/test", tags=["Test"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(dashboard.router, prefix="/api/v1/dashboard", tags=["Dashboard"])
app.include_router(users.router, prefix="/api/v1/users", tags=["User Management"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payment Management"])
app.include_router(monitoring.router, prefix="/api/v1/monitoring", tags=["System Monitoring"])
app.include_router(websocket.router, prefix="/ws", tags=["WebSocket"])

# 글로벌 예외 처리
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    from fastapi.responses import JSONResponse
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level="debug" if settings.DEBUG else "info"
    )