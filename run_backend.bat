@echo off
title ShellForge Backend Server
wsl bash -c "export NVM_DIR=\"$HOME/.nvm\"; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; export SHELLFORGE_WORKSPACE=/tmp/shellforge_ws; cd \"\$(wslpath '%~dp0backend')\"; node src/server.js"
pause
