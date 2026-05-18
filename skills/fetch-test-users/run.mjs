import { readFile, writeFile, unlink } from 'node:fs/promises';
import { existsSync }                  from 'node:fs';
import { join, dirname, resolve, isAbsolute } from 'node:path';
import { fileURLToPath }               from 'node:url';
import { spawn }                       from 'node:child_process';

const __dirname      = dirname(fileURLToPath(import.meta.url));
const FRAMEWORK_ROOT = join(__dirname, '..', '..');

/**
 * Skill: fetch-test-users
 *
 * 1. Reads story file(s) to extract required roles (actors).
 * 2. Reads config.yaml for DB connection settings.
 * 3. Generates + executes a parameterised temp script to query the DB.
 * 4. Returns { rolesNeeded, usersFound, source, dbType, count, message }.
 *
 * Saving to config.yaml is handled interactively by the workflow or the AI.
 */
export default async function run(ctx) {
  // ── 1. Extract roles from story files ────────────────────────────────────
  const rolesNeeded = await extractRolesFromStories(ctx);

  // ── 2. Read config.yaml ───────────────────────────────────────────────────
  const cfgPath = join(FRAMEWORK_ROOT, 'config.yaml');
  if (!existsSync(cfgPath)) {
    return {
      rolesNeeded,
      usersFound: [],
      source:     'error',
      message:    'config.yaml not found. Run the installer first.',
    };
  }

  const cfgText = await readFile(cfgPath, 'utf8');
  const cfg     = parseConfigYaml(cfgText);

  const connStr = cfg.db_connection_string || '';
  const table   = cfg.db_users_table       || 'users';
  const userCol = cfg.db_username_column   || 'email';
  const passCol = cfg.db_password_column   || 'password';
  const roleCol = cfg.db_role_column       || 'role';

  // ── 3. No DB configured → return guidance ────────────────────────────────
  if (!connStr) {
    return {
      rolesNeeded,
      usersFound:   [],
      source:       'no-db',
      message:      'No db_connection_string configured in config.yaml.',
      instructions: [
        'Option A: Add db_connection_string (and optionally db_role_column) to config.yaml then re-run /aiqa-fetchtestusers.',
        'Option B: Use /aiqa-fetchtestusers and choose manual entry.',
      ],
    };
  }

  // ── 4. Detect DB type ─────────────────────────────────────────────────────
  const dbType = detectDbType(connStr);

  if (dbType === 'unknown') {
    return {
      rolesNeeded,
      usersFound: [],
      source:     'unsupported-db',
      message:    `Cannot determine database type from connection string. Supported: SQL Server, PostgreSQL, MySQL, MongoDB, SQLite.`,
    };
  }

  // ── 5. Write + execute temp fetch script ──────────────────────────────────
  const tmpScript = join(FRAMEWORK_ROOT, 'core', '_tmp_fetch_users.mjs');
  const script    = buildFetchScript({ dbType, connStr, table, userCol, passCol, roleCol, rolesNeeded });

  await writeFile(tmpScript, script, 'utf8');

  let stdout     = '';
  let fetchError = null;

  try {
    stdout = await execScript(tmpScript);
  } catch (err) {
    fetchError = String(err.message || err);
  } finally {
    try { await unlink(tmpScript); } catch { /* ignore */ }
  }

  if (fetchError) {
    return {
      rolesNeeded,
      usersFound: [],
      source:     'db-error',
      dbType,
      error:      fetchError,
      message:    `Script execution failed: ${fetchError}`,
    };
  }

  // ── 6. Parse result ───────────────────────────────────────────────────────
  let parsed;
  try {
    parsed = JSON.parse(stdout.trim());
  } catch {
    return {
      rolesNeeded,
      usersFound: [],
      source:     'parse-error',
      dbType,
      raw:        stdout.slice(0, 500),
      message:    'Could not parse the database response as JSON.',
    };
  }

  if (parsed && parsed.error) {
    return {
      rolesNeeded,
      usersFound: [],
      source:     'db-error',
      dbType,
      error:      parsed.error,
      message:    parsed.error,
    };
  }

  const usersFound = (Array.isArray(parsed) ? parsed : []).map(u => ({
    role:     u.role || u[roleCol] || (rolesNeeded.length === 1 ? rolesNeeded[0] : 'user'),
    username: u.username || u[userCol] || '',
    password: u.password || u[passCol] || '',
    notes:    '',
  }));

  return {
    rolesNeeded,
    usersFound,
    source:  'db',
    dbType,
    count:   usersFound.length,
    message: `Fetched ${usersFound.length} user(s) from "${table}"` +
             (rolesNeeded.length ? ` matching roles: ${rolesNeeded.join(', ')}` : ' (no role filter — showing all)'),
  };
}

