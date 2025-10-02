# Vercel URL 변경 가이드

## 🎯 목표
현재 URL: `https://traepatentai6w97-seongwankim-1691-re-chip.vercel.app`
목표 URL: `https://p-xhofgs4vm-re-chip.vercel.app`

## 📋 변경 방법

### 방법 1: Vercel 대시보드에서 프로젝트 이름 변경

1. **Vercel 대시보드 접속**
   - https://vercel.com/dashboard 방문
   - 로그인 후 현재 프로젝트 선택

2. **프로젝트 설정 변경**
   - 프로젝트 페이지에서 "Settings" 탭 클릭
   - "General" 섹션에서 "Project Name" 찾기
   - 프로젝트 이름을 `p-xhofgs4vm` 으로 변경
   - "Save" 버튼 클릭

3. **URL 확인**
   - 변경 후 자동으로 새로운 URL이 생성됨
   - `https://p-xhofgs4vm-re-chip.vercel.app` 형태로 변경됨

### 방법 2: 새로운 프로젝트 생성

1. **새 프로젝트 생성**
   - Vercel 대시보드에서 "New Project" 클릭
   - GitHub 저장소 `seamonster1991/patent-ai-platform` 선택
   - 프로젝트 이름을 `p-xhofgs4vm` 으로 설정

2. **환경 변수 설정**
   - 기존 프로젝트의 환경 변수를 새 프로젝트에 복사
   - Production, Preview, Development 환경별로 설정

3. **기존 프로젝트 삭제**
   - 새 프로젝트 배포 확인 후 기존 프로젝트 삭제

## ⚙️ 환경 변수 (새 프로젝트 생성 시 필요)

다음 환경 변수들을 새 프로젝트에 설정해야 합니다:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_KIPRIS_API_KEY=your_kipris_api_key
```

## 🔄 배포 후 확인사항

1. **기능 테스트**
   - 회원가입/로그인 기능
   - 전화번호 입력 필드 동작
   - 특허 검색 기능
   - API 연동 상태

2. **데이터베이스 연결**
   - Supabase 연결 확인
   - 사용자 데이터 정상 저장 확인

3. **외부 API 연동**
   - KIPRIS API 연동 확인
   - Gemini AI API 연동 확인

## 📝 주의사항

- URL 변경 시 기존 북마크나 링크가 무효화됨
- DNS 전파에 시간이 걸릴 수 있음 (보통 몇 분 내)
- 환경 변수 설정을 정확히 복사해야 함

## ✅ 완료 후 업데이트할 문서

- `DEPLOYMENT_STATUS.md`
- `README.md`
- 기타 URL이 포함된 문서들