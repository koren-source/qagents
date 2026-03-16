import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const PROMPT_PATH = path.resolve(
  '/Users/q/.openclaw/workspace/agents/content-planner/prompts/brief-writer-prompt.md'
);

function sleep(ms) {
  return new Promise((resolve) => { setTimeout(resolve, ms); });
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

function parseJsonFromResponse(text) {
  const fenceMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (fenceMatch) return JSON.parse(fenceMatch[1].trim());
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON in response');
  return JSON.parse(text.slice(start, end + 1));
}

function callClaude(prompt, model = 'claude-opus-4-6') {
  const escaped = prompt.replace(/'/g, "'\\''");
  const result = execSync(
    `echo '${escaped}' | claude --print --model ${model} --output-format text`,
    { encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
  );
  return result.trim();
}

export async function writeBriefs(approvedIdeas) {
  const template = loadPrompt();
  const briefs = [];

  for (let index = 0; index < approvedIdeas.length; index += 1) {
    const idea = approvedIdeas[index];
    const filledPrompt = fillPrompt(template, idea);

    try {
      const responseText = callClaude(filledPrompt, 'claude-opus-4-6');
      const parsed = parseJsonFromResponse(responseText);
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
