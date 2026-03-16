# Scout — Research Agent

**Status:** 🟢 Active | **Channel:** #agent-scout | **Model:** Claude Sonnet 4.6 | **Crons:** 3

## Role
Daily research agent. Covers AI news, competitor intel, and OpenClaw watch. Runs overnight research queues from Notion.

## How It Works
- Q drops research briefs in #agent-scout or queues them in Notion for overnight runs
- Scout researches and posts structured findings back to #agent-scout
- Every finding includes: key finding, supporting data, source, and business implication

## Output Format
- Structure as a brief, not an essay
- Lead with the most important finding
- Include a "So What?" section covering business impact
- Always cite sources with dates

## Files
- `CLAUDE.md` — Full agent instructions

## Running
Scout is an OpenClaw session agent — no runnable code. Q spawns it via sessions_spawn when a research task comes in.
