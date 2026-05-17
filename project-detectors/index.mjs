/**
 * Project Detector — top-level orchestration.
 * Walks a project root and produces a normalized project.config.json.
 */
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import detectFrontend from './frontend.detector.mjs';
import detectBackend  from './backend.detector.mjs';
import detectDatabase from './database.detector.mjs';
import detectAuth     from './auth.detector.mjs';
import detectRoutes   from './routes.detector.mjs';
import detectPM       from './package-manager.detector.mjs';
import detectTesting  from './testing.detector.mjs';

export async function detectProject(projectRoot) {
  const [frontend, backend, database, auth, routes, pm, testing] = await Promise.all([
    detectFrontend(projectRoot),
    detectBackend(projectRoot),
    detectDatabase(projectRoot),
    detectAuth(projectRoot),
    detectRoutes(projectRoot),
    detectPM(projectRoot),
    detectTesting(projectRoot),
  ]);

  return {
    schemaVersion: 1,
    detectedAt: new Date().toISOString(),
    projectRoot,
    frontend,
    backend,
    database,
    auth,
    routes,
    packageManagers: pm,
    testing,
    environment: {
      baseUrl: process.env.QA_BASE_URL ?? frontend.baseUrlGuess ?? 'http://localhost:3000',
      apiUrl:  process.env.QA_API_URL  ?? backend.baseUrlGuess  ?? 'http://localhost:5000',
    },
  };
}

export default detectProject;
