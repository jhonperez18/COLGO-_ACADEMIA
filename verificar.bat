@echo off
REM Script de verificación - COLGO
REM
REM Este script verifica que todo esté funcionando correctamente

echo.
echo ========================================
echo   VERIFICACION DE SERVIDOR - COLGO
echo ========================================
echo.

REM Verificar Node.js
echo [1/4] Verificando Node.js...
node --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js no está instalado
    pause
    exit /b 1
)
echo ✅ Node.js OK

REM Verificar npm
echo [2/4] Verificando npm...
npm --version >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo ❌ npm no está instalado
    pause
    exit /b 1
)
echo ✅ npm OK

REM Verificar que estamos en la carpeta correcta
echo [3/4] Verificando carpeta del proyecto...
if not exist "package.json" (
    echo ❌ package.json no encontrado
    echo Asegurate de estar en: d:\IUE\COLGO\colgo-academi-saas
    pause
    exit /b 1
)
echo ✅ Carpeta correcta

REM Verificar que node_modules existe
echo [4/4] Verificando dependencias...
if not exist "node_modules" (
    echo ⚠️  node_modules no existe
    echo Ejecuta: npm install
    pause
    exit /b 1
)
echo ✅ Dependencias OK

echo.
echo ========================================
echo   ✅ TODO VERIFICADO EXITOSAMENTE
echo ========================================
echo.
echo Para iniciar:
echo   Terminal 1: npm run server
echo   Terminal 2: npm run dev
echo.
pause
