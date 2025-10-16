#!/usr/bin/env python3
"""
Admin Dashboard Backend Server
FastAPI 기반 관리자 대시보드 백엔드 서버
"""

import uvicorn
import os
from dotenv import load_dotenv

# 환경 변수 로드
load_dotenv()

if __name__ == "__main__":
    # 환경 변수에서 설정 읽기
    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("DEBUG", "true").lower() == "true"
    
    # 개발 환경에서는 reload 활성화
    reload = debug and os.getenv("ENVIRONMENT", "development") == "development"
    
    print(f"🚀 Admin Dashboard Backend Server Starting...")
    print(f"📍 Host: {host}")
    print(f"🔌 Port: {port}")
    print(f"🔧 Debug: {debug}")
    print(f"🔄 Reload: {reload}")
    print(f"📚 API Docs: http://{host}:{port}/docs")
    print(f"🔍 Admin API: http://{host}:{port}/api/admin")
    
    # 서버 시작
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        log_level="debug" if debug else "info",
        access_log=debug
    )