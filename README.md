# Q Agents — Monorepo

All active Q agents for Koren's operations. Each agent lives in its own folder with full documentation, skill files, and runnable code where applicable.

## Agents

| Agent | Status | Role | Channel | Models |
|-------|--------|------|---------|--------|
| [Scout](./scout/) | 🟢 Active | Research — AI news, competitor intel, overnight research queue | #agent-scout | Claude Sonnet 4.6 |
| [Charles](./charles/) | 🟢 Active | LinkedIn content — mine → write → score → publish | #agent-charles | Opus (mining) + Sonnet (writing) |
| [Matt](./matt/) | 🟡 Dormant | Content Planner — idea vault → classify → briefs → Notion + Slack | #q-content | Sonnet (classifier) + Opus (brief writer) |

## Structure

Each agent folder contains:
- `README.md` — role, pipeline, how to run
- `CLAUDE.md` — agent identity / system prompt (where applicable)
- `skills/` — skill files or runnable JS code
- `prompts/` — LLM prompt templates (where applicable)

## Adding a New Agent

1. Create `agent-name/` folder
2. Add `README.md` with status, role, channel, models
3. Add `CLAUDE.md` if it's an OpenClaw session agent
4. Add `skills/` and/or runnable code
5. Update the table above
