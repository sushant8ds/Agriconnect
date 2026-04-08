# Render Deployment Readiness Bugfix Design

## Overview

The KisanServe platform has seven deployment-blocking issues that prevent a successful Render.com deploy. The bugs span three files (`render.yaml`, `backend/Dockerfile`, `backend/src/index.ts`) and two missing files (`web/.env.production`, CORS guard). The fix strategy is surgical: patch each file minimally, add the missing env file, and guard the seed function — without touching any application logic.

## Glossary

- **Bug_Condition (C)**: Any of the seven deployment configuration defects that cause a Render deploy to fail or produce incorrect runtime behavior
- **Property (P)**: The desired state after fix — the platform deploys successfully and all production runtime behaviors are correct
- **Preservation**: All existing development-mode behaviors, TypeScript compilation, and application logic that must remain unchanged
- **render.yaml**: The Render Blueprint file at the repo root that declares all services, build commands, and env vars
- **isBugCondition**: Pseudocode function that returns true when a deployment configuration defect is present
- **seedAllData**: The function in `backend/src/scripts/seedAll.ts` that populates the DB with demo data — must be skipped in production
- **CORS_ORIGIN**: The env var that controls which origins the backend accepts — must be explicitly set in production, never wildcard

## Bug Details

### Bug Condition

The deployment fails or misbehaves when any of the following conditions hold in the configuration files. Each sub-condition maps to a specific defect.

**Formal Specification:**
```
FUNCTION isBugCondition(config)
  INPUT: config — the set of deployment configuration files
  OUTPUT: boolean

  RETURN (
    renderYaml.backend.envVars DOES NOT CONTAIN required keys
      ['MONGODB_URI', 'JWT_SECRET', 'REDIS_URL', 'JWT_REFRESH_SECRET',
       'OPENAI_API_KEY', 'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY',
       'FIREBASE_CLIENT_EMAIL', 'TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN',
       'TWILIO_PHONE_NUMBER', 'GOOGLE_TRANSLATE_API_KEY', 'WEATHER_API_KEY',
       'PINECONE_API_KEY', 'PINECONE_ENVIRONMENT', 'CORS_ORIGIN']
    OR renderYaml.frontend.envVars DOES NOT CONTAIN 'VITE_API_URL'
    OR dockerfile DOES NOT COPY 'src/data/'
    OR index.ts CALLS seedAllData() WITHOUT NODE_ENV guard
    OR 'web/.env.production' DOES NOT EXIST
    OR cors config DEFAULTS TO '*' WHEN CORS_ORIGIN IS UNSET
    OR renderYaml.frontend.routes DOES NOT rewrite '/*' to '/index.html'
  )
END FUNCTION
```

### Examples

- **render.yaml backend env vars**: Current file has only `NODE_ENV=production`. Backend crashes immediately — `connectDB()` fails with no `MONGODB_URI`, JWT middleware throws with no `JWT_SECRET`.
- **render.yaml frontend VITE_API_URL**: Current file has no `VITE_API_URL` for the static site. All `axios` calls use an empty base URL, hitting the static host itself and returning 404.
- **Dockerfile missing data copy**: `COPY src ./src` copies TypeScript sources but the production image only has `dist/`. The `src/data/farmingKnowledge.json` file is never copied, so the chatbot returns empty results.
- **seedAllData() in production**: Every cold start on Render triggers a full DB wipe-and-reseed, destroying real user data and adding ~5–10s to startup time.
- **Missing web/.env.production**: Vite reads `.env.production` at build time. Without it, `import.meta.env.VITE_API_URL` is `undefined`, and the axios client base URL is `"undefined"`.
- **CORS wildcard in production**: `credentials: true` + `origin: '*'` is rejected by browsers per the CORS spec. All authenticated API calls fail with a CORS error.
- **SPA routing**: Current `render.yaml` has a rewrite rule but it uses `runtime: static` (wrong key — should be `type: static`). Direct navigation to `/dashboard` returns 404.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Development mode continues to use the in-memory Redis stub and console OTP logging when `REDIS_URL` and `TWILIO_*` are absent
- The chatbot continues to use `farmingKnowledge.json` for local RAG responses (no Pinecone/OpenAI required for basic queries)
- Firebase push notifications continue to be skipped gracefully when credentials are absent
- BullMQ background jobs continue to be disabled gracefully when Redis is unavailable
- JWT auth (access + refresh tokens) continues to work correctly
- SPA client-side routing continues to work via the `404.html` redirect mechanism
- TypeScript compilation continues to produce zero errors

**Scope:**
All inputs that do NOT involve the seven identified configuration defects are completely unaffected. This includes all application logic, all API route handlers, all React components, and all TypeScript types.

## Hypothesized Root Cause

