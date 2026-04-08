# Bugfix Requirements Document

## Introduction

The KisanServe/AgriConnect platform needs to be render-ready for deployment on Render.com. After a thorough audit of the full-stack codebase (backend Node.js/Express/TypeScript, React/Vite frontend, render.yaml), the following production-readiness issues were identified. All TypeScript compilation is clean (zero errors across all files). The issues are configuration, environment, and deployment-pipeline gaps that would prevent a successful Render deploy or cause runtime failures in production.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the root `render.yaml` is used for deployment THEN the backend service uses `runtime: docker` but the Dockerfile copies `src/` without the `data/` directory, causing the `farmingKnowledge.json` knowledge base to be missing at runtime

1.2 WHEN the root `render.yaml` is used THEN the backend service declares only `NODE_ENV=production` with no other env vars (no `MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, etc.), causing the server to crash on startup due to missing required configuration

1.3 WHEN the root `render.yaml` is used THEN the frontend static service has no `VITE_API_URL` env var configured, causing all API calls to hit relative `/api/...` paths which fail on a static host with no backend proxy

1.4 WHEN the backend Docker image is built THEN the `data/farmingKnowledge.json` file is not copied into the image because the Dockerfile only copies `src/` and `dist/`, so the chatbot knowledge base is unavailable at runtime

1.5 WHEN the backend starts in production THEN `seedAllData()` is called on every startup, causing unnecessary DB queries and potential race conditions on a cold-start Render instance

1.6 WHEN the web frontend is built for production THEN there is no `web/.env.production` file at the root project level (only inside `Agriconnect/web/`), so `VITE_API_URL` is undefined and the axios client uses an empty base URL

1.7 WHEN the backend CORS config reads `CORS_ORIGIN` THEN if the env var is not set it defaults to `'*'` (wildcard), which blocks credentialed requests in production browsers

1.8 WHEN the Render static site serves the SPA THEN direct navigation to routes like `/dashboard` or `/bookings` returns a 404 before the `404.html` redirect script can fire, causing a flash of error on first load for some browsers

### Expected Behavior (Correct)

2.1 WHEN the root `render.yaml` is used THEN the backend service SHALL include all required env var declarations (`MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `CORS_ORIGIN`, etc.) with `sync: false` so Render prompts for them

2.2 WHEN the root `render.yaml` is used THEN the frontend static service SHALL have `VITE_API_URL` configured to reference the backend service URL so API calls resolve correctly in production

2.3 WHEN the backend Docker image is built THEN the Dockerfile SHALL copy `src/data/` into the image so `farmingKnowledge.json` is available at the path the app expects

2.4 WHEN the backend starts in production THEN the seed function SHALL be guarded so it only runs when `NODE_ENV !== 'production'` OR only when the DB is genuinely empty, preventing unnecessary startup overhead

2.5 WHEN the web frontend is built THEN a `web/.env.production` file SHALL exist at the root project level with `VITE_API_URL` pointing to the production backend URL

2.6 WHEN the backend CORS config runs in production THEN it SHALL require `CORS_ORIGIN` to be explicitly set and SHALL NOT fall back to wildcard `'*'` for credentialed requests

2.7 WHEN the Render static site serves the SPA THEN the `render.yaml` routes rewrite SHALL correctly handle all paths to `index.html` so direct navigation works without a 404 flash

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the backend runs in development mode THEN the system SHALL CONTINUE TO use the in-memory Redis stub and dev OTP logging when `REDIS_URL` and `TWILIO_*` env vars are absent

3.2 WHEN the chatbot is queried THEN the system SHALL CONTINUE TO use the local `farmingKnowledge.json` knowledge base (no OpenAI/Pinecone required) for all responses

3.3 WHEN Firebase credentials are absent THEN the system SHALL CONTINUE TO skip push notifications gracefully without crashing

3.4 WHEN Redis is unavailable THEN the system SHALL CONTINUE TO run without background job queues (BullMQ gracefully disabled) and without OTP rate limiting

3.5 WHEN a user registers or logs in THEN the system SHALL CONTINUE TO issue JWT access tokens and refresh tokens correctly

3.6 WHEN the frontend is served as a static site THEN the system SHALL CONTINUE TO handle SPA client-side routing via the `404.html` redirect mechanism

3.7 WHEN the backend TypeScript is compiled THEN the system SHALL CONTINUE TO produce zero TypeScript errors across all source files
