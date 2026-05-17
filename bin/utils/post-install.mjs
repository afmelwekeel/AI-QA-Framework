export function printPostInstall(installDir, answers) {
  const tool = answers.tools[0] || 'your AI assistant';
  const toolInstructions = {
    'claude-code': `Open Claude Code and run:\n     /qa`,
    'cursor':      `Open Cursor and reference:\n     ./${installDir}/agents/qae.md`,
    'copilot':     `Open GitHub Copilot Chat and say:\n     @workspace load ${installDir}/agents/qae.md`,
    'windsurf':    `Open Windsurf and reference:\n     ./${installDir}/agents/qae.md`,
  };

  console.log(`
${'═'.repeat(60)}

  AI-QA-Framework installed successfully!

  Location : ./${installDir}/
  Config   : ./${installDir}/config.yaml
  Agent    : ./${installDir}/agents/qae.md

${'─'.repeat(60)}

  NEXT STEPS

  1. Edit config.yaml with your project details:
     ./${installDir}/config.yaml

  2. Activate the Rayan QA agent in ${tool}:
     ${toolInstructions[answers.tools[0]] || `Load ./${installDir}/agents/qae.md`}

  3. Run project auto-detection:
     cd ./${installDir} && npm run detect

  4. Start full QA workflow:
     Tell Rayan: "Run full workflow on my user story"

${'─'.repeat(60)}

  Docs   : https://github.com/afmelwekeel/AI-QA-Framework
  Issues : https://github.com/afmelwekeel/AI-QA-Framework/issues

${'═'.repeat(60)}
`);
}
