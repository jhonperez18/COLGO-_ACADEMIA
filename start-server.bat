@echo off
cd /d "d:\IUE\COLGO\colgo-academi-saas"

echo ================================================
echo   INSTALANDO DEPENDENCIAS FALTANTES
echo ================================================

call npm install @types/express @types/cors ts-node --save-dev

if %ERRORLEVEL% NEQ 0 (
    echo Error durante la instalación
    pause
    exit /b 1
)

echo.
echo ================================================
echo   INICIANDO SERVIDOR COLGO
echo ================================================
echo.

call npm run server

pause
