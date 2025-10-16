# Python 관리자 대시보드 구현 가이드

## 1. 프로젝트 구조

```
admin_dashboard/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                 # FastAPI 애플리케이션 진입점
│   │   ├── config.py               # 설정 관리
│   │   ├── database.py             # 데이터베이스 연결
│   │   ├── dependencies.py         # 의존성 주입
│   │   ├── models/                 # SQLAlchemy 모델
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
│   │   │   ├── user.py
│   │   │   ├── payment.py
│   │   │   └── system.py
│   │   ├── schemas/                # Pydantic 스키마
│   │   │   ├── __init__.py
│   │   │   ├── admin.py
│   │   │   ├── user.py
│   │   │   ├── payment.py
│   │   │   └── response.py
│   │   ├── api/                    # API 라우터
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── dashboard.py
│   │   │   ├── users.py
│   │   │   ├── payments.py
│   │   │   ├── monitoring.py
│   │   │   └── settings.py
│   │   ├── core/                   # 핵심 기능
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── security.py
│   │   │   ├── cache.py
│   │   │   └── websocket.py
│   │   ├── services/               # 비즈니스 로직
│   │   │   ├── __init__.py
│   │   │   ├── admin_service.py
│   │   │   ├── user_service.py
│   │   │   ├── payment_service.py
│   │   │   └── monitoring_service.py
│   │   └── utils/                  # 유틸리티
│   │       ├── __init__.py
│   │       ├── email.py
│   │       ├── sms.py
│   │       └── helpers.py
│   ├── requirements.txt
│   ├── Dockerfile
│   └── docker-compose.yml
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── charts/
│   │   │   └── forms/
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Users.tsx
│   │   │   ├── Payments.tsx
│   │   │   ├── Monitoring.tsx
│   │   │   └── Settings.tsx
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── store/
│   │   ├── types/
│   │   └── utils/
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
└── README.md
```

## 2. 백엔드 구현 단계

### 2.1 환경 설정 및 의존성 설치

```bash
# 가상환경 생성
python -m venv admin_dashboard_env
source admin_dashboard_env/bin/activate  # Windows: admin_dashboard_env\Scripts\activate

# 의존성 설치
pip install fastapi uvicorn sqlalchemy psycopg2-binary alembic
pip install python-jose[cryptography] passlib[bcrypt] python-multipart
pip install redis celery pydantic-settings python-dotenv
pip install websockets aiofiles jinja2
```

### 2.2 FastAPI 애플리케이션 설정

```python
# backend/app/main.py
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer
import uvicorn

from app.api import auth, dashboard, users, payments, monitoring, settings
from app.core.config import settings
from app.database import engine, Base

# 데이터베이스 테이블 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Admin Dashboard API",
    description="Python 기반 관리자 대시보드 API",
    version="1.0.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None
)

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 보안 미들웨어
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.ALLOWED_HOSTS
)

# API 라우터 등록
app.include_router(auth.router, prefix="/api/admin/auth", tags=["authentication"])
app.include_router(dashboard.router, prefix="/api/admin/dashboard", tags=["dashboard"])
app.include_router(users.router, prefix="/api/admin/users", tags=["users"])
app.include_router(payments.router, prefix="/api/admin/payments", tags=["payments"])
app.include_router(monitoring.router, prefix="/api/admin/monitoring", tags=["monitoring"])
app.include_router(settings.router, prefix="/api/admin/settings", tags=["settings"])

@app.get("/")
async def root():
    return {"message": "Admin Dashboard API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG
    )
```

### 2.3 데이터베이스 모델 정의

