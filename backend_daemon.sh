#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
export SHELLFORGE_WORKSPACE=/tmp/shellforge_ws
mkdir -p "$SHELLFORGE_WORKSPACE"
ROOT="$(cd "$(dirname "$0")" && pwd)"
if [ -d "$ROOT/backend" ]; then
  cd "$ROOT/backend"
else
  cd "$ROOT"
fi
while true; do
  node src/server.js
  sleep 2
done
