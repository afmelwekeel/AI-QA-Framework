import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Detect auth scheme from project config / dependencies. */
export default async function detectAuth(root) {
  const result = { scheme: 'unknown', signals: [] };
  const blob = await readManyLower(root, [
    'package.json',
    'appsettings.json', 'appsettings.Development.json',
    'Program.cs', 'Startup.cs',
    'requirements.txt', 'pyproject.toml',
    'pom.xml',
  ]);
  if (/jwtbearer|jsonwebtoken|jwt/.test(blob)) { result.scheme = 'jwt'; result.signals.push('jwt'); }
  if (/oauth|openid|oidc/.test(blob))          { result.scheme = result.scheme === 'unknown' ? 'oauth' : result.scheme; result.signals.push('oauth'); }
  if (/cookieauth|express-session|cookie-parser/.test(blob)) { result.signals.push('cookie'); if (result.scheme === 'unknown') result.scheme = 'cookie'; }
  if (/basic auth|basic_auth/.test(blob))      { result.signals.push('basic'); if (result.scheme === 'unknown') result.scheme = 'basic'; }
  return result;
}

async function readManyLower(root, files) {
  const out = [];
  for (const f of files) {
    const p = join(root, f);
    if (existsSync(p)) { try { out.push((await readFile(p, 'utf8')).toLowerCase()); } catch {} }
  }
  // Also scan any .cs files up to 2 levels deep for JWT signals
  await walkCs(root, 0, 2, (content) => out.push(content));
  return out.join('\n');
}

async function walkCs(dir, depth, max, push) {
  if (depth > max) return;
  const { readdir, stat } = await import('node:fs/promises');
  let entries = []; try { entries = await readdir(dir); } catch { return; }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'bin' || name === 'obj' || name.startsWith('.')) continue;
    const full = join(dir, name);
    let s; try { s = await stat(full); } catch { continue; }
    if (s.isDirectory()) { await walkCs(full, depth + 1, max, push); }
    else if (name.endsWith('.cs') || name.endsWith('.csproj')) {
      try { push((await readFile(full, 'utf8')).toLowerCase()); } catch {}
    }
  }
}
