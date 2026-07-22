@echo off
chcp 65001 >nul
echo ========== PRE-COMMIT CHECKLIST ==========
echo.

echo [1/4] npm run build ...
cd /d "C:\Users\jeevi\Estospaces\esto-app-projects\estospaces-web"
call npm run build 2>&1
echo.
echo BUILD EXIT CODE: %ERRORLEVEL%
echo.

echo [2/4] npm run typecheck ...
call npx tsc --noEmit 2>&1
echo.
echo TYPECHECK EXIT CODE: %ERRORLEVEL%
echo.

echo [3/4] npm run lint ...
call npm run lint 2>&1
echo.
echo LINT EXIT CODE: %ERRORLEVEL%
echo.

echo [4/4] npm run test ...
call npm run test 2>&1
echo.
echo TEST EXIT CODE: %ERRORLEVEL%
echo.

echo ========== CHECKLIST COMPLETE ==========
pause
