@echo off
chcp 65001 >nul
title Install KhaKhlong POS Auto-Start
cd /d "%~dp0"

set "TARGET_BAT=%~dp0start-pos.bat"
set "STARTUP_LNK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\KhaKhlong-POS-Server.lnk"

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$ws = New-Object -ComObject WScript.Shell; " ^
  "$s1 = $ws.CreateShortcut('%STARTUP_LNK%'); " ^
  "$s1.TargetPath = '%TARGET_BAT%'; " ^
  "$s1.WorkingDirectory = '%~dp0'; " ^
  "$s1.Description = 'KhaKhlong POS Local Server'; " ^
  "$s1.Save(); " ^
  "$desktop = [Environment]::GetFolderPath('Desktop'); " ^
  "$s2 = $ws.CreateShortcut((Join-Path $desktop 'KhaKhlong POS Server.lnk')); " ^
  "$s2.TargetPath = '%TARGET_BAT%'; " ^
  "$s2.WorkingDirectory = '%~dp0'; " ^
  "$s2.Description = 'KhaKhlong POS Local Server'; " ^
  "$s2.Save();"

echo ============================================================
echo  ติดตั้งระบบเปิดอัตโนมัติ (Auto-Start) และทางลัดหน้าจอสำเร็จ!
echo  - เมื่อเปิดเครื่อง Windows ครั้งต่อไป ระบบจะเปิดเองอัตโนมัติ
echo  - สร้างไอคอน "KhaKhlong POS Server" ไว้บนหน้าจอ Desktop แล้ว
echo ============================================================
pause

