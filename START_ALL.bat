@echo off
setlocal
REM ============================================================================
REM Inicia backend + frontend, espera que respondan y abre Google Chrome
REM ============================================================================

set "PROJECT_DIR=%~dp0"
set "PROJECT_DIR=%PROJECT_DIR:~0,-1%"

echo.
echo Iniciando COLGO Academia...
echo.

if not exist "%PROJECT_DIR%\package.json" (
  echo ERROR: No se encontro package.json en:
  echo %PROJECT_DIR%
  echo.
  pause
  exit /b 1
)

start "COLGO Backend (Express)" cmd /k "cd /d ""%PROJECT_DIR%"" && npm run server"
start "COLGO Frontend (Vite)" cmd /k "cd /d ""%PROJECT_DIR%"" && npm run dev"

echo Esperando backend (puerto 3001)...
powershell -NoProfile -Command "$ok=$false; 1..40 | ForEach-Object { try { $r=Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){ Write-Host 'ERROR: Backend no respondio en 40s'; exit 1 }"
if errorlevel 1 (
  echo.
  echo No se pudo conectar al backend. Revisa la ventana "COLGO Backend".
  pause
  exit /b 1
)
echo Backend listo.

echo Esperando frontend (puerto 5173)...
powershell -NoProfile -Command "$ok=$false; 1..40 | ForEach-Object { try { $r=Invoke-WebRequest -Uri 'http://localhost:5173/' -UseBasicParsing -TimeoutSec 2; if($r.StatusCode -eq 200){$ok=$true;break} } catch {}; Start-Sleep -Seconds 1 }; if(-not $ok){ Write-Host 'ERROR: Frontend no respondio en 40s'; exit 1 }"
if errorlevel 1 (
  echo.
  echo No se pudo conectar al frontend. Revisa la ventana "COLGO Frontend".
  pause
  exit /b 1
)
echo Frontend listo.

start "" "chrome" "http://localhost:5173/login"

echo.
echo Todo listo.
echo.
echo Frontend: http://localhost:5173
echo Backend:  http://localhost:3001
echo Login:    MARIO / 123
echo.
echo Cierra las ventanas Backend y Frontend para detener los servidores.
echo.

pause
