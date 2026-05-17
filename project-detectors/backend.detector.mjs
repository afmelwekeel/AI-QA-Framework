import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Detect backend stack: dotnet | node | java | python | go */
export default async function detectBackend(root) {
  const result = { framework: 'unknown', version: null, baseUrlGuess: null, signals: [] };

  // .NET
  const slnFiles = (await safeReaddir(root)).filter(f => f.endsWith('.sln') || f.endsWith('.slnx'));
  const csprojExists = await hasFileMatching(root, /\.csproj$/, 3);
  if (slnFiles.length || csprojExists) {
    result.framework = 'dotnet';
    result.baseUrlGuess = 'http://localhost:5000';
    result.signals.push(...slnFiles);
    return result;
  }

  // Node backend
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(await readFile(pkgPath, 'utf8'));
      const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };
      if (deps['express'] || deps['fastify'] || deps['@nestjs/core'] || deps['koa']) {
        result.framework = deps['@nestjs/core'] ? 'nestjs' : (deps['fastify'] ? 'fastify' : 'express');
        result.baseUrlGuess = 'http://localhost:3000';
        return result;
      }
    } catch {}
  }

  // Java
  if (existsSync(join(root, 'pom.xml')) || existsSync(join(root, 'build.gradle')) || existsSync(join(root, 'build.gradle.kts'))) {
    result.framework = 'java';
    result.baseUrlGuess = 'http://localhost:8080';
    return result;
  }

  // Python
  if (existsSync(join(root, 'pyproject.toml')) || existsSync(join(root, 'requirements.txt')) || existsSync(join(root, 'manage.py'))) {
    result.framework = 'python';
    result.baseUrlGuess = 'http://localhost:8000';
    return result;
  }

  // Go
  if (existsSync(join(root, 'go.mod'))) {
    result.framework = 'go';
    result.baseUrlGuess = 'http://localhost:8080';
  }

  return result;
}

async function safeReaddir(p) { try { return await readdir(p); } catch { return []; } }

async function hasFileMatching(root, regex, depth) {
  if (depth < 0) return false;
  const entries = await safeReaddir(root);
  for (const name of entries) {
    if (name === 'node_modules' || name.startsWith('.')) continue;
    const full = join(root, name);
    if (regex.test(name)) return true;
    try {
      const fs = await import('node:fs/promises');
      const s = await fs.stat(full);
      if (s.isDirectory() && await hasFileMatching(full, regex, depth - 1)) return true;
    } catch {}
  }
  return false;
}
