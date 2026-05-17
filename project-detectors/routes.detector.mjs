import { readdir, readFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * Best-effort enumeration of frontend routes / backend endpoints.
 * Stack-specific adapters can deepen this in adapters/routes/*.
 */
export default async function detectRoutes(root) {
  const routes = { pages: [], endpoints: [], signals: [] };
  await walk(root, 0, 4, async (file) => {
    const name = file.toLowerCase();
    if (name.endsWith('.routes.ts') || name.endsWith('app-routing.module.ts')) {
      routes.signals.push('angular-routes');
      routes.pages.push(...extractAngularPaths(await safeRead(file)));
    } else if (name.endsWith('app.tsx') || name.endsWith('routes.tsx') || name.endsWith('router.tsx')) {
      routes.signals.push('react-routes');
      routes.pages.push(...extractReactPaths(await safeRead(file)));
    } else if (name.endsWith('controller.cs')) {
      routes.signals.push('aspnet-controller');
      routes.endpoints.push(...extractAspNetRoutes(await safeRead(file)));
    } else if (name.endsWith('controller.java') || name.endsWith('resource.java')) {
      routes.signals.push('spring-controller');
      routes.endpoints.push(...extractSpringRoutes(await safeRead(file)));
    }
  });
  routes.pages = unique(routes.pages);
  routes.endpoints = unique(routes.endpoints);
  return routes;
}

const SKIP = new Set(['node_modules', '.git', 'bin', 'obj', 'dist', 'build', '.next', '.angular', 'venv', '__pycache__']);
async function walk(dir, depth, max, fn) {
  if (depth > max) return;
  let entries = [];
  try { entries = await readdir(dir); } catch { return; }
  for (const name of entries) {
    if (SKIP.has(name) || name.startsWith('.')) continue;
    const full = join(dir, name);
    let s; try { s = await stat(full); } catch { continue; }
    if (s.isDirectory()) await walk(full, depth + 1, max, fn);
    else await fn(full);
  }
}

async function safeRead(p) { try { return await readFile(p, 'utf8'); } catch { return ''; } }
function unique(arr) { return [...new Set(arr.filter(Boolean))]; }

function extractAngularPaths(src) {
  return [...src.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g)].map(m => '/' + m[1].replace(/^\/+/, ''));
}
function extractReactPaths(src) {
  const out = [];
  out.push(...[...src.matchAll(/<Route[^>]*path=['"]([^'"]+)['"]/g)].map(m => m[1]));
  out.push(...[...src.matchAll(/path:\s*['"`]([^'"`]+)['"`]/g)].map(m => m[1]));
  return out;
}
function extractAspNetRoutes(src) {
  const out = [];
  const ctrlRoute = /\[Route\(\s*"([^"]+)"\s*\)\]/.exec(src)?.[1] ?? '';
  for (const m of src.matchAll(/\[Http(Get|Post|Put|Delete|Patch)\(\s*"([^"]*)"\s*\)\]/g)) {
    const verb = m[1].toUpperCase();
    const path = ('/' + (ctrlRoute + '/' + m[2]).replace(/\[controller\]/i, '')).replace(/\/+/g, '/');
    out.push(`${verb} ${path}`);
  }
  return out;
}
function extractSpringRoutes(src) {
  const out = [];
  const cls = /@RequestMapping\(\s*"([^"]+)"\s*\)/.exec(src)?.[1] ?? '';
  for (const m of src.matchAll(/@(Get|Post|Put|Delete|Patch)Mapping\(\s*"([^"]*)"\s*\)/g)) {
    out.push(`${m[1].toUpperCase()} ${(cls + '/' + m[2]).replace(/\/+/g, '/')}`);
  }
  return out;
}
