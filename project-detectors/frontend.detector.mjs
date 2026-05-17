import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Detect frontend framework by inspecting package.json + signature files.
 *  Searches root AND one level of subdirectories (handles monorepos / nested frontends). */
export default async function detectFrontend(root) {
  const result = { framework: 'unknown', version: null, baseUrlGuess: null, signals: [] };

  // Collect candidate package.json paths: root + direct child folders
  const candidates = [join(root, 'package.json')];
  try {
    for (const entry of await readdir(root)) {
      const full = join(root, entry);
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      try {
        if ((await stat(full)).isDirectory()) {
          // Also walk one level deeper (e.g. src/Frontend)
          const deep = join(full, 'package.json');
          if (existsSync(deep)) candidates.push(deep);
          for (const sub of await readdir(full).catch(() => [])) {
            const subPkg = join(full, sub, 'package.json');
            if (existsSync(subPkg)) candidates.push(subPkg);
          }
        }
      } catch { /* skip */ }
    }
  } catch { /* skip */ }

  let pkg = null;
  for (const pkgPath of candidates) {
    try {
      const candidate = JSON.parse(await readFile(pkgPath, 'utf8'));
      const deps = { ...(candidate.dependencies ?? {}), ...(candidate.devDependencies ?? {}) };
      if (deps['@angular/core'] || deps['react'] || deps['vue'] || deps['next'] || deps['svelte']) {
        pkg = candidate;
        break;
      }
    } catch {}
  }
  if (!pkg) {
    // Fallback: first readable package.json at root
    try { pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8')); } catch {}
  }
  const deps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) };

  if (deps['@angular/core']) {
    result.framework = 'angular';
    result.version = deps['@angular/core'];
    result.baseUrlGuess = 'http://localhost:4200';
  } else if (deps['next']) {
    result.framework = 'nextjs';
    result.version = deps['next'];
    result.baseUrlGuess = 'http://localhost:3000';
  } else if (deps['react']) {
    result.framework = 'react';
    result.version = deps['react'];
    result.baseUrlGuess = 'http://localhost:3000';
  } else if (deps['vue']) {
    result.framework = 'vue';
    result.version = deps['vue'];
    result.baseUrlGuess = 'http://localhost:5173';
  } else if (deps['svelte']) {
    result.framework = 'svelte';
    result.version = deps['svelte'];
    result.baseUrlGuess = 'http://localhost:5173';
  }

  // Blazor / Razor signals
  if (existsSync(join(root, 'src')) && globMatch(root, /\.razor$/)) {
    result.framework ??= 'blazor';
  }

  return result;
}

function globMatch() { return false; /* lightweight stub; adapters do deeper scans */ }
