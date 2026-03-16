# Matt (Content Planner) — Fix + Upgrade Pass

All files are in: /Users/q/.openclaw/workspace/agents/content-planner/

Do NOT change any logic that isn't mentioned here. Make only the changes listed below, exactly.

---

## 1. FIX: Syntax error in content-calendar-publisher.js

Open `skills/content-calendar-publisher.js`.
The last 6 lines are a duplicate fragment pasted after the closing `}` of the `publish()` function:

```
  await postSlackSummary(publishedBriefs, sprintName);
}
upsertBriefInNotion(notion, brief);
    publishedBriefs.push({ ...brief, notionPageId });
  }

  await postSlackSummary(publishedBriefs, sprintName);
}
```

Delete everything from the second standalone `upsertBriefInNotion(notion, brief);` line to the end of the file (lines after the first clean closing `}` of `publish()`). The file should end cleanly after:
```js
  await postSlackSummary(publishedBriefs, sprintName);
}
```

---

## 2. FIX: Add PILLAR_TO_NOTION constant in content-calendar-publisher.js

After the `SLACK_CHANNEL_ID` constant at the top, add:

```js
const PILLAR_TO_NOTION = {
  'Cutbox': 'Cutbox',
  'Business Systems': 'Business Systems',
  'Consulting+AI': 'Consulting+AI',
};
```

---

## 3. FIX: Replace API key env reads with Claude CLI (OAuth) in all skills

Koren uses Claude OAuth subscription, not API keys. Replace the Anthropic SDK calls in `content-planner-classifier.js` and `content-brief-writer.js` with Claude CLI subprocess calls.

In BOTH files, replace:
- The `import Anthropic from '@anthropic-ai/sdk';` import
- The `getAnthropicKey()` function
- The `createAnthropicClient()` function
- The `anthropic.messages.create({...})` call

With a `callClaude(model, prompt)` function that runs:
```js
import { execSync } from 'child_process';

function callClaude(model, prompt) {
  const escaped = prompt.replace(/'/g, "'\\''");
  const result = execSync(
    `claude --model ${model} --print --max-turns 1 '${escaped}'`,
    { encoding: 'utf-8', maxBuffer: 10 * 1024 * 1024, timeout: 120000 }
  );
  return result.trim();
}
```

Then replace the `anthropic.messages.create` call with:
```js
const responseText = callClaude('claude-sonnet-4-6', filledPrompt);
const parsed = parseJsonFromResponse(responseText);
```
(or `claude-opus-4-6` for the brief writer).

Remove the `@anthropic-ai/sdk` dependency usage. Keep `@notionhq/client`.

---

## 4. UPGRADE: content-miner.js — use Opus to intelligently extract ideas from memory logs

Currently `getMemoryIdeas()` does dumb text splitting and returns noisy operational log sections.

Replace `getMemoryIdeas()` with an Opus-powered version:

```js
function getMemoryRawContent() {
  const chunks = [];
  for (const dateStr of getLastSevenDates()) {
    const filePath = path.join(MEMORY_DIR, `${dateStr}.md`);
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, 'utf-8');
    chunks.push(`=== ${dateStr} ===\n${content}`);
  }
  return chunks.join('\n\n');
}

function extractIdeasWithOpus(rawContent) {
  if (!rawContent.trim()) return [];

  const prompt = `You are reviewing Koren Saida's daily activity logs from the past 7 days.

Koren creates content about:
1. Cutbox — building his AI startup in public (product, sales, building, failures, wins)
2. Business Systems — lessons from past businesses with receipts (Breezy Roofing: $5M+ in 12 months, $800K Meta spend, call center, CRM, ops)
3. Consulting+AI — live systems he's building for clients (SVG, Outlaw Ventures) and AI workflows

From the logs below, extract ONLY entries that could become real content ideas — things Koren actually did, built, learned, solved, or struggled with that others would pay $10K to know.

IGNORE: heartbeat logs, system health, cron jobs, agent status, gateway restarts, memory maintenance, or any pure operational/technical tasks.

Output a JSON array of objects. Max 10 ideas. If nothing qualifies, return [].

