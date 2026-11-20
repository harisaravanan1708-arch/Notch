@echo off
title Re-packaging Notch Dude
cd /d "%~dp0"
echo ========================================================
echo  Re-building Notch Dude & Updating Zip File...
echo ========================================================
echo.
call npm.cmd run package-win
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Compressing into Notch-Dude.zip...
powershell -NoProfile -Command "Compress-Archive -Path 'dist\Notch Dude-win32-x64\*' -DestinationPath 'Notch-Dude.zip' -Force"

echo.
echo ========================================================
echo  SUCCESS! Notch-Dude.zip has been updated!
echo ========================================================
echo You can now share Notch-Dude.zip with any Windows system.
echo.
pause
