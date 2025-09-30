# GitHub 저장소 설정 가이드

KIPRIS 특허 분석 SaaS 프로젝트를 GitHub에 업로드하는 방법을 안내합니다.

## 🚀 현재 상태

✅ **완료된 작업:**
- Git 저장소 초기화 완료
- .gitignore 파일 설정 (환경 변수 및 민감한 정보 제외)
- README.md 파일 업데이트 완료
- 모든 프로젝트 파일 스테이징 및 초기 커밋 완료

## 📋 GitHub 저장소 생성 및 연결 단계

### 1단계: GitHub에서 새 저장소 생성

1. **GitHub 웹사이트 접속**
   - https://github.com 에 로그인

2. **새 저장소 생성**
   - 우측 상단의 "+" 버튼 클릭
   - "New repository" 선택

3. **저장소 설정**
   - **Repository name**: `kipris-patent-analysis` (또는 원하는 이름)
   - **Description**: `KIPRIS API와 AI를 활용한 종합적인 특허 분석 및 관리 플랫폼`
   - **Visibility**: Public 또는 Private 선택
   - **⚠️ 중요**: "Initialize this repository with a README" 체크 해제
   - "Create repository" 클릭

### 2단계: 로컬 저장소와 GitHub 연결

GitHub에서 저장소를 생성한 후, 다음 명령어들을 실행하세요:

```bash
# GitHub 저장소 URL을 원격 저장소로 추가
git remote add origin https://github.com/YOUR_USERNAME/kipris-patent-analysis.git

# 기본 브랜치를 main으로 설정
git branch -M main

# GitHub에 푸시
git push -u origin main
```

**⚠️ 주의사항:**
- `YOUR_USERNAME`을 실제 GitHub 사용자명으로 변경하세요
- 저장소 이름이 다르다면 URL에서 해당 부분을 수정하세요

### 3단계: 푸시 완료 확인

푸시가 완료되면 GitHub 저장소 페이지에서 다음을 확인할 수 있습니다:
- 모든 프로젝트 파일들
- 업데이트된 README.md
- 커밋 히스토리

## 🔧 대안 방법: GitHub CLI 사용 (선택사항)

GitHub CLI가 설치되어 있다면 더 간단하게 할 수 있습니다:

```bash
# GitHub CLI 설치 확인
gh --version

# 저장소 생성 및 푸시 (한 번에)
gh repo create kipris-patent-analysis --public --source=. --remote=origin --push
```

## 📁 업로드된 프로젝트 구조

```
kipris-patent-analysis/
├── 📁 src/                    # React 프론트엔드
│   ├── 📁 components/         # UI 컴포넌트
│   ├── 📁 pages/             # 페이지 컴포넌트
│   ├── 📁 hooks/             # 커스텀 훅
│   ├── 📁 store/             # 상태 관리
│   └── 📁 types/             # TypeScript 타입
├── 📁 api/                   # Express.js 백엔드
├── 📁 supabase/             # 데이터베이스 마이그레이션
├── 📄 README.md             # 프로젝트 문서
├── 📄 package.json          # 의존성 및 스크립트
├── 📄 vercel.json           # 배포 설정
├── 📄 .gitignore            # Git 제외 파일
└── 📄 DEPLOYMENT.md         # 배포 가이드
```

## 🔒 보안 확인사항

✅ **안전하게 제외된 파일들:**
- `.env` - 환경 변수 파일
- `.env.local` - 로컬 환경 변수
- `.env.production` - 프로덕션 환경 변수
- `node_modules/` - 의존성 패키지
- `dist/` - 빌드 결과물

## 🎯 다음 단계

GitHub 업로드 완료 후:

1. **저장소 설정**
   - Repository settings에서 Pages 설정 (필요시)
   - Branch protection rules 설정
   - Collaborators 추가

2. **이슈 및 프로젝트 관리**
   - Issues 탭에서 버그 리포트 및 기능 요청 관리
   - Projects 탭에서 개발 로드맵 관리

3. **CI/CD 설정**
   - GitHub Actions를 통한 자동 배포 설정
   - 코드 품질 검사 자동화

## 📞 문제 해결

**일반적인 문제들:**

1. **인증 오류**
   ```bash
   # Personal Access Token 사용
   git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/kipris-patent-analysis.git
   ```

2. **푸시 거부됨**
   ```bash
   # 강제 푸시 (주의해서 사용)
   git push -f origin main
   ```

3. **원격 저장소 URL 변경**
   ```bash
   git remote set-url origin NEW_URL
   ```

---

**성공적인 GitHub 업로드를 위해 위 단계들을 순서대로 따라해 주세요!** 🚀