1. **Incomplete render.yaml migration**: The root `render.yaml` was created as a minimal skeleton (possibly auto-generated) and was never updated to match the complete env var set that the `Agriconnect/render.yaml` reference file already has. The backend service was switched to Docker runtime but the env vars were not carried over.

2. **Dockerfile written before data directory existed**: The `COPY src ./src` instruction was written when `src/data/` may not have existed yet, or the author assumed the data file would be embedded differently. The production stage only copies `dist/` from the builder, so the data directory is silently dropped.

3. **seedAllData() added for local dev convenience**: The seed call was added to `bootstrap()` for easy local setup and was never guarded for production. The function has an internal skip-if-populated check, but it still runs DB queries on every cold start.

4. **web/.env.production never created at root**: The `Agriconnect/web/.env.production` exists in the reference subdirectory but was not replicated to the root `web/` directory when the project was restructured.

5. **CORS fallback to wildcard is a latent bug**: The `CORS_ORIGIN || '*'` pattern works in development (no credentials) but breaks in production where `credentials: true` is required. The fix needs to either throw on missing `CORS_ORIGIN` in production or use a safe default.

## Correctness Properties

Property 1: Bug Condition - All Required Env Vars Declared in render.yaml

_For any_ deployment using the root `render.yaml`, the backend service SHALL declare all required env vars (`MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `JWT_REFRESH_SECRET`, `OPENAI_API_KEY`, `FIREBASE_*`, `TWILIO_*`, `GOOGLE_TRANSLATE_API_KEY`, `WEATHER_API_KEY`, `PINECONE_*`, `CORS_ORIGIN`) with `sync: false`, and the frontend static service SHALL declare `VITE_API_URL` referencing the backend host.

**Validates: Requirements 2.1, 2.2**

Property 2: Bug Condition - Dockerfile Copies Data Directory

_For any_ Docker build of the backend, the production image SHALL contain `dist/` (compiled JS) AND `src/data/farmingKnowledge.json` so the chatbot knowledge base is available at the path the app expects at runtime.

**Validates: Requirements 2.3**

Property 3: Bug Condition - Seed Guard in Production

_For any_ call to `bootstrap()` where `NODE_ENV === 'production'`, the `seedAllData()` function SHALL NOT execute (no DB queries, no data deletion, no data insertion). For any call where `NODE_ENV !== 'production'`, `seedAllData()` SHALL continue to execute as before.

**Validates: Requirements 2.4**

Property 4: Bug Condition - VITE_API_URL at Build Time

_For any_ production build of the frontend, `import.meta.env.VITE_API_URL` SHALL resolve to the production backend URL (not `undefined` or empty string), so all axios requests use the correct base URL.

**Validates: Requirements 2.5**

Property 5: Bug Condition - No CORS Wildcard in Production

_For any_ production backend startup where `CORS_ORIGIN` is not set, the server SHALL either throw a startup error or use a safe non-wildcard default, and SHALL NOT configure `origin: '*'` when `credentials: true` is active.

**Validates: Requirements 2.6**

Property 6: Preservation - Development Mode Unchanged

_For any_ backend startup where `NODE_ENV !== 'production'`, the fixed code SHALL produce exactly the same behavior as the original code — including seed execution, Redis stub fallback, and console OTP logging.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

Property 7: Preservation - SPA Routing Unchanged

_For any_ request to the Render static site for a path like `/dashboard` or `/bookings`, the rewrite rule SHALL serve `index.html` so React Router handles the route client-side, with no 404 flash.

**Validates: Requirements 2.7, 3.6**

## Fix Implementation

### Changes Required

**File 1: `render.yaml`**

**Specific Changes:**
1. Add all missing backend env vars (`MONGODB_URI`, `JWT_SECRET`, `REDIS_URL`, `JWT_REFRESH_SECRET`, `JWT_EXPIRES_IN`, `JWT_REFRESH_EXPIRES_IN`, `OPENAI_API_KEY`, `FIREBASE_PROJECT_ID`, `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `GOOGLE_TRANSLATE_API_KEY`, `WEATHER_API_KEY`, `WEATHER_API_URL`, `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX_NAME`, `CORS_ORIGIN`) — all with `sync: false` except static values
2. Add `VITE_API_URL` to the frontend static service using `fromService` to reference the backend host (matching the Agriconnect reference pattern)
3. Fix the frontend service declaration — ensure `type: static` (not `runtime: static`) and confirm the rewrite rule is present

---

**File 2: `backend/Dockerfile`**

**Specific Changes:**
1. In the production stage, add `COPY --from=builder /app/src/data ./src/data` after the existing `COPY --from=builder /app/dist ./dist` line so `farmingKnowledge.json` is present in the final image

---

**File 3: `backend/src/index.ts`**

