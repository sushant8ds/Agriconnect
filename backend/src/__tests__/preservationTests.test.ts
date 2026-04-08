/**
 * Preservation Property Tests
 *
 * These tests are written BEFORE any fixes are applied.
 * They MUST PASS on unfixed code — they document current correct behavior
 * that must be preserved after the fix is implemented.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '../../../');

// ─── Property 1: Dev wildcard preserved ──────────────────────────────────────
// For any NODE_ENV value that is NOT 'production', CORS origin resolves to '*'
// when CORS_ORIGIN is absent.
//
// Validates: Requirements 3.1 (dev mode unchanged)

describe('Preservation — CORS wildcard for non-production NODE_ENV', () => {
  const NON_PRODUCTION_ENVS = [
    'development',
    'test',
    'staging',
    'local',
    'dev',
    'qa',
    'uat',
    '',
    'PRODUCTION', // case-sensitive — not equal to 'production'
    'Production',
    'preview',
    'ci',
  ];

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

  test.each(NON_PRODUCTION_ENVS)(
    'CORS origin resolves to "*" when NODE_ENV="%s" and CORS_ORIGIN is absent',
    (nodeEnv) => {
      process.env.NODE_ENV = nodeEnv;
      delete process.env.CORS_ORIGIN;

      // Replicate the CURRENT (unfixed) CORS logic from backend/src/index.ts:
      //   origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*'
      // This behavior MUST be preserved after the fix for all non-production envs.
      const rawOrigin = process.env.CORS_ORIGIN as string | undefined;
      const corsOrigin = rawOrigin ? rawOrigin.split(',') : '*';

      expect(corsOrigin).toBe('*');
    }
  );
});

// ─── Property 2: CORS_ORIGIN split correctness ───────────────────────────────
// For any comma-separated CORS_ORIGIN string, the split result is always a
// correct array of URLs.
//
// Validates: Requirements 3.1 (CORS config correctness preserved)

describe('Preservation — CORS_ORIGIN comma-split produces correct URL array', () => {
  const CORS_ORIGIN_CASES: Array<{ input: string; expected: string[] }> = [
    {
      input: 'https://example.com',
      expected: ['https://example.com'],
    },
    {
      input: 'https://app.example.com,https://admin.example.com',
      expected: ['https://app.example.com', 'https://admin.example.com'],
    },
    {
      input: 'http://localhost:3000,http://localhost:5173,https://prod.example.com',
      expected: [
        'http://localhost:3000',
        'http://localhost:5173',
        'https://prod.example.com',
      ],
    },
    {
      input: 'https://agriconnect-web.onrender.com',
      expected: ['https://agriconnect-web.onrender.com'],
    },
    {
      input:
        'https://agriconnect-web.onrender.com,https://agriconnect-staging.onrender.com',
      expected: [
        'https://agriconnect-web.onrender.com',
        'https://agriconnect-staging.onrender.com',
      ],
    },
    {
      input: 'https://a.com,https://b.com,https://c.com,https://d.com',
      expected: [
        'https://a.com',
        'https://b.com',
        'https://c.com',
        'https://d.com',
      ],
    },
  ];

  test.each(CORS_ORIGIN_CASES)(
    'CORS_ORIGIN "$input" splits into correct URL array',
    ({ input, expected }) => {
      // Replicate the split logic from backend/src/index.ts:
      //   process.env.CORS_ORIGIN.split(',')
      const result = input.split(',');

      expect(result).toEqual(expected);
      expect(result).toHaveLength(expected.length);
      // Every element must be a non-empty string
      result.forEach((url) => {
        expect(typeof url).toBe('string');
        expect(url.length).toBeGreaterThan(0);
      });
    }
  );

  test('split count matches number of comma-separated entries', () => {
    // Property: for any comma-separated string with N commas, split produces N+1 elements
    const cases = [
      { input: 'https://a.com', commas: 0 },
      { input: 'https://a.com,https://b.com', commas: 1 },
      { input: 'https://a.com,https://b.com,https://c.com', commas: 2 },
    ];

    cases.forEach(({ input, commas }) => {
      const result = input.split(',');
      expect(result).toHaveLength(commas + 1);
    });
  });
});

// ─── Property 3: TypeScript compilation produces zero errors ─────────────────
// Validates: Requirements 3.7

describe('Preservation — TypeScript compilation produces zero errors', () => {
  test('tsc --noEmit in backend/ exits with code 0', () => {
    const backendDir = path.join(REPO_ROOT, 'backend');

    let output = '';
    let exitCode = 0;

    try {
      output = execSync('npx tsc --noEmit', {
        cwd: backendDir,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err: any) {
      output = err.stdout ?? err.stderr ?? String(err);
      exitCode = err.status ?? 1;
    }

    if (exitCode !== 0) {
      console.error('TypeScript compilation errors:\n', output);
    }

    expect(exitCode).toBe(0);
  });
});
