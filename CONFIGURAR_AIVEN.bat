@echo off
title COLGO - Despliegue produccion (Aiven + Vercel)
echo.
echo 1. En .env agrega AIVEN_TOKEN o DATABASE_URL (ver .env.production.example)
echo 2. Ejecutando deploy automatico...
call npm run deploy:production
pause
