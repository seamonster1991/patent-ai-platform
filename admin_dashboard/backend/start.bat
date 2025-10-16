@echo off
echo ========================================
echo Admin Dashboard Backend Server
echo ========================================

echo.
echo 가상환경 활성화 중...
call venv\Scripts\activate.bat

echo.
echo 서버 시작 중...
python run.py