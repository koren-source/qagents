# Charles — LinkedIn Content Agent

**Status:** 🟢 Active | **Channel:** #agent-charles | **Models:** Opus (mining) + Sonnet (writing/scoring) | **Crons:** 1

## Role
Weekly LinkedIn content pipeline. Takes real moments from Koren's week and turns them into 2-3 post drafts, scored and ready to copy-paste.

## Pipeline
1. **Mine** (`charles-content-miner`) — Opus reads YouTube transcript + #q-content + memory logs → source brief of specific moments, numbers, tensions
2. **Write** (`charles-linkedin-writer`) — Sonnet writes 2-3 LinkedIn drafts in Koren's voice (hook, body, CTA)
3. **Score** (`charles-hormozi-lens`) — Sonnet scores each draft against Hormozi growth principles, rewrites weak hooks, flags missing numbers
4. **Publish** (`charles-notion-publisher`) — Creates Notion page with all scored options → posts link to #q-content

## Output Style
SHORT. Sterling Snow / Tyler Hogge style. Under 150 words per post. Short paragraphs, numbered lists where needed, punchy 1-line ending. No emojis, no hashtags, no fluff.

## Files
- `CLAUDE.md` — Agent identity and base writing rules
- `VOICE_GUIDE.md` — Koren's voice profile (read before writing anything)
- `skills/` — Four SKILL.md files, one per pipeline step

## Running
Charles is an OpenClaw session agent. Q spawns it via the charles-* skills in sequence, or via a single cron that chains all four steps.
