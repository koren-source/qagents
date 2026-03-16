import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const PROMPT_PATH = path.resolve(
  '/Users/q/.openclaw/workspace/agents/content-planner/prompts/brief-writer-prompt.md'
);

function getAnthropicKey() {
  // Prefer Claude OAuth subscription profile
  const authPath = `${process.env.HOME}/.claude/.credentials.json`;
  if (fs.existsSync(authPath)) {
    try {
      const creds = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
      const token = creds?.claudeAiOauth?.accessToken;
      if (token) return token;
    } catch (e) { /* fall through */ }
  }
  // Fallback to env
  const key = process.env.ANTHROPIC_API_KEY;
  if (key) return key;
  throw new Error('No Anthropic credentials found. Ensure Claude OAuth is configured or set ANTHROPIC_API_KEY.');
}

function createAnthropicClient() {
  return new Anthropic({ apiKey: getAnthropicKey() });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function loadPrompt() {
  return fs.readFileSync(PROMPT_PATH, 'utf-8');
}

function fillPrompt(template, idea) {
  return template
    .replace('{{IDEA_TEXT}}', idea.rawText)
    .replace('{{PILLAR}}', idea.pillar)
    .replace('{{FORMAT}}', idea.format)
    .replace('{{HOOK_HINT}}', idea.vaultMeta?.hook || '')
    .replace('{{BUILD_OUT_HINT}}', idea.vaultMeta?.howToBuildItOut || '');
}

function getResponseText(response) {
  return response.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n');
}

function parseJsonFromResponse(text) {
  // Try to extract from ```json code fence first (most reliable)
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (fenceMatch) {
    return JSON.parse(fenceMatch[1].trim());
  }
  // Fallback: find the outermost JSON object
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in response');
  }
  return JSON.parse(text.slice(start, end + 1));
}

export async function writeBriefs(approvedIdeas) {
  const anthropic = createAnthropicClient();
  const template = loadPrompt();
  const briefs = [];

  for (let index = 0; index < approvedIdeas.length; index += 1) {
    const idea = approvedIdeas[index];
    const filledPrompt = fillPrompt(template, idea);
    try {
      const response = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: filledPrompt }]
      });

      const parsed = parseJsonFromResponse(getResponseText(response));
      briefs.push({
        id: idea.id,
        source: idea.source,
        notionPageId: idea.notionPageId,
        title: parsed.title,
        pillar: idea.pillar,
        format: idea.format,
        priority: idea.priority,
        hook: parsed.hook,
        sellOutline: parsed.sellOutline,
        proofPoints: parsed.proofPoints,
        repurposePlan: parsed.repurposePlan,
        charlesHandoff: parsed.charlesHandoff
      });
    } catch (error) {
      console.warn(`Warning: failed to write brief for idea ${index} (${idea.rawText.slice(0, 50)}...): ${error.message}`);
      continue;
    }

    if (index < approvedIdeas.length - 1) {
      await sleep(1000);
    }
  }

  return briefs;
}
