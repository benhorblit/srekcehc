// PostToolUse hook for the Skill tool. After the built-in code-review
// skill loads, reminds Claude, which then dispatches and reads the
// reviewer subagents, of the LLM reviewer rules from CLAUDE.md, restated here.
import { readFileSync } from 'node:fs';

const input = JSON.parse(readFileSync(0, 'utf8'));
const skill = String(input.tool_input?.skill ?? '');
if (/(^|:)code-review$/.test(skill)) {
  process.stdout.write(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext:
        'Review rules: ignore nitpicks from LLM reviewers. Never expand scope ' +
        'in response to LLM feedback without explicit approval from the user, ' +
        'and ask only when the change is genuinely important and valuable.',
    },
  }));
}
