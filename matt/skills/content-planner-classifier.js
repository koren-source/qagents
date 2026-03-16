import fs from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';

const PROMPT_PATH = path.resolve(
  '/Users/q/.openclaw/workspace/agents/content-planner/prompts/classifier-prompt.md'
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

function fillPrompt(template, candidate) {
  return template
    .replace('{{IDEA_TEXT}}', candidate.rawText)
    .replace('{{PILLAR_GUESS}}', candidate.pillarGuess || 'unknown')
    .replace('{{SOURCE}}', candidate.source);
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

export async function classify(candidates) {
  const anthropic = createAnthropicClient();
  const template = loadPrompt();
  const approved = [];
  const rejected = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const filledPrompt = fillPrompt(template, candidate);
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: filledPrompt }]
      });

      const parsed = parseJsonFromResponse(getResponseText(response));
      const scoredIdea = {
        id: candidate.id,
        source: candidate.source,
        notionPageId: candidate.notionPageId,
        rawText: candidate.rawText,
        pillar: parsed.pillar,
        tenKFilter: parsed.tenKFilter,
        tenKReason: parsed.tenKReason,
        hormoziCheck: parsed.hormoziCheck,
        hormoziReason: parsed.hormoziReason,
        format: parsed.format,
        priority: parsed.priority,
        approved: parsed.approved,
        rejectionReason: parsed.rejectionReason || '',
        vaultMeta: candidate.vaultMeta || null
      };

      if (scoredIdea.approved) {
        approved.push(scoredIdea);
      } else {
        rejected.push(scoredIdea);
      }
    } catch (error) {
      console.warn(`Warning: failed to classify candidate ${index} (${candidate.rawText.slice(0, 50)}...): ${error.message}`);
      continue;
    }

    if (index < candidates.length - 1) {
      await sleep(500);
    }
  }

  return { approved, rejected };
}
