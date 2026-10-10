@echo off
title ShellForge — Backend Server (KEEP THIS WINDOW OPEN)
color 0A
echo.
echo  ===================================================
echo   ShellForge Backend Server
echo   DO NOT CLOSE THIS WINDOW
echo  ===================================================
echo.
wsl bash -c "export NVM_DIR=\"$HOME/.nvm\"; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; export SHELLFORGE_WORKSPACE=/tmp/shellforge_ws; bash \"\$(wslpath '%~dp0backend_daemon.sh')\""
pause
