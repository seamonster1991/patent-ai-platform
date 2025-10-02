# KIPRIS 특허 분석 SaaS

KIPRIS API와 AI를 활용한 종합적인 특허 분석 및 관리 플랫폼입니다.

## 🚀 주요 기능

### 📊 특허 검색 및 분석
- **KIPRIS API 통합**: 한국 특허청 공식 API를 통한 실시간 특허 데이터 검색
- **AI 기반 분석**: Google Gemini AI를 활용한 특허 문서 자동 분석
- **경쟁사 모니터링**: 특정 기업의 특허 출원 동향 추적
- **기술 트렌드 분석**: 특허 데이터를 통한 기술 발전 동향 파악

### 📈 관리자 대시보드
- **실시간 통계**: 검색 활동, 사용자 현황, 시스템 메트릭 모니터링
- **사용자 관리**: 회원 가입, 활동 내역, 권한 관리
- **시스템 모니터링**: API 사용량, 성능 지표, 오류 추적
- **데이터 분석**: 검색 패턴, 인기 키워드, 사용 통계

### 📄 리포트 생성
- **PDF 리포트**: 분석 결과를 전문적인 PDF 문서로 자동 생성
- **맞춤형 템플릿**: 다양한 용도에 맞는 리포트 템플릿 제공
- **데이터 시각화**: 차트와 그래프를 포함한 직관적인 데이터 표현

### 👤 사용자 관리
- **회원 시스템**: 안전한 사용자 인증 및 권한 관리
- **검색 이력**: 개인별 검색 기록 및 즐겨찾기 관리
- **맞춤 설정**: 개인화된 대시보드 및 알림 설정

## 🛠 기술 스택

### Frontend
- **React 18** - 모던 UI 라이브러리
- **TypeScript** - 타입 안전성을 위한 정적 타입 언어
- **Vite** - 빠른 개발 서버 및 빌드 도구
- **Tailwind CSS** - 유틸리티 우선 CSS 프레임워크
- **Recharts** - 데이터 시각화 라이브러리

### Backend
- **Express.js** - Node.js 웹 프레임워크
- **Supabase** - PostgreSQL 기반 백엔드 서비스
- **KIPRIS API** - 한국 특허청 공식 API
- **Google Gemini AI** - AI 기반 텍스트 분석

### 개발 도구
- **ESLint** - 코드 품질 관리
- **Prettier** - 코드 포맷팅
- **Nodemon** - 개발 서버 자동 재시작

## 📦 설치 및 실행

### 사전 요구사항
- Node.js 18.0.0 이상
- npm 또는 yarn
- Git

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/patent-ai.git
cd patent-ai
```

### 2. 의존성 설치
```bash
npm install
```

### 3. 환경 변수 설정
`.env` 파일을 생성하고 다음 변수들을 설정하세요:

```env
# KIPRIS API 설정
VITE_KIPRIS_API_KEY=your_kipris_api_key
VITE_KIPRIS_BASE_URL=https://plus.kipris.or.kr

# Supabase 설정
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Google Gemini AI 설정
VITE_GEMINI_API_KEY=your_gemini_api_key

# 환경 설정
NODE_ENV=development
VITE_APP_ENV=development
```

### 4. 데이터베이스 마이그레이션
```bash
npm run db:migrate
```

### 5. 개발 서버 실행
```bash
# 프론트엔드 개발 서버
npm run client:dev

# 백엔드 API 서버
npm run dev

# 또는 동시 실행
npm run dev:all
```

## 🚀 배포

### Vercel 배포
```bash
# Vercel CLI 설치
npm install -g vercel

# 배포
vercel --prod
```

### 환경 변수 설정
Vercel 대시보드에서 다음 환경 변수들을 설정해야 합니다:
- `VITE_KIPRIS_API_KEY`
- `VITE_KIPRIS_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VITE_GEMINI_API_KEY`
- `NODE_ENV=production`
- `VITE_APP_ENV=production`

## 📁 프로젝트 구조

```
patent-ai/
├── src/                    # 프론트엔드 소스 코드
│   ├── components/         # React 컴포넌트
│   ├── pages/             # 페이지 컴포넌트
│   ├── hooks/             # 커스텀 훅
│   ├── utils/             # 유틸리티 함수
│   ├── types/             # TypeScript 타입 정의
│   └── styles/            # 스타일 파일
├── api/                   # 백엔드 API
│   ├── index.ts          # Express 서버 진입점
│   ├── routes/           # API 라우트
│   ├── middleware/       # 미들웨어
│   └── utils/            # 백엔드 유틸리티
├── supabase/             # 데이터베이스 설정
│   └── migrations/       # 데이터베이스 마이그레이션
├── public/               # 정적 파일
├── dist/                 # 빌드 결과물
└── docs/                 # 문서
```

## 🔧 개발 가이드

### API 엔드포인트

#### 특허 검색
- `POST /api/search` - 특허 검색 (KIPRIS API 통합)
- `GET /api/detail` - 특허 상세 정보
- `POST /api/ai-analysis` - AI 분석 요청
- `GET /api/documents` - 특허 문서 다운로드

#### 사용자 관리
- `POST /api/auth/login` - 로그인
- `POST /api/auth/register` - 회원가입
- `GET /api/users/profile` - 사용자 프로필

#### 관리자
- `GET /api/admin/dashboard` - 대시보드 데이터
- `GET /api/admin/users` - 사용자 목록
- `GET /api/admin/analytics` - 분석 데이터

### 데이터베이스 스키마

주요 테이블:
- `users` - 사용자 정보
- `search_history` - 검색 기록
- `ai_analysis_reports` - AI 분석 결과
- `patent_search_analytics` - 검색 분석 데이터
- `user_activities` - 사용자 활동 로그

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

문제가 발생하거나 질문이 있으시면 다음을 통해 연락해 주세요:

- 이슈 트래커: [GitHub Issues](https://github.com/your-username/patent-ai/issues)
- 이메일: support@patent-ai.com

## 🔗 관련 링크

- [KIPRIS API 문서](https://plus.kipris.or.kr/openapi/service/openApiServiceInfo.do)
- [Supabase 문서](https://supabase.com/docs)
- [Google Gemini AI 문서](https://ai.google.dev/docs)
- [배포된 애플리케이션](https://traepatentai6w97-seongwankim-1691-re-chip.vercel.app)

---

**KIPRIS 특허 분석 SaaS** - AI 기반 특허 분석의 새로운 표준
