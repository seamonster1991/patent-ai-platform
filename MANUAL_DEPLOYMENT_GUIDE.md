# Vercel 수동 배포 가이드

## 현재 상황
- Vercel CLI에서 rate limit 오류 발생 (14시간 후 재시도 가능)
- 프로젝트는 배포 준비가 완료된 상태

## 수동 배포 방법

### 방법 1: GitHub 연동 배포 (권장)

1. **GitHub 리포지토리 생성**
   ```bash
   git init
   git add .
   git commit -m "Initial commit for Vercel deployment"
   git branch -M main
   git remote add origin https://github.com/yourusername/patent-ai.git
   git push -u origin main
   ```

2. **Vercel 대시보드에서 배포**
   - https://vercel.com 접속 및 로그인
   - "New Project" 클릭
   - GitHub 리포지토리 연결
   - 프로젝트 선택 후 "Import" 클릭
   - 자동으로 설정이 감지됨 (vercel.json 기반)

### 방법 2: Vercel CLI (14시간 후)

```bash
# 14시간 후 다시 시도
vercel --prod
```

## 환경변수 설정

배포 후 Vercel 대시보드에서 다음 환경변수들을 설정하세요:

### 필수 환경변수
```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NICEPAY_CLIENT_ID=R2_6496fd66ebc242b58ab7ef1722c9a92b
NICEPAY_SECRET_KEY=101d2ae924fa4ae398c3b76a7ba62226
NICEPAY_API_URL=https://sandbox-api.nicepay.co.kr/v1/payments
NICEPAY_JS_URL=https://pay.nicepay.co.kr/v1/js/
JWT_SECRET=your_secure_jwt_secret_key
NODE_ENV=production
VITE_API_BASE_URL=https://your-vercel-domain.vercel.app
```

## 배포 상태 확인

### 1. 빌드 설정 확인
- ✅ TypeScript 컴파일 성공
- ✅ npm run build 성공
- ✅ dist 폴더 생성 완료

### 2. Vercel 설정 확인
- ✅ vercel.json 최적화 완료
- ✅ API 라우팅 설정 완료
- ✅ 함수 메모리 및 타임아웃 설정 완료

### 3. 준비된 기능들
- ✅ NicePay 결제 시스템
- ✅ Supabase 데이터베이스 연동
- ✅ 포인트 시스템
- ✅ 리포트 생성 기능
- ✅ 관리자 대시보드

## 배포 후 테스트 항목

1. **기본 기능 테스트**
   - 홈페이지 로딩
   - 사용자 로그인/회원가입
   - 특허 검색 기능

2. **결제 시스템 테스트**
   - 포인트 부족 시 결제 페이지 이동
   - NicePay 결제 프로세스
   - 결제 완료 후 포인트 적립

3. **API 엔드포인트 테스트**
   - `/api/health` - 서버 상태 확인
   - `/api/nicepay?action=config` - 결제 설정 확인
   - `/api/points/balance` - 포인트 잔액 확인

## 문제 해결

### 배포 실패 시
1. Vercel 대시보드에서 빌드 로그 확인
2. 환경변수 설정 재확인
3. vercel.json 설정 검토

### API 오류 시
1. 환경변수 값 확인
2. Supabase 연결 상태 확인
3. NicePay 설정 확인

## 다음 단계

1. GitHub 리포지토리 생성 및 푸시
2. Vercel에서 GitHub 연동 배포
3. 환경변수 설정
4. 배포된 애플리케이션 테스트
5. 도메인 설정 (선택사항)

배포가 완료되면 제공된 Vercel URL을 통해 애플리케이션에 접근할 수 있습니다.