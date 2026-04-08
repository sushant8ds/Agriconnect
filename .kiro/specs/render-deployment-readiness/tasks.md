# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Deployment Configuration Defects
  - **CRITICAL**: This test MUST FAIL on unfixed code — failure confirms the bugs exist
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior — it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate each deployment defect before fixing
  - **Scoped PBT Approach**: Scope to the concrete failing cases in each config file for reproducibility
  - Parse `render.yaml` and assert all required backend env var keys are present: `MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `JWT_REFRESH_SECRET`, `OPENAI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `GOOGLE_TRANSLATE_API_KEY`, `WEATHER_API_KEY`, `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `CORS_ORIGIN`
  - Assert `VITE_API_URL` is present in the frontend static service envVars in `render.yaml`
  - Read `backend/Dockerfile` and assert the production stage contains `COPY --from=builder /app/src/data`
  - Mock `NODE_ENV=production` and assert `seedAllData` is NOT called during `bootstrap()`
  - Assert that when `CORS_ORIGIN` is unset and `NODE_ENV=production`, the CORS origin does NOT resolve to `'*'`
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests FAIL (this is correct — it proves the bugs exist)
  - Document counterexamples found (e.g., "render.yaml backend has only 1 env var, needs 20+", "Dockerfile has no src/data copy", "seedAllData() called unconditionally")
  - Mark task complete when tests are written, run, and failures are documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Development Mode and Application Behavior Unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe: with `NODE_ENV=development` and no `CORS_ORIGIN`, CORS origin resolves to `'*'` on unfixed code
  - Observe: with `NODE_ENV=development`, `seedAllData()` is called during `bootstrap()` on unfixed code
  - Observe: TypeScript compilation (`tsc --noEmit`) produces zero errors on unfixed code
  - Write property-based test: for any `NODE_ENV` value that is NOT `'production'`, `seedAllData()` is still called (dev behavior preserved)
  - Write property-based test: for any `NODE_ENV` value that is NOT `'production'` with no `CORS_ORIGIN`, origin resolves to `'*'` (dev wildcard preserved)
  - Write property-based test: for any comma-separated `CORS_ORIGIN` string, the split result is always a correct array of URLs
  - Verify all preservation tests PASS on UNFIXED code
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 3. Fix render.yaml — add all required backend env vars and VITE_API_URL for frontend

  - [x] 3.1 Add all missing backend env vars to render.yaml
    - Add `MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN` with `sync: false` (except static values)
    - Add `OPENAI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL` with `sync: false`
    - Add `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER` with `sync: false`
    - Add `GOOGLE_TRANSLATE_API_KEY`, `WEATHER_API_KEY`, `WEATHER_API_URL` (static value), `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX_NAME` (static value), `CORS_ORIGIN` with `sync: false`
    - _Bug_Condition: isBugCondition(config) where renderYaml.backend.envVars does not contain required keys_
    - _Expected_Behavior: backend service declares all required env vars so Render prompts for secrets at deploy time_
    - _Preservation: All existing env vars (NODE_ENV, PORT, WEATHER_API_URL, PINECONE_INDEX_NAME) remain unchanged_
    - _Requirements: 2.1_

  - [x] 3.2 Add VITE_API_URL to the frontend static service in render.yaml
    - Change the frontend service `runtime: static` to `type: static` (correct Render Blueprint key)
    - Add `VITE_API_URL` env var using `fromService` referencing `agriconnect-backend` host
    - Confirm the `routes` rewrite rule (`/* → /index.html`) is present and correct
    - _Bug_Condition: isBugCondition(config) where renderYaml.frontend.envVars does not contain VITE_API_URL_
    - _Expected_Behavior: frontend build receives VITE_API_URL so axios base URL is never undefined_
    - _Preservation: SPA rewrite rule continues to serve index.html for all paths_
    - _Requirements: 2.2, 2.7_

- [x] 4. Fix backend/Dockerfile — copy src/data/ into production image

  - [x] 4.1 Add COPY instruction for src/data in the production stage
    - After `COPY --from=builder /app/dist ./dist`, add `COPY --from=builder /app/src/data ./src/data`
    - This ensures `src/data/farmingKnowledge.json` is present in the final image at the path the app expects
    - _Bug_Condition: isBugCondition(config) where dockerfile does not copy src/data/_
    - _Expected_Behavior: production image contains dist/ AND src/data/farmingKnowledge.json_
    - _Preservation: All other COPY instructions and build stages remain unchanged_
    - _Requirements: 2.3_

- [x] 5. Fix backend/src/index.ts — guard seedAllData() for production and fix CORS wildcard

  - [x] 5.1 Wrap seedAllData() call with NODE_ENV guard
    - Replace `await seedAllData()` with a conditional: only call when `process.env.NODE_ENV !== 'production'`
    - _Bug_Condition: isBugCondition(config) where index.ts calls seedAllData() without NODE_ENV guard_
    - _Expected_Behavior: seedAllData() is never invoked when NODE_ENV === 'production'_
    - _Preservation: seedAllData() continues to be called in development and test modes — behavior identical to pre-fix_
    - _Requirements: 2.4, 3.1_

  - [x] 5.2 Fix CORS config to reject wildcard in production
    - Replace the `origin: process.env.CORS_ORIGIN ? ... : '*'` pattern with a guard that throws when `CORS_ORIGIN` is unset in production
    - Safe pattern: if `NODE_ENV === 'production'` and `CORS_ORIGIN` is unset, throw `Error('CORS_ORIGIN must be set in production')`; otherwise fall back to `'*'` for dev
    - _Bug_Condition: isBugCondition(config) where cors config defaults to '*' when CORS_ORIGIN is unset in production_
    - _Expected_Behavior: production startup fails fast with a clear error if CORS_ORIGIN is missing; credentialed requests never hit a wildcard origin_
    - _Preservation: development mode continues to use '*' when CORS_ORIGIN is absent_
    - _Requirements: 2.6, 3.1_

- [x] 6. Create web/.env.production with VITE_API_URL
  - Create `web/.env.production` at the repo root (not inside `Agriconnect/`)
  - Set `VITE_API_URL=https://agriconnect-backend.onrender.com` (matches the service name in render.yaml)
  - This ensures `import.meta.env.VITE_API_URL` is defined at Vite build time and the axios client uses the correct base URL
  - _Bug_Condition: isBugCondition(config) where web/.env.production does not exist_
  - _Expected_Behavior: VITE_API_URL resolves to the production backend URL in all built frontend assets_
  - _Preservation: Development mode is unaffected — Vite only reads .env.production during production builds_
  - _Requirements: 2.5_

- [x] 7. Run TypeScript compilation check to verify zero errors
  - Run `tsc --noEmit` in the `backend/` directory to confirm all TypeScript changes compile cleanly
  - Run `tsc --noEmit` in the `web/` directory to confirm frontend TypeScript is also clean
  - Assert zero errors across all source files after all changes
  - **Property 1: Expected Behavior** - All Deployment Config Defects Resolved
  - Re-run the bug condition exploration tests from task 1 — all should now PASS
  - **EXPECTED OUTCOME**: All bug condition tests PASS (confirms all seven defects are fixed)
  - **Property 2: Preservation** - Development Mode and Application Behavior Unchanged
  - Re-run the preservation property tests from task 2 — all should still PASS
  - **EXPECTED OUTCOME**: All preservation tests PASS (confirms no regressions)
  - _Requirements: 3.7_

- [-] 8. Commit and push all changes to GitHub
  - Stage all changed files: `render.yaml`, `backend/Dockerfile`, `backend/src/index.ts`, `web/.env.production`
  - Write a clear commit message describing the deployment readiness fixes
  - Push to the branch Render is watching to trigger the deploy pipeline
  - Verify the Render dashboard shows a new deploy triggered for both `agriconnect-backend` and `agriconnect-web`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7_

- [~] 9. Checkpoint — Ensure all tests pass
  - Ensure all bug condition exploration tests pass (task 1 tests now green after fix)
  - Ensure all preservation property tests pass (task 2 tests still green)
  - Ensure TypeScript compilation is clean (zero errors)
  - Ask the user if any questions arise before marking complete
