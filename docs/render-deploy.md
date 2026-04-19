# Render Deployment

## Overview
- This app can run on Render as a Node Web Service.
- Frontend is built by Vite (`dist`) and served by Express.
- Backend API is the same Express process (`server.js`).

## Required Environment Variables
- `USE_MONGODB=true`
- `MONGODB_URI=<Atlas connection string>`
- `MONGODB_DB=TRPG`

## Included Render Blueprint
- File: `render.yaml`
- Build command: `npm ci && npm run build`
- Start command: `npm run start:render`
- Health check: `/healthz`

## Deploy Steps
1. Push this repository to GitHub.
2. In Render, create a new Blueprint service from this repo (it reads `render.yaml`).
3. Set secret env vars `MONGODB_URI` and `MONGODB_DB` in Render dashboard.
4. Deploy.

## Notes
- `logs/*.txt` and other runtime file writes are ephemeral on Render.
- Persist data to MongoDB for production durability.
