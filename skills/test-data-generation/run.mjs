import { writeFile, mkdir, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname      = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = join(__dirname, '..', '..');

/**
 * Phase 4 — Test Data Generation
 *
 * For each E2E test suite found in /e2e/tests/ (or the specified --suite),
 * creates a dedicated /test-data/<suite>.testdata.json file.
 *
 * Developers edit the JSON files to set real usernames, passwords, roles,
 * and sample inputs without touching the test code.
 */
export default async function run(ctx) {
  const e2eTests = ctx.paths?.e2e
    ? join(ctx.paths.e2e, 'tests')
    : join(FRAMEWORK_ROOT, 'e2e', 'tests');
  const testDataDir = ctx.paths?.testData ?? join(FRAMEWORK_ROOT, 'test-data');
  await mkdir(testDataDir, { recursive: true });

  // Resolve which suites to generate data for
  const suiteName = ctx.args?.suite;
  let suites = [];

  if (suiteName) {
    suites = [suiteName.replace(/[^a-z0-9-_]/gi, '-').toLowerCase()];
  } else if (existsSync(e2eTests)) {
    const files = await readdir(e2eTests);
    suites = files
      .filter(f => f.endsWith('.spec.js'))
      .map(f => f.replace(/\.spec\.js$/, ''));
  }

  if (suites.length === 0) {
    console.warn('[test-data-generation] No suites found. Pass --suite <name> or run generate-e2e first.');
    return { files: [], count: 0 };
  }

  const written = [];

  for (const suite of suites) {
    const outPath = join(testDataDir, `${suite}.testdata.json`);
    if (existsSync(outPath)) {
      console.log(`  ℹ️  Skipping existing: ${outPath}`);
      written.push({ suite, path: outPath, status: 'skipped' });
      continue;
    }
    const data = buildTestData(suite, ctx.config);
    await writeFile(outPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`  ✅ Created: ${outPath}`);
    written.push({ suite, path: outPath, status: 'created' });
  }

  // Always ensure auth.testdata.json exists
  const authPath = join(testDataDir, 'auth.testdata.json');
  if (!existsSync(authPath)) {
    await writeFile(authPath, JSON.stringify(buildAuthData(ctx.config), null, 2), 'utf8');
    console.log(`  ✅ Created: ${authPath}`);
    written.push({ suite: 'auth', path: authPath, status: 'created' });
  }

  console.log(`\n✅ Test data files ready in: ${testDataDir}`);
  return { files: written, count: written.length };
}

// ── Test data builders ────────────────────────────────────────────────────────

function buildTestData(suite, config) {
  const baseUrl = config?.frontend?.baseUrlGuess
    || config?.environment?.baseUrl
    || 'http://localhost:3000';

  return {
    _meta: {
      suite,
      generated: new Date().toISOString(),
      framework: 'AI QA Framework v2',
      note: 'Replace placeholder values with real test environment data.',
    },

    // ── Page path ─────────────────────────────────────────────────────────
    path: `/${suite.replace(/-/g, '/')}`,
    baseUrl,

    // ── User roles ────────────────────────────────────────────────────────
    // IMPORTANT: Replace with real test credentials — never commit real passwords!
    adminUser: {
      email: 'admin@example.com',
      password: 'REPLACE_WITH_REAL_PASSWORD',
      role: 'admin',
      fullName: 'Admin User',
    },
    agentUser: {
      email: 'agent@example.com',
      password: 'REPLACE_WITH_REAL_PASSWORD',
      role: 'agent',
      fullName: 'Agent User',
    },
    supervisorUser: {
      email: 'supervisor@example.com',
      password: 'REPLACE_WITH_REAL_PASSWORD',
      role: 'supervisor',
      fullName: 'Supervisor User',
    },
    readOnlyUser: {
      email: 'readonly@example.com',
      password: 'REPLACE_WITH_REAL_PASSWORD',
      role: 'viewer',
      fullName: 'Read Only User',
    },

    // ── Valid sample inputs ───────────────────────────────────────────────
    validInputs: {
      name: `Test ${capitalize(suite)} ${Date.now()}`,
      email: `test-${suite}@example.com`,
      phone: '+966501234567',
      description: `Sample description for ${suite} test`,
      searchQuery: 'test',
    },

    // ── Invalid / boundary inputs ─────────────────────────────────────────
    invalidInputs: {
      emptyString: '',
      whitespaceOnly: '   ',
      tooLong: 'A'.repeat(1001),
      specialChars: '<script>alert("xss")</script>',
      sqlInjection: "'; DROP TABLE users; --",
      negativeNumber: -1,
      zero: 0,
      futureDate: '2099-12-31',
      pastDate: '1900-01-01',
      invalidEmail: 'not-an-email',
      invalidPhone: '123',
    },

    // ── Suite-specific data ───────────────────────────────────────────────
    specific: buildSuiteSpecific(suite),

    // ── Expected messages ─────────────────────────────────────────────────
    expectedMessages: {
      success: ['تم بنجاح', 'Success', 'Saved', 'Created'],
      error:   ['خطأ', 'Error', 'Failed', 'Invalid'],
      validation: ['مطلوب', 'Required', 'Invalid', 'يرجى'],
      unauthorized: ['غير مصرح', 'Unauthorized', '401', '403'],
    },
  };
}

function buildSuiteSpecific(suite) {
  // Suite-specific data scaffolds for common feature types
  const patterns = {
    login: {
      loginPath: '/auth/login',
      logoutPath: '/auth/logout',
      redirectAfterLogin: '/dashboard',
    },
    register: {
      registerPath: '/auth/register',
      confirmationEmailSubject: 'Confirm your account',
    },
    'opt-in': {
      templateName: 'Sample Opt-In Template',
      webhookUrl: 'https://example.com/webhook',
      phone: '+966501234567',
    },
    campaign: {
      campaignName: `Test Campaign ${Date.now()}`,
      audience: 'All Contacts',
      scheduledAt: new Date(Date.now() + 86400000).toISOString(),
    },
    contact: {
      firstName: 'Ahmed',
      lastName: 'Test',
      phone: '+966501234567',
      email: 'ahmed.test@example.com',
      tags: ['test', 'automated'],
    },
  };

  // Match suite name to pattern
  for (const [key, data] of Object.entries(patterns)) {
    if (suite.includes(key)) return data;
  }
  return { placeholder: `Add ${suite}-specific data here` };
}

function buildAuthData(config) {
  return {
    _meta: {
      note: 'Shared authentication test data. Replace with real credentials.',
      generated: new Date().toISOString(),
    },
    adminUser: {
      email: 'admin@example.com',
      password: 'REPLACE_WITH_REAL_PASSWORD',
      role: 'admin',
    },
    agentUser: {
      email: 'agent@example.com',
      password: 'REPLACE_WITH_REAL_PASSWORD',
      role: 'agent',
    },
    supervisorUser: {
      email: 'supervisor@example.com',
      password: 'REPLACE_WITH_REAL_PASSWORD',
      role: 'supervisor',
    },
    invalidUser: {
      email: 'invalid@example.com',
      password: 'WrongPassword123!',
    },
    loginPath: config?.routes?.pages?.find(p => /auth|login/i.test(p)) ?? '/auth/login',
    dashboardPath: '/dashboard',
  };
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
