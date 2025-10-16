# Python 테스트 실행 가이드

## 개요

대시보드 데이터 관리 및 분석 시스템의 Python 테스트 파일 실행 방법을 안내합니다.

## 사전 준비

### 1. Python 환경 설정

```bash
# Python 3.8 이상 필요
python --version

# 가상환경 생성 (권장)
python -m venv dashboard_analysis_env

# 가상환경 활성화
# Windows
dashboard_analysis_env\Scripts\activate
# macOS/Linux
source dashboard_analysis_env/bin/activate
```

### 2. 의존성 설치

```bash
# 의존성 패키지 설치
pip install -r requirements.txt

# 또는 개별 설치
pip install psycopg2-binary pandas matplotlib seaborn python-dotenv
```

### 3. 환경변수 설정

`.env` 파일을 생성하고 다음 내용을 추가:

```env
# Supabase 데이터베이스 연결 정보
SUPABASE_DB_HOST=db.afzzubvlotobcaiflmia.supabase.co
SUPABASE_DB_PORT=5432
SUPABASE_DB_NAME=postgres
SUPABASE_DB_USER=postgres
SUPABASE_DB_PASSWORD=your_password_here
```

## 테스트 실행

### 1. 기본 실행

```bash
python dashboard_data_analysis_test.py
```

### 2. 특정 사용자 분석

파일 내의 `main()` 함수에서 `user_id` 변수를 설정:

```python
# 특정 사용자 ID로 분석
user_id = "276975db-635b-4c77-87a0-548f91b14231"
analyzer.run_full_analysis(user_id)
```

## 테스트 결과 해석

### 1. 데이터 자동 정리 (요구사항 1)
```
📅 1. 데이터 자동 정리 작업 시작
🗑️  기준 날짜: 2024-01-01 00:00:00
📊 삭제된 검색 기록: 150개
📋 삭제된 AI 리포트: 75개
👤 삭제된 사용자 활동: 200개
🔢 총 삭제된 레코드: 425개
```

### 2. 개인 검색 기술 분야 분석 (요구사항 2)
```
🔍 2. 개인 검색 기술 분야 분석
👤 분석 대상 사용자: 276975db-635b-4c77-87a0-548f91b14231
📊 개인 검색 기술 분야 분포:
  Computer Technology    25회 (35.7%)
  Telecommunications     15회 (21.4%)
  Digital Communication  12회 (17.1%)
  ...
```

### 3. 시장 검색 기술 분야 분석 (요구사항 3)
```
🌐 3. 시장 검색 기술 분야 분석
🏢 시장 전체 검색 기술 분야 분포 (상위 20개):
  Computer Technology    450회 (28.5%)
  Telecommunications     320회 (20.3%)
  Medical Technology     280회 (17.8%)
  ...
```

### 4. 개인 리포트 기술 분야 분석 (요구사항 4)
```
📋 4. 개인 리포트 기술 분야 분석
👤 분석 대상 사용자: 276975db-635b-4c77-87a0-548f91b14231
📊 개인 리포트 기술 분야 분포:
  Computer Technology    8개 (40.0%)
  Telecommunications     6개 (30.0%)
  Digital Communication  4개 (20.0%)
  ...
```

### 5. 시장 리포트 기술 분야 분석 (요구사항 5)
```
🌐 5. 시장 리포트 기술 분야 분석
🏢 시장 전체 리포트 기술 분야 분포 (상위 20개):
  Computer Technology    180개 (25.7%)
  Medical Technology     145개 (20.7%)
  Telecommunications     120개 (17.1%)
  ...
```

### 6. 최근 검색어 목록 (요구사항 6)
```
🔍 6. 최근 검색어 목록
📝 최근 검색어 10개:
순번 검색어                    기술분야        검색시간
1    인공지능 특허 검색         Computer Technology  2024-01-15 14:30
2    5G 통신 기술              Telecommunications   2024-01-15 13:45
3    의료용 AI 진단            Medical Technology   2024-01-15 12:20
...
```

### 7. 최근 리포트 목록 (요구사항 7)
```
📋 7. 최근 리포트 목록
📄 최근 리포트 10개:
순번 리포트명                                          기술분야        생성시간
1    AI기반_진단시스템_KR123456_시장분석_20240115        Medical Technology   2024-01-15 15:20
2    5G통신_특허분석_US987654_비즈니스인사이트_20240115   Telecommunications   2024-01-15 14:10
3    자율주행_알고리즘_EP456789_시장분석_20240115        Computer Technology  2024-01-15 13:30
...
```

### 8. 전체 분석 결과 요약
```
📊 전체 분석 결과 요약
👥 총 사용자 수: 1,250명
🔍 총 검색 수 (100일): 15,680회
📋 총 리포트 수 (100일): 3,420개
🏷️  검색 기술 분야 수: 45개
🏷️  리포트 기술 분야 수: 38개
📈 검색 기술분야 커버리지: 87.5%
📈 리포트 기술분야 커버리지: 92.3%
```

## 문제 해결

### 1. 데이터베이스 연결 오류
```
❌ 데이터베이스 연결 실패: connection to server failed
```
- 환경변수 설정 확인
- 네트워크 연결 상태 확인
- Supabase 프로젝트 상태 확인

### 2. 데이터 없음 오류
```
📝 검색 데이터가 없습니다.
```
- 데이터베이스에 실제 데이터가 있는지 확인
- 날짜 범위 조정 (retention_days 값 증가)
- 사용자 ID 확인

### 3. 권한 오류
```
❌ permission denied for table search_history
```
- 데이터베이스 사용자 권한 확인
- RLS (Row Level Security) 정책 확인

## 커스터마이징

### 1. 분석 기간 변경
```python
# 클래스 초기화 시 retention_days 변경
analyzer = DashboardDataAnalyzer(db_config)
analyzer.retention_days = 30  # 30일로 변경
```

### 2. 출력 형식 변경
```python
# CSV 파일로 결과 저장
df.to_csv('search_analysis.csv', encoding='utf-8-sig')

# JSON 형태로 결과 저장
import json
with open('analysis_result.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
```

### 3. 그래프 생성 추가
```python
import matplotlib.pyplot as plt

# 기술 분야별 분포 차트 생성
plt.figure(figsize=(12, 8))
plt.pie(df['검색수'], labels=df['기술분야'], autopct='%1.1f%%')
plt.title('기술 분야별 검색 분포')
plt.savefig('search_distribution.png', dpi=300, bbox_inches='tight')
plt.show()
```

## 자동화 설정

### 1. 스케줄러 설정 (Windows)
```batch
# 매일 자정에 실행하는 배치 파일 생성
@echo off
cd /d "C:\patent_ai\.trae\documents"
python dashboard_data_analysis_test.py >> analysis_log.txt 2>&1
```

### 2. Cron 설정 (Linux/macOS)
```bash
# crontab -e
0 0 * * * cd /path/to/project && python dashboard_data_analysis_test.py >> analysis_log.txt 2>&1
```

## 로그 및 모니터링

### 1. 로그 파일 생성
```python
import logging

# 로깅 설정
logging.basicConfig(
    filename='dashboard_analysis.log',
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
```

### 2. 알림 설정
```python
# 이메일 알림 (선택사항)
import smtplib
from email.mime.text import MIMEText

def send_notification(subject, body):
    # 이메일 발송 로직
    pass
```

이 가이드를 따라 Python 테스트 파일을 실행하면 실제 데이터베이스를 기반으로 한 모든 분석 결과를 텍스트 형태로 확인할 수 있습니다.