@echo off
chcp 65001 >nul
title KhaKhlong POS Server (Local Production + Cloudflare Tunnel)
cd /d "%~dp0"
node scripts\start-local-server.mjs %*
pause