```python
# backend/app/models/admin.py
from sqlalchemy import Column, String, Boolean, DateTime, Text, Integer
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid

from app.database import Base

class AdminUser(Base):
    __tablename__ = "admin_users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    role = Column(String(20), default="admin", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    two_fa_enabled = Column(Boolean, default=False, nullable=False)
    two_fa_secret = Column(String(32), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    last_login_at = Column(DateTime(timezone=True), nullable=True)

class AdminSession(Base):
    __tablename__ = "admin_sessions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(UUID(as_uuid=True), nullable=False)
    session_token = Column(String(255), unique=True, nullable=False)
    refresh_token = Column(String(255), unique=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    ip_address = Column(String(45), nullable=True)
    user_agent = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AdminLog(Base):
    __tablename__ = "admin_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    admin_user_id = Column(UUID(as_uuid=True), nullable=False)
    action = Column(String(100), nullable=False)
    resource = Column(String(100), nullable=False)
    details = Column(Text, nullable=True)  # JSON 형태로 저장
    ip_address = Column(String(45), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 2.4 인증 및 보안 구현

```python
# backend/app/core/auth.py
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import HTTPException, status
import pyotp

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthManager:
    def __init__(self):
        self.secret_key = settings.SECRET_KEY
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 30
        self.refresh_token_expire_days = 7
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)
    
    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)
    
    def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None):
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=self.access_token_expire_minutes)
        
        to_encode.update({"exp": expire, "type": "access"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def create_refresh_token(self, data: dict):
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=self.refresh_token_expire_days)
        to_encode.update({"exp": expire, "type": "refresh"})
        encoded_jwt = jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)
        return encoded_jwt
    
    def verify_token(self, token: str) -> dict:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    
    def generate_2fa_secret(self) -> str:
        return pyotp.random_base32()
    
    def verify_2fa_token(self, secret: str, token: str) -> bool:
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)

auth_manager = AuthManager()
```

### 2.5 API 엔드포인트 구현

```python
# backend/app/api/auth.py
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.admin import AdminUser, AdminSession
from app.schemas.admin import AdminLogin, AdminLoginResponse
from app.core.auth import auth_manager
from app.services.admin_service import AdminService

router = APIRouter()
security = HTTPBearer()

@router.post("/login", response_model=AdminLoginResponse)
async def login(
    login_data: AdminLogin,
    db: Session = Depends(get_db)
):
    admin_service = AdminService(db)
    
    # 사용자 인증
    admin_user = admin_service.authenticate_user(
        login_data.email, 
        login_data.password
    )
    
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )
    
    # 2FA 검증 (활성화된 경우)
    if admin_user.two_fa_enabled:
        if not login_data.totp_code:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="2FA code required"
            )
        
        if not auth_manager.verify_2fa_token(admin_user.two_fa_secret, login_data.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid 2FA code"
            )
    
    # 토큰 생성
    access_token = auth_manager.create_access_token(
        data={"sub": str(admin_user.id), "role": admin_user.role}
    )
    refresh_token = auth_manager.create_refresh_token(
        data={"sub": str(admin_user.id)}
    )
    
    # 세션 저장
    admin_service.create_session(admin_user.id, access_token, refresh_token)
    
    # 로그인 시간 업데이트
    admin_service.update_last_login(admin_user.id)
    
    return AdminLoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=1800,  # 30분
        user={
            "id": str(admin_user.id),
            "email": admin_user.email,
            "name": admin_user.name,
            "role": admin_user.role
        }
    )

@router.post("/logout")
async def logout(
    token: str = Depends(security),
    db: Session = Depends(get_db)
):
    admin_service = AdminService(db)
    
    # 토큰 검증
    payload = auth_manager.verify_token(token.credentials)
    admin_id = payload.get("sub")
    
    # 세션 삭제
    admin_service.delete_session(admin_id, token.credentials)
    
    return {"message": "Successfully logged out"}

