# Vercel 환경변수 설정 가이드

## 필수 환경변수

Vercel 대시보드에서 다음 환경변수들을 설정해야 합니다:

### 1. Supabase 설정
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 2. NicePay 결제 설정
```
NICEPAY_CLIENT_ID=R2_6496fd66ebc242b58ab7ef1722c9a92b
NICEPAY_SECRET_KEY=101d2ae924fa4ae398c3b76a7ba62226
NICEPAY_API_URL=https://sandbox-api.nicepay.co.kr/v1/payments
NICEPAY_JS_URL=https://pay.nicepay.co.kr/v1/js/
```

### 3. JWT 및 보안 설정
```
JWT_SECRET=your_secure_jwt_secret_key
PAYMENT_WEBHOOK_SECRET=your_webhook_secret_key
```

### 4. 애플리케이션 설정
```
NODE_ENV=production
VITE_API_BASE_URL=https://your-vercel-domain.vercel.app
PAYMENT_TIMEOUT_MS=300000
```

### 5. AI 서비스 API 키 (선택사항)
```
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key
```

### 6. 관리자 설정
```
ADMIN_EMAIL=admin@yourcompany.com
ADMIN_PASSWORD=your_secure_admin_password
```

### 7. 로깅 설정
```
LOG_LEVEL=info
ENABLE_PAYMENT_LOGGING=true
```

## 환경변수 설정 방법

1. Vercel 대시보드에 로그인
2. 프로젝트 선택
3. Settings → Environment Variables 메뉴로 이동
4. 위의 환경변수들을 하나씩 추가
5. Production, Preview, Development 환경에 모두 적용

## 중요 사항

- **SUPABASE_SERVICE_ROLE_KEY**: 매우 중요한 키이므로 안전하게 보관
- **JWT_SECRET**: 최소 32자 이상의 강력한 랜덤 문자열 사용
- **NICEPAY_SECRET_KEY**: 실제 운영 시에는 프로덕션 키로 변경 필요
- **VITE_API_BASE_URL**: 배포된 Vercel 도메인으로 설정

## 배포 후 확인사항

1. API 엔드포인트 정상 작동 확인
2. 결제 시스템 테스트
3. 데이터베이스 연결 확인
4. 인증 시스템 테스트