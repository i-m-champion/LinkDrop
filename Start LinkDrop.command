#!/bin/bash
set -e

cd "$(dirname "$0")"

# Ensure Homebrew & Node binaries are on PATH when double-clicked from Finder
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo ""
echo "⚡ Starting LinkDrop..."

# If a previous LinkDrop instance is running on port 3001, stop it so updates take effect
OLD_PID=$(lsof -iTCP:3001 -sTCP:LISTEN -t 2>/dev/null || true)
if [ -n "$OLD_PID" ]; then
  echo "🔄 Restarting LinkDrop server (stopping PID $OLD_PID to apply latest fixes)..."
  kill -9 $OLD_PID 2>/dev/null || true
  sleep 1
fi

# Build production UI automatically if dist/ doesn't exist yet
if [ ! -d "dist" ]; then
  echo "📦 Building LinkDrop UI for first run..."
  npm run build
fi

# Open browser shortly after server starts
(sleep 1.5 && open "http://localhost:3001") &

npm start
