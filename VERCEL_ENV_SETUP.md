# Vercel 환경 변수 설정 가이드

## 📁 import.env 파일 사용법

`import.env` 파일이 생성되었습니다. 이 파일을 사용하여 Vercel에 환경 변수를 쉽게 설정할 수 있습니다.

## 🚀 Vercel 대시보드에서 설정하기

### 방법 1: 파일 Import (권장)

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard 접속
   - 프로젝트 선택

2. **Environment Variables 페이지로 이동**
   - Project Settings → Environment Variables

3. **파일 Import**
   - "Import" 버튼 클릭
   - `import.env` 파일 선택
   - 모든 환경 변수가 자동으로 추가됨

### 방법 2: Vercel CLI 사용

```bash
# 프로젝트 연결 (최초 1회)
vercel link

# 환경 변수 파일 import
vercel env pull .env.local

# 또는 개별 설정
vercel env add KIPRIS_API_KEY production
vercel env add SUPABASE_URL production
# ... 기타 변수들
```

## 📋 포함된 환경 변수 목록

### 1. KIPRIS API 설정
- `KIPRIS_API_KEY`: 한국 특허청 API 키
- `KIPRIS_BASE_URL`: KIPRIS API 베이스 URL

### 2. Supabase 데이터베이스 설정
- `VITE_SUPABASE_URL`: 클라이언트용 Supabase URL
- `VITE_SUPABASE_ANON_KEY`: 클라이언트용 익명 키
- `SUPABASE_URL`: 서버용 Supabase URL
- `SUPABASE_ANON_KEY`: 서버용 익명 키
- `SUPABASE_SERVICE_ROLE_KEY`: 관리자 권한 키 (민감)

### 3. Gemini AI 설정
- `GEMINI_API_KEY`: Google Gemini AI API 키

### 4. 프로덕션 환경 설정
- `NODE_ENV`: 노드 환경 (production)
- `VITE_APP_ENV`: Vite 앱 환경 (production)

## ⚠️ 보안 주의사항

1. **민감한 키 관리**
   - `SUPABASE_SERVICE_ROLE_KEY`는 특히 주의
   - 절대 클라이언트 코드에 노출하지 말 것

2. **환경별 설정**
   - Production, Preview, Development 환경별로 적절히 설정
   - 개발 환경에서는 다른 키 사용 권장

3. **키 순환**
   - 정기적으로 API 키 갱신
   - 유출 의심 시 즉시 키 재생성

## 🔄 배포 후 확인사항

1. **환경 변수 적용 확인**
   ```bash
   # Vercel 함수에서 환경 변수 확인
   console.log('KIPRIS_API_KEY:', process.env.KIPRIS_API_KEY ? '✅ 설정됨' : '❌ 미설정');
   ```

2. **기능 테스트**
   - KIPRIS API 연결 테스트
   - Supabase 데이터베이스 연결 테스트
   - Gemini AI API 연결 테스트

## 📞 문제 해결

### 환경 변수가 적용되지 않는 경우
1. Vercel 프로젝트 재배포
2. 환경 변수 이름 확인 (대소문자 구분)
3. VITE_ 접두사 확인 (클라이언트 변수)

### API 연결 실패 시
1. API 키 유효성 확인
2. 네트워크 연결 상태 확인
3. API 사용량 한도 확인

---

**✅ 설정 완료 후 프로젝트를 재배포하여 환경 변수가 적용되도록 하세요!**