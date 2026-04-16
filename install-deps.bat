@echo off
cd /d "d:\IUE\COLGO\colgo-academi-saas"

echo ================================================
echo   INSTALANDO TODAS LAS DEPENDENCIAS
echo ================================================

call npm install

if %ERRORLEVEL% NEQ 0 (
    echo Error durante la instalación
    pause
    exit /b 1
)

echo.
echo ================================================
echo   DEPENDENCIAS INSTALADAS CORRECTAMENTE
echo ================================================
echo.
echo Ahora puedes ejecutar:
echo   npm run server
echo.

pause
