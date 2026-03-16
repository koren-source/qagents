---
name: charles-notion-publisher
description: >
  Charles skill 4/4. Creates a formatted Notion page in the Charles — Weekly
  LinkedIn database with all scored post options, then delivers the link
  to #q-content with a one-line summary.
version: 1.0.0
author: q
tags: [charles, linkedin, notion, publishing]
---

# Charles — Notion Publisher

## Purpose
Save this week's post options to Notion and notify Koren in #q-content.

## Pipeline Model Assignment
```
Step 1 — Opus:   charles-content-miner (read ALL sources + extract moments)
Step 2 — Opus:   Score + rank moments, finalize source brief
Step 3 — Sonnet: charles-linkedin-writer (write 3 posts × 3 ideas × 2 drafts)
Step 4 — Sonnet: charles-hormozi-lens (score + tighten)
Step 5 — Sonnet: charles-notion-publisher (this skill — publish + notify)
```
Opus thinks. Sonnet produces.

## Notion Details

**Database ID:** `324e2d85-cab8-81ae-854c-d2e86713fef9`
**Workspace:** Cutbox (use `NOTION_CUTBOX_KEY`)

### Format: Individual rows per topic (NOT a single parent page)

Create **one row per topic** in the Charles LinkedIn database. Do NOT create a parent "Week of..." page.

Each row's properties:
| Property | Value |
|----------|-------|
| Name | `Post [N] — Week of [Mon date, e.g. Mar 17]` (no year) |
| Status | `Draft` |
| Week | [Monday of current week as ISO date] |

So for 3 topics, create 3 rows:
- `Post 1 — Week of Mar 17`
- `Post 2 — Week of Mar 17`
- `Post 3 — Week of Mar 17`

### Page Body Structure (per row) — EXACT FORMAT

Each row covers ONE content theme with 3 ideas, one per pillar. Each idea has 2 draft variants.

Use this exact layout (no dividers — just bold heading blocks, clean text):

```
## Topic: [topic title / angle]

### Idea A — AI
### Draft A1
[post text]

### Draft A2
[post text]

### Idea B — Consulting / YouTube
### Draft B1
[post text]

### Draft B2
[post text]

### Idea C — Cutbox
### Draft C1
[post text]

### Draft C2
[post text]
```

**Structural rules:**
- `##` heading_2 for the Topic line only
- `###` heading_3 for all Idea labels and Draft labels
- NO dividers between sections — clean flow, that's it
- 3 Ideas per page (AI / Consulting or YouTube / Cutbox), 2 Drafts per Idea = 6 total variants
- Each draft = complete, copy-pasteable post
- Pillar order is always: AI → Consulting/YouTube → Cutbox

**Writing style rules (non-negotiable):**
- Short punchy paragraphs — 1 to 3 lines max
- Specific numbers always — $800K not "almost a million", 48 hours not "early", $40K not "a lot"
- Use numbered lists when making 3+ sequential points
- End every draft with a single strong reframe line ("Most media buyers are watching the rearview mirror. Fatigue rate is the windshield.")
- No fluff, no hedging, no corporate filler
- Conversational but authoritative — you'\''re showing receipts, not giving a lecture
- Under 150 words per draft

## Notion API

Use the skill at `~/.openclaw/workspace/skills/notion/SKILL.md` for API calls.
Key: use `NOTION_CUTBOX_KEY` (not the Q Ops key).

Create the page, then retrieve its URL from the response (`page.url`).

## Slack Delivery

After the Notion page is created, post to `#q-content` (channel ID: `C0AF2TN0L6T`):

```
📝 Weekly LinkedIn options ready — Week of [date]

[Notion page URL]

[2–3 word angle summary per post]
• Post A: [hook — first 5 words]
• Post B: [hook — first 5 words]
• Post C (if exists): [hook — first 5 words]

Pick one and it's ready to publish.
```

## Error Handling
- If Notion write fails: post the full post content directly to #agent-charles as a fallback, note the Notion failure
- If no posts passed Hormozi scoring: surface the best draft with inline notes rather than delivering nothing
