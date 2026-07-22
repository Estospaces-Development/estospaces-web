@echo off
chcp 65001 >nul
echo ============================================================
echo  ESTOSPACES PRE-LAUNCH TESTING SUITE
echo ============================================================
echo.

set "WEB_DIR=C:\Users\jeevi\Estospaces\esto-app-projects\estospaces-web"
set "DEV_URL=https://estospaces-web-dev-zaryfkxmeq-nw.a.run.app"
set "PASS=0"
set "FAIL=0"

cd /d "%WEB_DIR%"

echo ============================================================
echo  STEP 1: BUILD
echo ============================================================
call npm run build 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Build succeeded
    set /a PASS+=1
) else (
    echo [FAIL] Build failed with exit code %ERRORLEVEL%
    set /a FAIL+=1
)
echo.

echo ============================================================
echo  STEP 2: TYPECHECK
echo ============================================================
call npx tsc --noEmit 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] TypeScript check passed
    set /a PASS+=1
) else (
    echo [FAIL] TypeScript check failed with exit code %ERRORLEVEL%
    set /a FAIL+=1
)
echo.

echo ============================================================
echo  STEP 3: LINT
echo ============================================================
call npm run lint 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Lint passed
    set /a PASS+=1
) else (
    echo [FAIL] Lint failed with exit code %ERRORLEVEL%
    set /a FAIL+=1
)
echo.

echo ============================================================
echo  STEP 4: UNIT TESTS
echo ============================================================
call npm run test 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [PASS] Unit tests passed
    set /a PASS+=1
) else (
    echo [FAIL] Unit tests failed with exit code %ERRORLEVEL%
    set /a FAIL+=1
)
echo.

echo ============================================================
echo  STEP 5: OPEN BROWSER FOR MANUAL SMOKE TESTS
echo ============================================================
echo.
echo Please verify the following in your browser at %DEV_URL%:
echo.
echo [ ] FLOW 1 - Public Landing:
echo   [ ] Homepage loads with hero/stats
echo   [ ] Search button navigates to /search
echo   [ ] No console errors (F12)
echo   [ ] Mobile responsive at 375px
echo   [ ] Contact page loads at /contact
echo.
echo [ ] FLOW 2 - Auth:
echo   [ ] /login loads with email/password form
echo   [ ] Empty submit shows validation
echo   [ ] Eye icon toggles password (FIX #168)
echo   [ ] /register loads with name validation
echo   [ ] Emoji name rejected (FIX #279)
echo.
echo [ ] FLOW 3 - User Dashboard:
echo   [ ] /user/dashboard loads
echo   [ ] No console errors
echo   [ ] /user/favorites loads
echo   [ ] Cross-role: /admin/dashboard redirects when not admin
echo.
echo [ ] FLOW 4 - Manager Dashboard:
echo   [ ] /manager/dashboard loads with stats
echo   [ ] /manager/profile loads with photo upload
echo   [ ] No console errors
echo   [ ] Cross-role: /admin/dashboard redirects when not admin
echo.
echo [ ] FLOW 5 - Admin Dashboard:
echo   [ ] /admin/dashboard loads with analytics
echo   [ ] Performance metrics show correct count (FIX #304)
echo   [ ] /admin/verifications loads
echo   [ ] No blank gap between sections (FIX #308)
echo   [ ] No console errors
echo.
echo ============================================================
echo  RESULTS SUMMARY
echo ============================================================
echo Passed: %PASS%
echo Failed: %FAIL%
echo.
if %FAIL% EQU 0 (
    echo ALL AUTOMATED CHECKS PASSED
) else (
    echo SOME CHECKS FAILED - review output above
)
echo.
pause
