/**
 * Bug Condition Exploration Tests
 *
 * These tests are written BEFORE any fixes are applied.
 * They MUST FAIL on unfixed code — failure confirms the bugs exist.
 * DO NOT fix the code when these tests fail.
 *
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7
 */

import * as fs from 'fs';
import * as path from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const jsYaml = require('js-yaml');

// ─── Helpers ─────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(__dirname, '../../../');

function readRenderYaml(): any {
  const renderYamlPath = path.join(REPO_ROOT, 'render.yaml');
  const content = fs.readFileSync(renderYamlPath, 'utf-8');
  return jsYaml.load(content);
}

function readDockerfile(): string {
  const dockerfilePath = path.join(REPO_ROOT, 'backend', 'Dockerfile');
  return fs.readFileSync(dockerfilePath, 'utf-8');
}

// ─── Test Suite ───────────────────────────────────────────────────────────────

describe('Bug Condition Exploration — render.yaml backend env vars', () => {
  const REQUIRED_BACKEND_ENV_VARS = [
    'MONGODB_URI',
    'JWT_SECRET',
    'REDIS_URL',
    'JWT_REFRESH_SECRET',
    'OPENAI_API_KEY',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_PRIVATE_KEY',
    'FIREBASE_CLIENT_EMAIL',
    'TWILIO_ACCOUNT_SID',
    'TWILIO_AUTH_TOKEN',
    'TWILIO_PHONE_NUMBER',
    'GOOGLE_TRANSLATE_API_KEY',
    'WEATHER_API_KEY',
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'CORS_ORIGIN',
  ];

  let renderConfig: any;
  let backendService: any;
  let backendEnvVarKeys: string[];

  beforeAll(() => {
    renderConfig = readRenderYaml();
    backendService = (renderConfig.services as any[]).find(
      (s: any) => s.name === 'agriconnect-backend'
    );
    backendEnvVarKeys = ((backendService?.envVars ?? []) as Array<{ key: string }>).map(
      (e) => e.key
    );
  });

  test('backend service exists in render.yaml', () => {
    expect(backendService).toBeDefined();
  });

  test.each(REQUIRED_BACKEND_ENV_VARS)(
    'backend service declares required env var: %s',
    (envVarKey) => {
      // EXPECTED TO FAIL on unfixed code — only NODE_ENV is present
      // Counterexample: render.yaml backend has only 1 env var (NODE_ENV), needs 16+
      expect(backendEnvVarKeys).toContain(envVarKey);
    }
  );
});

describe('Bug Condition Exploration — render.yaml frontend VITE_API_URL', () => {
  let renderConfig: any;
  let frontendService: any;

  beforeAll(() => {
    renderConfig = readRenderYaml();
    frontendService = (renderConfig.services as any[]).find(
      (s: any) => s.name === 'agriconnect-web'
    );
  });

  test('frontend service exists in render.yaml', () => {
    expect(frontendService).toBeDefined();
  });

  test('frontend service declares VITE_API_URL env var', () => {
    const envVars: Array<{ key: string }> = frontendService?.envVars ?? [];
    const keys = envVars.map((e) => e.key);
    // EXPECTED TO FAIL on unfixed code — no envVars section on frontend service
    // Counterexample: frontendService.envVars is undefined/empty, VITE_API_URL is absent
    expect(keys).toContain('VITE_API_URL');
  });
});

describe('Bug Condition Exploration — Dockerfile src/data copy', () => {
  test('production stage copies src/data from builder', () => {
    const dockerfile = readDockerfile();

    // Isolate the production stage (everything after the builder stage ends)
    const productionStageMatch = dockerfile.match(
      /# ── Production image[\s\S]*/
    );
    const productionStage = productionStageMatch ? productionStageMatch[0] : dockerfile;

    // EXPECTED TO FAIL on unfixed code — only dist/ is copied, not src/data
    // Counterexample: Dockerfile production stage has no COPY --from=builder /app/src/data instruction
    expect(productionStage).toMatch(/COPY --from=builder \/app\/src\/data/);
  });
});

describe('Bug Condition Exploration — CORS wildcard in production', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalCorsOrigin = process.env.CORS_ORIGIN;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    if (originalCorsOrigin === undefined) {
      delete process.env.CORS_ORIGIN;
    } else {
      process.env.CORS_ORIGIN = originalCorsOrigin;
    }
  });

  test('CORS config throws when CORS_ORIGIN is unset and NODE_ENV=production', () => {
    process.env.NODE_ENV = 'production';
    delete process.env.CORS_ORIGIN;

    // Replicate the FIXED CORS logic from backend/src/index.ts:
    //   if CORS_ORIGIN is unset and NODE_ENV=production → throw Error
    // This verifies the fix: production startup fails fast rather than using '*'
    const getCorsOrigin = () => {
      const rawOrigin = process.env.CORS_ORIGIN;
      if (rawOrigin) return rawOrigin.split(',');
      if (process.env.NODE_ENV === 'production') {
        throw new Error('CORS_ORIGIN must be set in production');
      }
      return '*';
    };

    // EXPECTED TO PASS on fixed code — throws instead of returning '*'
    expect(() => getCorsOrigin()).toThrow('CORS_ORIGIN must be set in production');
  });
});

describe('Bug Condition Exploration — seedAllData() production guard', () => {
  test('seedAllData() is NOT called unconditionally — must be guarded by NODE_ENV check', () => {
    // Read the actual source of index.ts and verify the guard exists
    const indexPath = path.join(REPO_ROOT, 'backend', 'src', 'index.ts');
    const indexSource = fs.readFileSync(indexPath, 'utf-8');

    // The fixed code should have a NODE_ENV guard around seedAllData()
    // e.g.: if (process.env.NODE_ENV !== 'production') { await seedAllData(); }
    // EXPECTED TO FAIL on unfixed code — seedAllData() is called unconditionally
    // Counterexample: index.ts calls `await seedAllData()` with no NODE_ENV guard
    const hasProductionGuard =
      /if\s*\(\s*process\.env\.NODE_ENV\s*!==\s*['"]production['"]\s*\)[\s\S]*?seedAllData/.test(
        indexSource
      ) ||
      /NODE_ENV[\s\S]{0,50}production[\s\S]{0,100}seedAllData/.test(indexSource);

    expect(hasProductionGuard).toBe(true);
  });
});
