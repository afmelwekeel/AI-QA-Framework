#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const { version, description } = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8'));

const HELP = `
  AI-QA-Framework v${version}
  ${description}

  Usage:
    npx ai-qa-framework <command> [options]

  Commands:
    install       Install the framework into your project (interactive)
    upgrade       Upgrade an existing installation to the latest version
    update        Alias for upgrade
    version       Print the version number
    help          Show this help message

  Install Options:
    --directory <path>          Install location (default: ./ai-qa-framework/)
    --modules <list>            Comma-separated modules: e2e-playwright,test-cases-xlsx,
                                  security-scan,accessibility-scan,regression-testing
    --tools <list>              Comma-separated AI tools: claude-code,cursor,copilot,windsurf
    --language <code>           Communication language (English, Arabic, French, Spanish)
    --reporting-language <code> Override reporting language only
    --yes / -y                  Accept all defaults, non-interactive

  Upgrade Options:
    --directory <path>          Path to existing installation (auto-detected if omitted)
    --force                     Re-copy files even if already on the latest version
    --yes / -y                  Skip confirmation prompts

  Examples:
    npx ai-qa-framework install
    npx ai-qa-framework install --yes
    npx ai-qa-framework install --directory qa/ --tools claude-code --language Arabic
    npx ai-qa-framework install --modules e2e-playwright,test-cases-xlsx --yes
    npx ai-qa-framework upgrade
    npx ai-qa-framework upgrade --directory qa/ --yes

  Repository:  https://github.com/afmelwekeel/AI-QA-Framework
  Docs:        https://github.com/afmelwekeel/AI-QA-Framework#readme
  Issues:      https://github.com/afmelwekeel/AI-QA-Framework/issues
`;

const args = process.argv.slice(2);
const command = args.find(a => !a.startsWith('-')) || 'help';

// Parse flags
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--yes' || args[i] === '-y')           flags.yes = true;
  else if (args[i] === '--force')                        flags.force = true;
  else if (args[i] === '--directory'  && args[i + 1])    flags.directory = args[++i];
  else if (args[i] === '--modules'    && args[i + 1])    flags.modules = args[++i];
  else if (args[i] === '--tools'      && args[i + 1])    flags.tools = args[++i];
  else if (args[i] === '--language'   && args[i + 1])    flags.language = args[++i];
  else if (args[i] === '--reporting-language' && args[i + 1]) flags.reportingLanguage = args[++i];
}

switch (command) {
  case 'install': {
    const { runInstall } = await import('./installer.mjs');
    await runInstall(flags);
    break;
  }
  case 'upgrade':
  case 'update': {
    const { runUpgrade } = await import('./upgrader.mjs');
    await runUpgrade(flags);
    break;
  }
  case 'version':
  case '--version':
  case '-v':
    console.log(version);
    break;
  case 'help':
  case '--help':
  case '-h':
  default:
    console.log(HELP);
}
