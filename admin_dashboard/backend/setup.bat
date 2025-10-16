@echo off
echo ========================================
echo Admin Dashboard Backend Setup
echo ========================================

echo.
echo 1. Python 가상환경 생성 중...
python -m venv venv

echo.
echo 2. 가상환경 활성화 중...
call venv\Scripts\activate.bat

echo.
echo 3. pip 업그레이드 중...
python -m pip install --upgrade pip

echo.
echo 4. 의존성 설치 중...
pip install -r requirements.txt

echo.
echo 5. 환경 변수 파일 설정...
if not exist .env (
    copy .env.example .env
    echo .env 파일이 생성되었습니다. 필요한 설정을 수정해주세요.
) else (
    echo .env 파일이 이미 존재합니다.
)

echo.
echo ========================================
echo 설치 완료!
echo ========================================
echo.
echo 다음 명령어로 서버를 시작할 수 있습니다:
echo   1. venv\Scripts\activate.bat
echo   2. python run.py
echo.
echo 또는 start.bat 파일을 실행하세요.
echo ========================================

pause