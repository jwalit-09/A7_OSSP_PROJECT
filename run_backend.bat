@echo off
title ShellForge Backend Server
wsl -u saicharan bash -c "export NVM_DIR=\"$HOME/.nvm\"; [ -s \"$NVM_DIR/nvm.sh\" ] && . \"$NVM_DIR/nvm.sh\"; export SHELLFORGE_WORKSPACE=/tmp/shellforge_ws; cd ~/A7_OSSP_PROJECT/backend; node src/server.js"
pause