@router.post("/refresh")
async def refresh_token(
    refresh_token: str,
    db: Session = Depends(get_db)
):
    admin_service = AdminService(db)
    
    # 리프레시 토큰 검증
    payload = auth_manager.verify_token(refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    
    admin_id = payload.get("sub")
    admin_user = admin_service.get_admin_by_id(admin_id)
    
    if not admin_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # 새 액세스 토큰 생성
    new_access_token = auth_manager.create_access_token(
        data={"sub": str(admin_user.id), "role": admin_user.role}
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer",
        "expires_in": 1800
    }
```

## 3. 프론트엔드 구현 단계

### 3.1 React 프로젝트 설정

```bash
# React 프로젝트 생성
npm create vite@latest admin-dashboard-frontend -- --template react-ts
cd admin-dashboard-frontend

# 의존성 설치
npm install @tanstack/react-query axios react-router-dom
npm install @headlessui/react @heroicons/react
npm install chart.js react-chartjs-2
npm install react-hook-form @hookform/resolvers yup
npm install zustand date-fns clsx tailwind-merge
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/node

# Tailwind CSS 설정
npx tailwindcss init -p
```

### 3.2 API 서비스 구현

```typescript
// frontend/src/services/api.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
      timeout: 10000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // 요청 인터셉터
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('admin_access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // 응답 인터셉터
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          const refreshToken = localStorage.getItem('admin_refresh_token');
          if (refreshToken) {
            try {
              const response = await this.refreshToken(refreshToken);
              localStorage.setItem('admin_access_token', response.data.access_token);
              
              // 원래 요청 재시도
              error.config.headers.Authorization = `Bearer ${response.data.access_token}`;
              return this.api.request(error.config);
            } catch (refreshError) {
              this.logout();
              window.location.href = '/admin/login';
            }
          } else {
            this.logout();
            window.location.href = '/admin/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // 인증 관련 메서드
  async login(email: string, password: string, totpCode?: string) {
    const response = await this.api.post('/api/admin/auth/login', {
      email,
      password,
      totp_code: totpCode,
    });
    return response.data;
  }

  async logout() {
    try {
      await this.api.post('/api/admin/auth/logout');
    } finally {
      localStorage.removeItem('admin_access_token');
      localStorage.removeItem('admin_refresh_token');
    }
  }

  private async refreshToken(refreshToken: string) {
    return this.api.post('/api/admin/auth/refresh', {
      refresh_token: refreshToken,
    });
  }

  // 대시보드 메서드
  async getDashboardMetrics(period?: string) {
    const response = await this.api.get('/api/admin/dashboard/metrics', {
      params: { period },
    });
    return response.data;
  }

  // 사용자 관리 메서드
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    role?: string;
  }) {
    const response = await this.api.get('/api/admin/users', { params });
    return response.data;
  }

  async getUserById(userId: string) {
    const response = await this.api.get(`/api/admin/users/${userId}`);
    return response.data;
  }

  async updateUser(userId: string, data: any) {
    const response = await this.api.put(`/api/admin/users/${userId}`, data);
    return response.data;
  }

  // 결제 관리 메서드
  async getPayments(params: {
    page?: number;
    limit?: number;
    status?: string;
    payment_method?: string;
  }) {
    const response = await this.api.get('/api/admin/payments', { params });
    return response.data;
  }

  async processRefund(paymentId: string, amount: number, reason: string) {
    const response = await this.api.post(`/api/admin/payments/${paymentId}/refund`, {
      amount,
      reason,
    });
    return response.data;
  }

  // 시스템 모니터링 메서드
  async getSystemMetrics() {
    const response = await this.api.get('/api/admin/monitoring/system');
    return response.data;
  }

  async getApiMetrics() {
    const response = await this.api.get('/api/admin/monitoring/api');
    return response.data;
  }
}

export const apiService = new ApiService();
```

### 3.3 상태 관리 구현

```typescript
// frontend/src/store/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiService } from '../services/api';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

interface AuthState {
  user: AdminUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, totpCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string, totpCode?: string) => {
        set({ isLoading: true });
        try {
          const response = await apiService.login(email, password, totpCode);
          
          localStorage.setItem('admin_access_token', response.access_token);
          localStorage.setItem('admin_refresh_token', response.refresh_token);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: async () => {
        try {
          await apiService.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
          });
        }
      },

      checkAuth: () => {
        const token = localStorage.getItem('admin_access_token');
        const user = localStorage.getItem('admin_user');
        
        if (token && user) {
          set({
            user: JSON.parse(user),
            isAuthenticated: true,
          });
        }
      },
    }),
    {
      name: 'admin-auth-storage',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

## 4. 배포 및 운영

### 4.1 Docker 설정

```dockerfile
# backend/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:password@db:5432/admin_dashboard
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis

  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend

  db:
    image: postgres:15
    environment:
      - POSTGRES_DB=admin_dashboard
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 4.2 환경 변수 설정

```bash
# backend/.env
DATABASE_URL=postgresql://user:password@localhost:5432/admin_dashboard
REDIS_URL=redis://localhost:6379
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_ORIGINS=["http://localhost:3000", "https://yourdomain.com"]
ALLOWED_HOSTS=["localhost", "yourdomain.com"]

# Email 설정
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# SMS 설정 (선택사항)
SMS_API_KEY=your-sms-api-key
SMS_API_SECRET=your-sms-api-secret
```

이 구현 가이드를 따라 Python 기반의 현대적이고 확장 가능한 관리자 대시보드를 구축할 수 있습니다. 각 단계별로 점진적으로 구현하면서 테스트를 진행하시기 바랍니다.