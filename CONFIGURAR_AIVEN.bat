@echo off
title COLGO - Configurar Aiven + Render
echo.
echo === PASO 1: Credenciales Aiven ===
echo Abre Aiven - Connection information de tu MySQL
start "" "https://console.aiven.io/"
echo.
if not exist ".env.production" (
  copy /Y ".env.production.example" ".env.production"
  echo Creado .env.production - editalo con host, user y password de Aiven.
  notepad ".env.production"
  pause
)
echo.
echo === PASO 2: Probar conexion y ver variables para Render ===
call npm run setup:aiven
echo.
echo === PASO 3: Pegar variables en Render ===
start "" "https://dashboard.render.com/"
echo Cuando guardes en Render, ejecuta: npm run check:production
pause