**Specific Changes:**
1. Wrap the `await seedAllData()` call with a `NODE_ENV` guard:
   ```typescript
   if (process.env.NODE_ENV !== 'production') {
     await seedAllData();
   }
   ```
2. Update the CORS config to throw (or warn and use a safe default) when `CORS_ORIGIN` is unset in production:
   ```typescript
   const corsOrigin = process.env.CORS_ORIGIN
     ? process.env.CORS_ORIGIN.split(',')
     : process.env.NODE_ENV === 'production'
       ? (() => { throw new Error('CORS_ORIGIN must be set in production'); })()
       : '*';
   app.use(cors({ origin: corsOrigin, credentials: true }));
   ```

---

**File 4: `web/.env.production` (new file)**

**Specific Changes:**
1. Create `web/.env.production` with:
   ```
   VITE_API_URL=https://agriconnect-backend.onrender.com
   ```
   (The exact URL will be the Render service URL once deployed; this is the placeholder matching the service name in `render.yaml`)

---

**File 5: Push to GitHub**

After all file changes are committed, push to the branch that Render is watching so the deploy pipeline triggers automatically.

## Testing Strategy

### Validation Approach

Two-phase approach: first run exploratory tests on the unfixed code to confirm each bug manifests as expected, then verify the fixes satisfy all correctness properties and preserve existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate each bug BEFORE implementing the fix. Confirm root cause analysis.

**Test Plan**: Inspect configuration files statically and run the backend with a mock production environment to observe failures.

**Test Cases**:
1. **render.yaml env var audit** (will fail on unfixed code): Parse `render.yaml` and assert all required keys are present in the backend service — currently only `NODE_ENV` is present
2. **render.yaml VITE_API_URL audit** (will fail on unfixed code): Assert `VITE_API_URL` is in the frontend service envVars — currently absent
3. **Dockerfile data copy audit** (will fail on unfixed code): Assert `COPY --from=builder /app/src/data` appears in the production stage — currently absent
4. **Seed guard test** (will fail on unfixed code): Call `bootstrap()` with `NODE_ENV=production` mocked and assert `seedAllData` is not called — currently it is always called
5. **CORS wildcard test** (will fail on unfixed code): Start the app with `CORS_ORIGIN` unset and `NODE_ENV=production`, assert `origin` is not `'*'` — currently it defaults to `'*'`

**Expected Counterexamples**:
- `render.yaml` has only 1 env var for backend (needs 20+)
- `VITE_API_URL` is absent from frontend service
- Dockerfile production stage has no `src/data` copy instruction
- `seedAllData()` is invoked unconditionally in `bootstrap()`
- CORS origin resolves to `'*'` when `CORS_ORIGIN` env var is absent

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed configuration produces the expected behavior.

**Pseudocode:**
```
FOR ALL config WHERE isBugCondition(config) DO
  result := applyFix(config)
  ASSERT expectedBehavior(result)
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed code produces the same result as the original.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT original(input) = fixed(input)
END FOR
```

**Testing Approach**: Property-based testing is recommended for the seed guard and CORS behavior because:
- It generates many `NODE_ENV` values and env var combinations automatically
- It catches edge cases (e.g., `NODE_ENV=test`, `NODE_ENV=staging`) that manual tests miss
- It provides strong guarantees that dev-mode behavior is fully preserved

**Test Cases**:
1. **Dev seed preservation**: For `NODE_ENV=development`, assert `seedAllData()` is still called — behavior must be identical to pre-fix
2. **CORS dev preservation**: For `NODE_ENV=development` with no `CORS_ORIGIN`, assert `origin: '*'` is still used (dev mode is fine with wildcard)
3. **TypeScript compilation**: Run `tsc --noEmit` across all source files and assert zero errors after all changes

### Unit Tests

- Test `bootstrap()` with `NODE_ENV=production` — assert `seedAllData` mock is not called
- Test `bootstrap()` with `NODE_ENV=development` — assert `seedAllData` mock is called
- Test CORS middleware config with `CORS_ORIGIN=https://example.com` — assert origin array is `['https://example.com']`
- Test CORS middleware config with no `CORS_ORIGIN` and `NODE_ENV=production` — assert startup throws

### Property-Based Tests

- Generate random `NODE_ENV` values: for any value equal to `'production'`, assert seed is skipped; for any other value, assert seed runs
- Generate random `CORS_ORIGIN` strings (comma-separated URLs): assert the split result is always an array of the correct URLs
- Generate random file path requests to the static site: assert all paths rewrite to `index.html`

### Integration Tests

- Full Docker build: assert `src/data/farmingKnowledge.json` exists in the built image at the expected path
- Full Vite production build with `web/.env.production`: assert `VITE_API_URL` is baked into the bundle and not `undefined`
- render.yaml schema validation: assert all required service keys and env var keys are present using a YAML parser
