# Matt — Content Planner Agent

**Status: 🟡 DORMANT**

Upstream of Charles (LinkedIn writer). Mines ideas from Notion Idea Vault + memory logs + YouTube, scores via LLM ($10K + Hormozi filters), writes full SELL briefs via Opus, publishes to Notion + Slack (awareness-only). Koren reviews in Notion and flips Status → Approved / Disapproved.

## Activation

1. Set `DORMANT_MODE = false` in `index.js`
2. Run `node index.js --dry-run` to verify
3. Run `node index.js` for a live sprint

## Usage

```bash
npm install
node index.js --dry-run                         # test without writing to Notion/Slack
node index.js                                   # full run
node index.js --sprint "Week of Mar 17"         # named sprint
node index.js --dry-run --max-candidates 6 --max-approved 2   # controlled test
```

## Content Pillars

| Pillar | Focus |
|--------|-------|
| **Cutbox** | Building Cutbox.ai in public — product, AI ops, execution |
| **Business Systems** | Past businesses with receipts + results (Breezy, CRM, ops) |
| **Consulting+AI** | Live client work — SVG, Outlaw, AI workflows, automation |

## Model Routing

| Skill | Model | Role |
|-------|-------|------|
| content-miner | **claude-opus-4-6** | Filters memory logs, extracts real content ideas from noise |
| content-planner-classifier | **claude-sonnet-4-6** | $10K filter + Hormozi check per candidate |
| content-brief-writer | **claude-opus-4-6** | Full SELL brief — hook, outline, proof points, repurpose plan |
| content-calendar-publisher | no LLM | Writes to Notion + posts Slack summary |

## Filters (applied per idea)

- **$10K filter** — Would someone pay $10K for this information?
- **Hormozi check** — Is there a specific number, outcome, or proof moment?
- Both must pass → brief gets written. Fail → logged with reframe suggestion.

## Credentials

- **Claude OAuth** — auto-resolved via `claude` CLI (no API key needed)
- **Notion key** — auto-loaded from `/Users/q/.openclaw/workspace/credentials/notion-cutbox-key.txt`
- **Slack token** — auto-loaded from `~/.openclaw/openclaw.json`

## Idea Vault

Notion DB: `325e2d85-cab8-813c-874a-e924e0993f53`  
Parent page: [Matt — Content Planner](https://www.notion.so/Matt-Content-Planner-325e2d85cab8804195a5d191617e92d3)

Status flow: `Raw Idea → Fleshed Out → Approved / Disapproved → Published`
