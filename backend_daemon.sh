#!/bin/bash
# ShellForge — Permanent Backend Daemon
# This runs the backend forever, auto-restarts if it crashes
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export SHELLFORGE_WORKSPACE=/tmp/shellforge_ws
mkdir -p "$SHELLFORGE_WORKSPACE"

cd /home/saicharan/A7_OSSP_PROJECT/backend

echo "ShellForge backend starting..."
while true; do
  node src/server.js
  echo "Backend crashed — restarting in 2s..."
  sleep 2
done
