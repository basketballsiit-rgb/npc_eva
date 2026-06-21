#!/bin/bash
echo "=== Starting NPC_EVA Deployment ==="
git pull origin main

echo "=== 1. Deploying Backend ==="
cd backend
npm install --production
# Restart or start the backend in PM2
if pm2 list | grep -q "npc-eva-backend"; then
  echo "Restarting backend via PM2..."
  pm2 restart npc-eva-backend
else
  echo "Starting backend via PM2..."
  pm2 start server.js --name npc-eva-backend
fi

echo "=== 2. Deploying Frontend ==="
cd ../frontend
npm install
VITE_API_URL=/npc_eva_backend npm run build

echo "=== Deployment Completed Successfully ==="
