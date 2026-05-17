import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/** Heuristic DB detection from common config files. */
export default async function detectDatabase(root) {
  const result = { engine: 'unknown', signals: [] };
  const candidates = [
    'docker-compose.yml', 'docker-compose.yaml', 'docker-compose.override.yml',
    'appsettings.json', 'appsettings.Development.json',
    '.env', '.env.development', '.env.local',
  ];
  const haystack = [];
  for (const f of candidates) {
    const p = join(root, f);
    if (existsSync(p)) {
      try { haystack.push((await readFile(p, 'utf8')).toLowerCase()); } catch {}
    }
  }
  const blob = haystack.join('\n');
  const map = [
    ['sqlserver', /(mssql|sqlserver|sql server|tcp:.+,1433|integrated security)/],
    ['postgres',  /(postgres|postgresql|psql|:5432)/],
    ['mysql',     /(mysql|mariadb|:3306)/],
    ['mongo',     /(mongodb|:27017)/],
    ['redis',     /(redis|:6379)/],
    ['sqlite',    /(sqlite|\.db['"]\s*$|\.sqlite)/m],
  ];
  for (const [engine, rx] of map) {
    if (rx.test(blob)) { result.engine = engine; result.signals.push(engine); }
  }
  if (result.signals.length > 0 && result.engine === 'unknown') {
    result.engine = result.signals[0];
  }
  return result;
}
