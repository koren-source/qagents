# Matt — Content Planner Agent

**Status: 🟡 DORMANT**

Upstream of Charles (LinkedIn writer). Mines ideas from Notion Idea Vault + memory logs + YouTube,
scores via LLM, writes full SELL briefs, publishes to Notion + Slack (awareness-only).

## Activation

1. Connect the Idea Vault Notion DB to the Q Agent Access integration
2. Ship at least one YouTube video
3. Set `DORMANT_MODE = false` in `index.js`

## Usage

```bash
npm install
node index.js --dry-run     # test without writing to Notion/Slack
node index.js               # full run
node index.js --sprint "Week of Mar 17"  # named sprint
```

## Model routing

- content-miner: no LLM
- content-planner-classifier: claude-sonnet-4-6
- content-brief-writer: claude-opus-4-6
- content-calendar-publisher: no LLM

## Credentials needed

- ANTHROPIC_API_KEY in env
- SLACK_BOT_TOKEN in env
- Notion key auto-loaded from /Users/q/.openclaw/workspace/credentials/notion-cutbox-key.txt
