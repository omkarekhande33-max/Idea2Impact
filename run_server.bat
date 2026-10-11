@echo off
echo ========================================================
echo   Starting Idea2Impact Server (FastAPI + Relational API)
echo ========================================================
echo.
echo Server running at: http://127.0.0.1:8000
echo Open http://127.0.0.1:8000 in your browser.
echo.
cd /d "%~dp0"
call .venv\Scripts\activate.bat
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
pause