\`\`\`json
[
  {
    "rawText": "One-sentence description of the content-worthy thing that happened",
    "pillarGuess": "Cutbox | Business Systems | Consulting+AI",
    "sourceDate": "YYYY-MM-DD"
  }
]
\`\`\`

LOGS:
${rawContent.slice(0, 15000)}`;

  try {
    const responseText = callClaude('claude-opus-4-6', prompt);
    const fenceMatch = responseText.match(/```json\s*([\s\S]*?)```/);
    if (fenceMatch) {
      const arr = JSON.parse(fenceMatch[1].trim());
      return arr.map((item) => ({
        id: crypto.randomUUID(),
        source: 'memory',
        notionPageId: null,
        rawText: item.rawText || '',
        pillarGuess: item.pillarGuess || null,
        vaultMeta: null
      })).filter((i) => i.rawText.trim().length > 0);
    }
  } catch (e) {
    console.warn(`Warning: Opus memory extraction failed: ${e.message}`);
  }
  return [];
}
```

Then in `mine()`, replace:
```js
const memoryIdeas = getMemoryIdeas().slice(0, 20);
```
with:
```js
const rawMemory = getMemoryRawContent();
const memoryIdeas = extractIdeasWithOpus(rawMemory);
```

Add `import { execSync } from 'child_process';` if not already present.
Add the `callClaude` function at the top of the file.

---

## 5. UPGRADE: Update Notion parent page for Matt

In `content-calendar-publisher.js`, find the `IDEA_VAULT_DB_ID` constant. After it, add a new constant:

```js
const MATT_PAGE_ID = '325e2d85-cab8-8041-95a5-d191617e92d3';
```

When creating a new page in Notion (not updating existing vault pages), create the page as a child of `MATT_PAGE_ID` rather than directly in `IDEA_VAULT_DB_ID`. 

Specifically in `upsertBriefInNotion()`, when calling `notion.pages.create`, change the parent to use the Matt page:
```js
parent: { database_id: IDEA_VAULT_DB_ID },
```
Keep this as is — the DB still lives under Matt's page (parent relationship is set when the DB is shared). No change needed here unless the DB isn't accessible, in which case just leave it.

Actually, no change needed for #5 — the Idea Vault DB parent is already correct. Skip this one.

---

## 6. UPGRADE: Learning loop — read Notion approved/disapproved to guide future runs

Add a new function in `content-miner.js` that reads recently reviewed ideas from Notion:

```js
async function getApprovedHistory() {
  const notion = createNotionClient();
  try {
    const response = await notion.databases.query({
      database_id: IDEA_VAULT_DB_ID,
      filter: {
        or: [
          { property: 'Status', select: { equals: 'Approved' } },
          { property: 'Status', select: { equals: 'Disapproved' } }
        ]
      },
      page_size: 50
    });

    return response.results.map((page) => ({
      title: getTitleText(page.properties.Idea),
      pillar: page.properties.Pillar?.select?.name || '',
      status: page.properties.Status?.select?.name || '',
      format: page.properties.Format?.select?.name || ''
    })).filter((i) => i.title);
  } catch (e) {
    console.warn('Warning: could not read approval history:', e.message);
    return [];
  }
}
```

Export this from `mine()` by changing the return to:
```js
  const approvalHistory = await getApprovedHistory();
  const ideas = deduplicate([...vaultIdeas, ...memoryIdeas, ...youtubeIdeas]);
  return { ideas, approvalHistory };
```

Update `index.js` to destructure: `const { ideas: candidates, approvalHistory } = await mine();`

Pass `approvalHistory` into `classify(candidates, approvalHistory)` in `content-planner-classifier.js`.

In the classifier, add a preamble to `fillPrompt`:
```js
function buildHistoryNote(approvalHistory) {
  if (!approvalHistory || approvalHistory.length === 0) return '';
  const approved = approvalHistory.filter((h) => h.status === 'Approved').map((h) => `- ${h.title} (${h.pillar}, ${h.format})`).join('\n');
  const disapproved = approvalHistory.filter((h) => h.status === 'Disapproved').map((h) => `- ${h.title}`).join('\n');
  let note = 'FEEDBACK FROM KOREN (recent Notion reviews):\n';
  if (approved) note += `Koren approved (wants MORE like these):\n${approved}\n`;
  if (disapproved) note += `Koren disapproved (avoid ideas like these):\n${disapproved}\n`;
  return note + '\n';
}
```

Prepend this to the filled prompt before sending to Sonnet.

Update `classify()` signature to `export async function classify(candidates, approvalHistory = [])`.

---

## 7. FIX: Remove SLACK_BOT_TOKEN env dependency — use openclaw.json

In `content-calendar-publisher.js`, replace `getSlackToken()`:

```js
function getSlackToken() {
  const configPath = '/Users/q/.openclaw/openclaw.json';
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const token = config?.plugins?.entries?.['channel-slack']?.config?.botToken
    || config?.channels?.slack?.botToken
    || config?.slack?.botToken;
  if (!token) throw new Error('Slack bot token not found in openclaw.json');
  return token;
}
```

---

## 8. FIX: Update README.md

Replace the "Credentials needed" section with:

```
## Credentials

- Claude CLI must be in PATH (OAuth subscription mode — no API key needed)
- Notion key auto-loaded from /Users/q/.openclaw/workspace/credentials/notion-cutbox-key.txt
- Slack token auto-read from ~/.openclaw/openclaw.json
- No env vars required
```

Update model routing section:

```
## Model routing

- content-miner: Opus (intelligent memory extraction) + no-LLM (Notion/YouTube reads)
- content-planner-classifier: Sonnet (via claude CLI)
- content-brief-writer: Opus (via claude CLI)
- content-calendar-publisher: no LLM
```

---

## 9. Verify

After all changes, run:
```bash
cd /Users/q/.openclaw/workspace/agents/content-planner
node --check index.js
node --check skills/content-miner.js
node --check skills/content-planner-classifier.js
node --check skills/content-brief-writer.js
node --check skills/content-calendar-publisher.js
```

All must pass with 0 syntax errors. Report results.

Also confirm: `node index.js` with DORMANT_MODE=true still prints "Matt is dormant." and exits 0.
