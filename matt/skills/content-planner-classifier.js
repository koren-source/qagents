import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROMPT_PATH = path.resolve(
  '/Users/q/.openclaw/workspace/agents/content-planner/prompts/classifier-prompt.md'
);

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
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

function parseJsonFromResponse(text) {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (fenceMatch) return JSON.parse(fenceMatch[1].trim());
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON in response');
  return JSON.parse(text.slice(start, end + 1));
}

function callClaude(prompt, model = 'claude-sonnet-4-6') {
  const escaped = prompt.replace(/'/g, "'\\''");
  const result = execSync(
    `echo '${escaped}' | claude --print --model ${model} --output-format text`,
    { encoding: 'utf-8', timeout: 60000, maxBuffer: 10 * 1024 * 1024 }
  );
  return result.trim();
}

export async function classify(candidates, feedbackContext = '') {
  const template = loadPrompt();
  const approved = [];
  const rejected = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    let filledPrompt = fillPrompt(template, candidate);
    if (feedbackContext) {
      filledPrompt = `${filledPrompt}\n\nPast approval patterns (use to calibrate):\n${feedbackContext}`;
    }

    try {
      const responseText = callClaude(filledPrompt, 'claude-sonnet-4-6');
      const parsed = parseJsonFromResponse(responseText);
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
