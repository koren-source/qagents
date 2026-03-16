import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { Client } from '@notionhq/client';

const NOTION_KEY_PATH = '/Users/q/.openclaw/workspace/credentials/notion-cutbox-key.txt';
const IDEA_VAULT_DB_ID = '325e2d85-cab8-813c-874a-e924e0993f53';
const MEMORY_DIR = '/Users/q/.openclaw/workspace/memory';

function loadNotionKey() {
  return fs.readFileSync(NOTION_KEY_PATH, 'utf-8').trim();
}

function callClaude(prompt, model = 'claude-opus-4-6') {
  const escaped = prompt.replace(/'/g, "'\\''");
  return execSync(
    `echo '${escaped}' | claude --print --model ${model} --output-format text`,
    { encoding: 'utf-8', timeout: 120000, maxBuffer: 10 * 1024 * 1024 }
  ).trim();
}

function createNotionClient() {
  return new Client({ auth: loadNotionKey() });
}

function getTitleText(prop) {
  return prop?.title?.map((item) => item.plain_text).join('') || '';
}

function getRichText(prop) {
  return prop?.rich_text?.map((item) => item.plain_text).join('') || '';
}

function truncate(text, maxLength) {
  return text.length > maxLength ? text.slice(0, maxLength) : text;
}

async function getVaultIdeas() {
  const notion = createNotionClient();
  const response = await notion.databases.query({
    database_id: IDEA_VAULT_DB_ID,
    filter: { property: 'Status', select: { equals: 'Raw Idea' } },
    page_size: 50
  });

  return response.results.map((page) => {
    const rawText = getTitleText(page.properties.Idea) || getRichText(page.properties.Hook) || '';
    const hook = getRichText(page.properties.Hook) || '';
    const howToBuildItOut = getRichText(page.properties['How to Build It Out']) || '';
    const format = page.properties.Format?.select?.name || null;
    const dateCaptured = page.properties['Date Captured']?.date?.start || null;
    const pillarGuess = page.properties.Pillar?.select?.name || null;

    return {
      id: crypto.randomUUID(),
      source: 'vault',
      notionPageId: page.id,
      rawText: truncate(rawText, 2000),
      pillarGuess,
      vaultMeta: {
        hook,
        howToBuildItOut,
        format,
        dateCaptured
      }
    };
  }).filter((idea) => idea.rawText.trim().length > 0);
}

function getLastSevenDates() {
  const dates = [];
  const today = new Date();

  for (let i = 0; i < 7; i += 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }

  return dates;
}

function splitMemorySections(content) {
  return content
    .split(/^## /m)
    .flatMap((part) => part.split(/\n---+\n/g))
    .flatMap((part) => part.split(/\n\s*\n/g))
    .map((part) => part.trim())
    .filter((part) => part.length > 50);
}

function getMemoryIdeas() {
  const ideas = [];

  for (const dateStr of getLastSevenDates()) {
    const filePath = path.join(MEMORY_DIR, `${dateStr}.md`);
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    for (const section of splitMemorySections(content)) {
      ideas.push({
        id: crypto.randomUUID(),
        source: 'memory',
        notionPageId: null,
        rawText: truncate(section, 2000),
        pillarGuess: null,
        vaultMeta: null
      });
    }
  }

  return ideas;
}

function getYouTubeIdeas() {
  try {
    const output = execSync(
      'yt-dlp --flat-playlist --dump-json "https://www.youtube.com/@koren_saida/videos" 2>/dev/null',
      { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024 }
    );

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line))
      .map((item) => {
        const title = item.title || '';
        const description = truncate(item.description || '', 1000);
        const rawText = truncate([title, description].filter(Boolean).join('\n\n'), 2000);

        return {
          id: crypto.randomUUID(),
          source: 'youtube',
          notionPageId: null,
          rawText,
          pillarGuess: null,
          vaultMeta: null
        };
      })
      .filter((idea) => idea.rawText.trim().length > 0);
  } catch (error) {
    console.warn(`Warning: failed to read YouTube channel via yt-dlp: ${error.message}`);
    return [];
  }
}

function deduplicate(ideas) {
  const vaultIdeas = ideas.filter((idea) => idea.source === 'vault');
  const nonVaultIdeas = ideas.filter((idea) => idea.source !== 'vault');
  const vaultTitles = vaultIdeas
    .map((idea) => idea.rawText.toLowerCase().trim())
    .filter(Boolean);

  const dedupedNonVault = nonVaultIdeas.filter((idea) => {
    const text = idea.rawText.toLowerCase();
    return !vaultTitles.some((title) => title && text.includes(title));
  });

  return [...vaultIdeas, ...dedupedNonVault];
}

// Opus pass: filter memory sections down to actual content ideas, dropping operational noise
async function extractContentIdeasFromMemory(rawMemoryCandidates) {
  if (rawMemoryCandidates.length === 0) return [];

  const sections = rawMemoryCandidates.map((c) => c.rawText).join('\n\n---\n\n');
  const prompt = `You are a content idea extractor for Koren Saida, a creator and founder.

His 3 content pillars:
- Cutbox: building Cutbox.ai in public, AI creative ops, product lessons, execution insights
- Business Systems: lessons from past businesses with receipts, systems, media buying, CRM, operations
- Consulting+AI: live client systems, consulting work, AI workflows, automation, operating leverage

Below are raw memory log sections from the past week. Identify which ones contain a genuine content idea, story, system, or insight worth making a YouTube video, Short, or LinkedIn post about.

DROP: heartbeat logs, system alerts, API errors, cron output, gateway restarts, Notion/Slack tool calls, anything purely operational.
KEEP: moments where something was built, tested, or learned that has real-world proof value; ideas explicitly mentioned; results, wins, or lessons with numbers.

Return ONLY a JSON array of the sections you're keeping, no prose:
\`\`\`json
["section text 1", "section text 2"]
\`\`\`

Sections:
${sections}`;

  try {
    const text = callClaude(prompt, 'claude-opus-4-6');
    const fenceMatch = text.match(/```json\s*([\s\S]*?)```/);
    const kept = fenceMatch ? JSON.parse(fenceMatch[1].trim()) : [];
    return kept.map((rawText) => ({
      id: crypto.randomUUID(),
      source: 'memory',
      notionPageId: null,
      rawText: truncate(rawText, 2000),
      pillarGuess: null,
      vaultMeta: null
    }));
  } catch (err) {
    console.warn(`Warning: Opus memory extraction failed: ${err.message}. Using raw sections.`);
    return rawMemoryCandidates;
  }
}

export async function mine() {
  const vaultIdeas = await getVaultIdeas();
  const rawMemoryIdeas = getMemoryIdeas().slice(0, 20);
  const memoryIdeas = await extractContentIdeasFromMemory(rawMemoryIdeas);
  const youtubeIdeas = getYouTubeIdeas();
  return deduplicate([...vaultIdeas, ...memoryIdeas, ...youtubeIdeas]);
}
