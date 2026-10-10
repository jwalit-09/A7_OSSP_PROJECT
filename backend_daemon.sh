#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export SHELLFORGE_WORKSPACE=/tmp/shellforge_ws
mkdir -p "$SHELLFORGE_WORKSPACE"
cd /home/saicharan/A7_OSSP_PROJECT/backend
while true; do
  node src/server.js
  sleep 2
done
