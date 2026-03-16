import fs from 'fs';
import { Client } from '@notionhq/client';

const NOTION_KEY_PATH = '/Users/q/.openclaw/workspace/credentials/notion-cutbox-key.txt';
const IDEA_VAULT_DB_ID = '325e2d85-cab8-813c-874a-e924e0993f53';
const SLACK_CHANNEL_ID = 'C0AF2TN0L6T';

const PILLAR_TO_NOTION = {
  'Cutbox': 'Cutbox',
  'Business Systems': 'Business Systems',
  'Consulting+AI': 'Consulting+AI'
};

function loadNotionKey() {
  return fs.readFileSync(NOTION_KEY_PATH, 'utf-8').trim();
}

function getSlackToken() {
  const configPath = '/Users/q/.openclaw/openclaw.json';
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  const token = config?.plugins?.entries?.slack?.config?.token
    || config?.channels?.slack?.token
    || config?.integrations?.slack?.token;
  if (!token) throw new Error('Slack token not found in openclaw.json');
  return token;
}

function createNotionClient() {
  return new Client({ auth: loadNotionKey() });
}

function truncate(text, maxLength) {
  return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function formatBriefForNotion(brief) {
  const content = [
    `Title: ${brief.title}`,
    `Pillar: ${brief.pillar}`,
    `Format: ${brief.format}`,
    `Priority: ${brief.priority}`,
    '',
    `Hook: ${brief.hook}`,
    '',
    'SELL Outline',
    `Story: ${brief.sellOutline.story}`,
    `Educate: ${brief.sellOutline.educate}`,
    `List: ${brief.sellOutline.list}`,
    `Logic: ${brief.sellOutline.logic}`,
    '',
    `Proof Points: ${brief.proofPoints.join(' | ')}`,
    '',
    'Repurpose Plan',
    `YouTube: ${brief.repurposePlan.youtube}`,
    `IG Shorts: ${brief.repurposePlan.igShorts}`,
    `YT Shorts: ${brief.repurposePlan.ytShorts}`,
    `LinkedIn: ${brief.repurposePlan.linkedin}`,
    `X: ${brief.repurposePlan.x}`,
    '',
    `Charles Handoff: ${brief.charlesHandoff}`
  ].join('\n');

  return truncate(content, 2000);
}

function notionLinkForPage(pageId) {
  if (!pageId) return null;
  return `https://www.notion.so/${pageId.replace(/-/g, '')}`;
}

function buildSlackBlocks(briefs, sprintName) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: `📋 Content Sprint: ${sprintName} — ${briefs.length} briefs`
      }
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${briefs.length} content briefs ready. Review + flip status in Notion (Approved / Disapproved).`
      }
    },
    { type: 'divider' }
  ];

  for (const brief of briefs) {
    const notionLink = notionLinkForPage(brief.notionPageId);
    const lines = [
      `*${brief.title}*`,
      `\`${brief.pillar}\`  \`${brief.format}\`  \`${brief.priority}\``,
      brief.hook
    ];
    if (notionLink) lines.push(`<${notionLink}|Open in Notion>`);

    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: lines.join('\n') }
    });
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'context',
    elements: [{ type: 'mrkdwn', text: '✅ Approved → production | ❌ Disapproved → drop' }]
  });

  return blocks;
}

async function upsertBriefInNotion(notion, brief) {
  const buildOut = formatBriefForNotion(brief);

  if (brief.source === 'vault' && brief.notionPageId) {
    await notion.pages.update({
      page_id: brief.notionPageId,
      properties: {
        Status: { select: { name: 'Fleshed Out' } },
        Hook: { rich_text: [{ text: { content: truncate(brief.hook, 1990) } }] },
        'How to Build It Out': { rich_text: [{ text: { content: buildOut } }] }
      }
    });
    return brief.notionPageId;
  }

  const page = await notion.pages.create({
    parent: { database_id: IDEA_VAULT_DB_ID },
    properties: {
      Idea: { title: [{ text: { content: brief.title } }] },
      Format: { select: { name: brief.format } },
      Pillar: { select: { name: PILLAR_TO_NOTION[brief.pillar] || 'Cutbox' } },
      Status: { select: { name: 'Fleshed Out' } },
      Hook: { rich_text: [{ text: { content: truncate(brief.hook, 1990) } }] },
      'How to Build It Out': { rich_text: [{ text: { content: buildOut } }] },
      'Date Captured': { date: { start: new Date().toISOString().split('T')[0] } }
    }
  });

  return page.id;
}

// Reads Approved/Disapproved entries from the Idea Vault to build a learning context
export async function loadFeedbackContext() {
  const notion = createNotionClient();
  const approvedCounts = {};
  const disapprovedCounts = {};

  try {
    const res = await notion.databases.query({
      database_id: IDEA_VAULT_DB_ID,
      filter: {
        or: [
          { property: 'Status', select: { equals: 'Approved' } },
          { property: 'Status', select: { equals: 'Disapproved' } }
        ]
      },
      page_size: 100
    });

    for (const page of res.results) {
      const status = page.properties.Status?.select?.name;
      const pillar = page.properties.Pillar?.select?.name || 'Unknown';
      const format = page.properties.Format?.select?.name || 'Unknown';
      const key = `${format} + ${pillar}`;

      if (status === 'Approved') {
        approvedCounts[key] = (approvedCounts[key] || 0) + 1;
      } else if (status === 'Disapproved') {
        disapprovedCounts[key] = (disapprovedCounts[key] || 0) + 1;
      }
    }
  } catch (err) {
    console.warn(`Warning: could not load feedback context: ${err.message}`);
    return '';
  }

  const approvedLines = Object.entries(approvedCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v}x)`)
    .join(', ');
  const disapprovedLines = Object.entries(disapprovedCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} (${v}x)`)
    .join(', ');

  const lines = [];
  if (approvedLines) lines.push(`Approved patterns: ${approvedLines}`);
  if (disapprovedLines) lines.push(`Disapproved patterns: ${disapprovedLines}`);
  return lines.join('\n');
}

// Posts to #q-content awareness only — no approval gate.
// Koren reviews in Notion and flips Status = Approved or Disapproved.
async function postSlackSummary(briefs, sprintName) {
  const token = getSlackToken();
  const res = await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      channel: SLACK_CHANNEL_ID,
      text: `📋 Content sprint ready — ${briefs.length} briefs generated`,
      blocks: buildSlackBlocks(briefs, sprintName)
    })
  });

  const data = await res.json();
  if (!res.ok || !data.ok) {
    throw new Error(`Slack post failed: ${data.error || res.statusText}`);
  }
}

export async function publish(briefs, sprintName) {
  const notion = createNotionClient();
  const publishedBriefs = [];

  for (const brief of briefs) {
    const notionPageId = await upsertBriefInNotion(notion, brief);
    publishedBriefs.push({ ...brief, notionPageId });
  }

  await postSlackSummary(publishedBriefs, sprintName);
}