// ── Story parsing ────────────────────────────────────────────────────────────

function resolveStoryPaths(ctx) {
  const base = ctx.paths?.project || FRAMEWORK_ROOT;
  const res  = p => (isAbsolute(p) ? p : resolve(base, p));

  if (Array.isArray(ctx.args?.stories) && ctx.args.stories.length > 0)
    return ctx.args.stories.map(res);
  if (typeof ctx.args?.stories === 'string' && ctx.args.stories.trim())
    return ctx.args.stories.trim().split(/[\s,]+/).filter(Boolean).map(res);
  if (ctx.args?.story)
    return [res(ctx.args.story)];
  return [];
}

async function extractRolesFromStories(ctx) {
  // Allow explicit --role "admin,manager" override
  if (ctx.args?.role) {
    return String(ctx.args.role).split(/[,\s]+/).map(r => r.trim().toLowerCase()).filter(Boolean);
  }

  const paths = resolveStoryPaths(ctx);
  if (paths.length === 0) return [];

  const roles = new Set();

  for (const storyPath of paths) {
    if (!existsSync(storyPath)) {
      console.warn(`[fetch-test-users] Story not found: ${storyPath}`);
      continue;
    }
    try {
      const src = await readFile(storyPath, 'utf8');
      extractRolesFromText(src, roles);
    } catch (err) {
      console.warn(`[fetch-test-users] Could not read story: ${storyPath} — ${err.message}`);
    }
  }

  return [...roles];
}

/**
 * Extracts actor/role names from raw story text using two strategies:
 *   A) Formal "as a/an <role>" pattern
 *   B) Known role keywords present anywhere in the text
 */
function extractRolesFromText(src, rolesSet) {
  // Strategy A: formal actor declaration
  const actorRx = /\bas\s+an?\s+([a-z][a-z\s_-]{0,29}?)(?=\s*[,\n]|\s+(?:i\s+want|who|that)\b)/gi;
  let m;
  while ((m = actorRx.exec(src)) !== null) {
    const raw = m[1].trim().toLowerCase().replace(/\s+/g, '_');
    const normalised = normaliseRole(raw);
    if (normalised) rolesSet.add(normalised);
  }

  // Strategy B: keyword scan for common role names
  const KNOWN_ROLES = [
    'admin', 'administrator', 'manager', 'supervisor', 'agent',
    'editor', 'viewer', 'guest', 'customer', 'owner', 'operator',
    'employee', 'staff', 'reviewer', 'moderator', 'user',
  ];
  for (const kw of KNOWN_ROLES) {
    if (new RegExp(`\\b${kw}\\b`, 'i').test(src)) rolesSet.add(kw);
  }
}

const ROLE_ALIASES = {
  administrator:    'admin',
  system_admin:     'admin',
  system_administrator: 'admin',
  regular_user:     'user',
  end_user:         'user',
  normal_user:      'user',
  standard_user:    'user',
};

function normaliseRole(raw) {
  if (!raw || raw.length > 30) return null;
  return ROLE_ALIASES[raw] || raw;
}

// ── Config YAML parser (minimal — no external deps) ──────────────────────────

