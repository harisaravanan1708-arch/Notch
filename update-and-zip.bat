@echo off
title Re-packaging Windows Boring Notch
cd /d "%~dp0"
echo ========================================================
echo  Re-building Windows Boring Notch & Updating Zip File...
echo ========================================================
echo.
call npm.cmd run package-win
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Build failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo Compressing into Windows-Boring-Notch.zip...
powershell -NoProfile -Command "Compress-Archive -Path 'dist\Windows Boring Notch-win32-x64\*' -DestinationPath 'Windows-Boring-Notch.zip' -Force"

echo.
echo ========================================================
echo  SUCCESS! Windows-Boring-Notch.zip has been updated!
echo ========================================================
echo You can now share the new zip with other systems.
echo.
pause
