#!/bin/bash
set -e

cd "$(dirname "$0")"

# Ensure Homebrew & Node binaries are on PATH when double-clicked from Finder
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

echo ""
echo "⚡ Starting LinkDrop..."

# If LinkDrop is already running on port 3001, just open it in the browser
if command -v lsof >/dev/null 2>&1 && lsof -iTCP:3001 -sTCP:LISTEN -t >/dev/null 2>&1; then
  echo "✅ LinkDrop is already running on http://localhost:3001"
  open "http://localhost:3001"
  exit 0
fi

# Build production UI automatically if dist/ doesn't exist yet
if [ ! -d "dist" ]; then
  echo "📦 Building LinkDrop UI for first run..."
  npm run build
fi

# Open browser shortly after server starts
(sleep 1.5 && open "http://localhost:3001") &

npm start