function parseConfigYaml(text) {
  const cfg = {};
  for (const line of text.split('\n')) {
    // Match:  key: "value"  OR  key: value  (ignoring comments)
    const m = line.match(/^([a-z_]+):\s*"?([^"#\n]*?)"?\s*(?:#.*)?$/);
    if (m && m[1]) cfg[m[1]] = m[2].trim();
  }
  return cfg;
}

// ── DB type detection ─────────────────────────────────────────────────────────

function detectDbType(connStr) {
  const s = connStr.toLowerCase().trim();
  if (s.includes('server=') || s.includes('data source=') || s.includes('mssql') || s.includes('sqlserver') || s.includes('initial catalog=')) return 'sqlserver';
  if (s.startsWith('postgresql://') || s.startsWith('postgres://'))  return 'postgres';
  if (s.startsWith('mysql://') || s.includes('mysql'))              return 'mysql';
  if (s.startsWith('mongodb://') || s.startsWith('mongodb+srv://')) return 'mongodb';
  if (s.startsWith('sqlite:') || s.endsWith('.db') || s.endsWith('.sqlite') || s.endsWith('.sqlite3')) return 'sqlite';
  return 'unknown';
}

// ── Temp script builder ───────────────────────────────────────────────────────

function buildFetchScript({ dbType, connStr, table, userCol, passCol, roleCol, rolesNeeded }) {
  const J = v => JSON.stringify(v);   // safe JSON serialise for embedding in script
  const args = { connStr: J(connStr), table: J(table), userCol: J(userCol), passCol: J(passCol), roleCol: J(roleCol), roles: J(rolesNeeded) };

  switch (dbType) {
    case 'sqlserver': return sqlServerScript(args);
    case 'postgres':  return postgresScript(args);
    case 'mysql':     return mysqlScript(args);
    case 'mongodb':   return mongodbScript(args);
    case 'sqlite':    return sqliteScript(args);
    default:          return `process.stdout.write(JSON.stringify({error:'Unsupported DB type'}));`;
  }
}

function sqlServerScript({ connStr, table, userCol, passCol, roleCol, roles }) {
  return `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let sql;
try { sql = require('mssql'); }
catch { process.stdout.write(JSON.stringify({error:'mssql package not installed. Run: npm install mssql'})); process.exit(0); }

const connStr = ${connStr};
const table   = ${table};
const userCol = ${userCol};
const passCol = ${passCol};
const roleCol = ${roleCol};
const roles   = ${roles};

(async () => {
  try {
    const pool = await sql.connect(connStr);
    let rows;
    if (roles.length > 0) {
      const req = pool.request();
      const placeholders = roles.map((r, i) => { req.input('r' + i, sql.NVarChar, r); return '@r' + i; }).join(',');
      const res = await req.query(
        'SELECT TOP 50 ' + userCol + ',' + passCol + ',' + roleCol +
        ' FROM ' + table + ' WHERE ' + roleCol + ' IN (' + placeholders + ')'
      );
      rows = res.recordset;
    } else {
      const res = await pool.request().query('SELECT TOP 50 ' + userCol + ',' + passCol + ',' + roleCol + ' FROM ' + table);
      rows = res.recordset;
    }
    const out = rows.map(r => ({ username: r[userCol], password: r[passCol], role: r[roleCol] || 'user' }));
    process.stdout.write(JSON.stringify(out));
    await pool.close();
  } catch (err) { process.stdout.write(JSON.stringify({error: err.message})); }
})();
`.trimStart();
}

function postgresScript({ connStr, table, userCol, passCol, roleCol, roles }) {
  return `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pg;
try { pg = require('pg'); }
catch { process.stdout.write(JSON.stringify({error:'pg package not installed. Run: npm install pg'})); process.exit(0); }
const { Client } = pg;

const connStr = ${connStr};
const table   = ${table};
const userCol = ${userCol};
const passCol = ${passCol};
const roleCol = ${roleCol};
const roles   = ${roles};

(async () => {
  const client = new Client({ connectionString: connStr });
  try {
    await client.connect();
    let res;
    if (roles.length > 0) {
      const placeholders = roles.map((_, i) => '$' + (i + 1)).join(',');
      res = await client.query(
        'SELECT ' + userCol + ',' + passCol + ',' + roleCol +
        ' FROM ' + table + ' WHERE ' + roleCol + ' IN (' + placeholders + ') LIMIT 50',
        roles
      );
    } else {
      res = await client.query('SELECT ' + userCol + ',' + passCol + ',' + roleCol + ' FROM ' + table + ' LIMIT 50');
    }
    const out = res.rows.map(r => ({ username: r[userCol], password: r[passCol], role: r[roleCol] || 'user' }));
    process.stdout.write(JSON.stringify(out));
  } catch (err) { process.stdout.write(JSON.stringify({error: err.message})); }
  finally { await client.end(); }
})();
`.trimStart();
}

function mysqlScript({ connStr, table, userCol, passCol, roleCol, roles }) {
  return `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let mysql;
try { mysql = require('mysql2/promise'); }
catch { process.stdout.write(JSON.stringify({error:'mysql2 package not installed. Run: npm install mysql2'})); process.exit(0); }

const connStr = ${connStr};
const table   = ${table};
const userCol = ${userCol};
const passCol = ${passCol};
const roleCol = ${roleCol};
const roles   = ${roles};

(async () => {
  let conn;
  try {
    conn = await mysql.createConnection(connStr);
    let rows;
    if (roles.length > 0) {
      const placeholders = roles.map(() => '?').join(',');
      [rows] = await conn.execute(
        'SELECT ' + userCol + ',' + passCol + ',' + roleCol +
        ' FROM ' + table + ' WHERE ' + roleCol + ' IN (' + placeholders + ') LIMIT 50',
        roles
      );
    } else {
      [rows] = await conn.execute('SELECT ' + userCol + ',' + passCol + ',' + roleCol + ' FROM ' + table + ' LIMIT 50');
    }
    const out = rows.map(r => ({ username: r[userCol], password: r[passCol], role: r[roleCol] || 'user' }));
    process.stdout.write(JSON.stringify(out));
  } catch (err) { process.stdout.write(JSON.stringify({error: err.message})); }
  finally { if (conn) await conn.end(); }
})();
`.trimStart();
}

function mongodbScript({ connStr, table, userCol, passCol, roleCol, roles }) {
  return `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let MongoClient;
try { ({ MongoClient } = require('mongodb')); }
catch { process.stdout.write(JSON.stringify({error:'mongodb package not installed. Run: npm install mongodb'})); process.exit(0); }

const connStr = ${connStr};
const table   = ${table};
const userCol = ${userCol};
const passCol = ${passCol};
const roleCol = ${roleCol};
const roles   = ${roles};

(async () => {
  const client = new MongoClient(connStr);
  try {
    await client.connect();
    const db = client.db();
    const filter = roles.length > 0 ? { [roleCol]: { $in: roles } } : {};
    const docs = await db.collection(table).find(filter).limit(50).toArray();
    const out = docs.map(d => ({ username: d[userCol], password: d[passCol], role: d[roleCol] || 'user' }));
    process.stdout.write(JSON.stringify(out));
  } catch (err) { process.stdout.write(JSON.stringify({error: err.message})); }
  finally { await client.close(); }
})();
`.trimStart();
}

function sqliteScript({ connStr, table, userCol, passCol, roleCol, roles }) {
  // SQLite connection string may be "sqlite:./path.db" or just "./path.db"
  const dbPathExpr = `(${connStr}).replace(/^sqlite:/i, '').trim()`;
  return `
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let Database;
try { Database = require('better-sqlite3'); }
catch { process.stdout.write(JSON.stringify({error:'better-sqlite3 package not installed. Run: npm install better-sqlite3'})); process.exit(0); }

const dbPath  = ${dbPathExpr};
const table   = ${table};
const userCol = ${userCol};
const passCol = ${passCol};
const roleCol = ${roleCol};
const roles   = ${roles};

try {
  const db = new Database(dbPath, { readonly: true });
  let rows;
  if (roles.length > 0) {
    const placeholders = roles.map(() => '?').join(',');
    rows = db.prepare(
      'SELECT ' + userCol + ',' + passCol + ',' + roleCol +
      ' FROM ' + table + ' WHERE ' + roleCol + ' IN (' + placeholders + ') LIMIT 50'
    ).all(roles);
  } else {
    rows = db.prepare('SELECT ' + userCol + ',' + passCol + ',' + roleCol + ' FROM ' + table + ' LIMIT 50').all();
  }
  const out = rows.map(r => ({ username: r[userCol], password: r[passCol], role: r[roleCol] || 'user' }));
  process.stdout.write(JSON.stringify(out));
  db.close();
} catch (err) { process.stdout.write(JSON.stringify({error: err.message})); }
`.trimStart();
}

// ── Script executor ───────────────────────────────────────────────────────────

function execScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 30_000,
    });
    let out = '';
    let err = '';
    proc.stdout.on('data', d => { out += d; });
    proc.stderr.on('data', d => { err += d; });
    proc.on('close', code => {
      if (out.trim()) resolve(out.trim());
      else if (code !== 0) reject(new Error(err.trim() || `Process exited with code ${code}`));
      else resolve('[]');
    });
    proc.on('error', reject);
  });
}
