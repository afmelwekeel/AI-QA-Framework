import { c } from './prompts.mjs';

export function printPostInstall(installDir, answers) {
  const tool = answers.tools[0] || null;
  const toolMap = {
    'claude-code': `Run ${c.cyan}/aiqa-init${c.reset} in Claude Code`,
    'cursor':      `Reference ${c.cyan}./${installDir}/agents/qae.md${c.reset} in Cursor`,
    'copilot':     `In Copilot Chat say ${c.cyan}@workspace load ${installDir}/agents/qae.md${c.reset}`,
    'windsurf':    `Reference ${c.cyan}./${installDir}/agents/qae.md${c.reset} in Windsurf`,
  };
  const activation = toolMap[tool] || `Load ${c.cyan}./${installDir}/agents/qae.md${c.reset} in your AI assistant`;

  const W = 68; // inner width (between ║ chars)

  // Pads content to exactly W chars (strips ANSI for length calc)
  const line = (content = '') => {
    const raw = content.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, W - raw.length);
    return `  ${c.blue}║${c.reset}${content}${' '.repeat(pad)}${c.blue}║${c.reset}`;
  };

  const label = (key, val) => line(`   ${c.dim}${key.padEnd(9)}${c.reset}  ${c.cyan}${val}${c.reset}`);
  const step  = (n, text) => line(`   ${c.cyan}${n}.${c.reset} ${text}`);
  const sub   = (text)    => line(`      ${c.dim}${text}${c.reset}`);
  const blank =             line();
  const rule  = `  ${c.blue}╠${'═'.repeat(W)}╣${c.reset}`;

  const successText = `   ${c.green}${c.bold}✓  AI-QA-Framework installed successfully!${c.reset}`;

  console.log(`\n  ${c.blue}╔${'═'.repeat(W)}╗${c.reset}`);
  console.log(blank);
  console.log(line(successText));
  console.log(blank);
  console.log(rule);
  console.log(blank);
  console.log(label('Location', `./${installDir}/`));
  console.log(label('Config',   `./${installDir}/config.yaml`));
  console.log(label('Agent',    `./${installDir}/agents/qae.md`));
  console.log(blank);
  console.log(rule);
  console.log(blank);
  console.log(line(`   ${c.bold}${c.white}NEXT STEPS${c.reset}`));
  console.log(blank);
  console.log(step(1, `Edit ${c.dim}config.yaml${c.reset} with your project details:`));
  console.log(sub(`./${installDir}/config.yaml`));
  console.log(blank);
  console.log(step(2, `Activate Rayan:`));
  console.log(line(`      ${activation}`));
  console.log(blank);
  console.log(step(3, `Auto-detect your project stack:`));
  console.log(sub(`cd ./${installDir} && npm run detect`));
  console.log(blank);
  console.log(step(4, `Tell Rayan: ${c.green}"Run full workflow on my user story"${c.reset}`));
  console.log(blank);
  console.log(rule);
  console.log(blank);
  console.log(label('Docs',   'https://github.com/afmelwekeel/AI-QA-Framework'));
  console.log(label('Issues', 'https://github.com/afmelwekeel/AI-QA-Framework/issues'));
  console.log(blank);
  console.log(`  ${c.blue}╚${'═'.repeat(W)}╝${c.reset}\n`);
}
