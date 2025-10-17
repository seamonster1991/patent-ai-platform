# Vercel 서버리스 배포 가이드

## 배포 준비사항

### 1. 환경변수 설정
Vercel 대시보드에서 다음 환경변수들을 설정해야 합니다:

#### 필수 환경변수
```bash
# Supabase 설정
SUPABASE_URL=your_supabase_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# NicePay 설정
NICEPAY_CLIENT_ID=R2_6496fd66ebc242b58ab7ef1722c9a92b
NICEPAY_SECRET_KEY=101d2ae924fa4ae398c3b76a7ba62226
NICEPAY_API_URL=https://sandbox-api.nicepay.co.kr/v1/payments
NICEPAY_JS_URL=https://pay.nicepay.co.kr/v1/js/

# JWT 설정
JWT_SECRET=your_jwt_secret_key_here

# 애플리케이션 설정
NODE_ENV=production
```

### 2. Vercel CLI를 통한 배포

#### 설치 및 로그인
```bash
npm install -g vercel
vercel login
```

#### 프로젝트 배포
```bash
# 프로젝트 루트에서 실행
vercel

# 프로덕션 배포
vercel --prod
```

### 3. Vercel 대시보드를 통한 배포

1. [Vercel 대시보드](https://vercel.com/dashboard)에 로그인
2. "New Project" 클릭
3. GitHub 저장소 연결
4. 환경변수 설정 (Settings > Environment Variables)
5. 배포 실행

## 배포 후 확인사항

### 1. API 엔드포인트 테스트
```bash
# 헬스체크
curl https://your-domain.vercel.app/api/health

# NicePay 설정 확인
curl https://your-domain.vercel.app/api/nicepay?action=config
```

### 2. 결제 시스템 테스트
1. 웹사이트 접속: `https://your-domain.vercel.app`
2. 로그인 후 결제 페이지 이동
3. 테스트 결제 진행 (샌드박스 환경)

### 3. 데이터베이스 연결 확인
- Supabase 대시보드에서 연결 상태 확인
- 결제 테이블 데이터 확인

## 트러블슈팅

### 1. 500 Internal Server Error
- 환경변수 설정 확인
- Vercel 함수 로그 확인: `vercel logs`
- Supabase 연결 상태 확인

### 2. CORS 오류
- vercel.json의 headers 설정 확인
- API 응답 헤더 확인

### 3. 결제 오류
- NicePay 설정값 확인
- 데이터베이스 테이블 구조 확인
- 결제 로그 확인

## 성능 최적화

### 1. 함수 메모리 설정
```json
{
  "functions": {
    "api/**/*.js": {
      "maxDuration": 60,
      "memory": 1024
    }
  }
}
```

### 2. 캐싱 설정
- 정적 파일 캐싱
- API 응답 캐싱 (적절한 경우)

### 3. 번들 크기 최적화
- 불필요한 의존성 제거
- Tree shaking 활용

## 보안 고려사항

### 1. 환경변수 보안
- 민감한 정보는 반드시 환경변수로 설정
- .env 파일은 절대 커밋하지 않음

### 2. API 보안
- CORS 설정 적절히 구성
- 인증/인가 미들웨어 적용
- 입력값 검증 강화

### 3. 결제 보안
- 서명 검증 구현
- 웹훅 보안 강화
- 민감한 결제 정보 로깅 금지

## 모니터링

### 1. Vercel Analytics
- 성능 모니터링
- 오류 추적
- 사용량 분석

### 2. 로그 모니터링
```bash
# 실시간 로그 확인
vercel logs --follow

# 특정 함수 로그
vercel logs api/nicepay.js
```

### 3. 알림 설정
- 배포 실패 알림
- 오류 발생 알림
- 성능 저하 알림