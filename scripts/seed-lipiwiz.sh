#!/bin/bash
# seed-lipiwiz.sh — One-click: generate content + avatars for lipiwiz.com
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Heart Quest Content Pipeline ==="

echo "Step 1: Generating questions.json + StageConfig.js..."
node "$SCRIPT_DIR/generate-content.cjs"

echo "Step 2: Generating NPC avatars..."
node "$SCRIPT_DIR/generate-avatars.cjs" --clean

echo "Step 3: Building..."
cd "$SCRIPT_DIR/.."
npm run build

echo ""
echo "=== Pipeline Complete ==="
echo "Ready to deploy!"
