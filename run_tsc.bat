@echo off
cd /d "c:\Users\PC\Desktop\Projects\KAIROS"
npx tsc --noEmit 2>&1
exit /b %ERRORLEVEL%
