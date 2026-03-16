---
name: charles-content-miner
description: >
  Charles skill 1/4. Mines raw material for weekly LinkedIn posts.
  Sources: (1) YouTube transcript for voice + new angles, (2) #q-content
  for ideas and intentions, (3) #q + daily memory logs for what actually
  happened this week. Outputs a structured source brief grounded in
  specific moments, not just themes.
version: 2.0.0
author: q
tags: [charles, linkedin, content, research]
---

# Charles — Content Miner

## Purpose
Pull raw material from four sources and distill it into a source brief built around **specific moments, numbers, and tensions** — not generic themes. The brief feeds charles-linkedin-writer.

## Model
**Opus (`anthropic/claude-opus-4-6`) runs this entire skill** — both the source reading AND the extraction. Opus sees all the raw material and decides what's worth writing about. This is the most important step in the pipeline. Do not delegate to Sonnet.

Sonnet takes over at charles-linkedin-writer (drafting) and everything after.

## The core question for every source
> What SPECIFIC thing happened, was said, or was built this week that would make a media buyer or founder stop scrolling?

---

## Sources

### 1. YouTube — Voice + articulated angles
Channel: `https://www.youtube.com/@koren_saida`

Get the latest video and transcript:
```bash
yt-dlp --playlist-end 1 --print "%(title)s|%(webpage_url)s" "https://www.youtube.com/@koren_saida/videos"
yt-dlp --write-auto-subs --skip-download --sub-format vtt --output "/tmp/koren_latest" "<video_url>"
```

Extract from the transcript:
- Exact quotes or lines Koren said on camera (these are already in his voice)
- Specific numbers mentioned ($800K, $40K, 70%, 48 hours, etc.)
- Contrarian takes or moments where he flips a common assumption
- Stories with a before/after structure

### 2. #q-content — New ideas and content intentions
```
message(action=read, target=C0AF2TN0L6T, limit=50)
```
Extract:
- New ideas or topics Koren dropped this week
- Content he asked to be worked on
- Opinions, takes, reactions he expressed
- Anything he called out as interesting or worth sharing

### 3. #q — What was actually worked on this week
```
message(action=read, target=C0AFX7XRWAD, limit=100)
```
This is the richest source. Extract:
- Tasks completed, tools built, problems solved
- Specific wins with numbers (e.g. "page load time dropped 40%", "closed a $15K client")
- Frustrations or failures that revealed something true
- Systems or workflows that were built or refined
- Decisions made and the reasoning behind them

### 4. Daily memory logs — What happened in detail
Read all memory files from the last 7 days:
```bash
ls /Users/q/.openclaw/workspace/memory/2026-*.md | tail -7
```
Then read each file. These are the richest source of specific, postable moments:
- Tools built or skills created (e.g. `direct-response-copy`, `meta-ads-strategy`)
- Systems shipped or bugs fixed (specific enough to name the bug)
- Decisions made and why
- Wins, failures, and surprises
- Anything that made Koren say "huh, that's interesting"

The Memory Journal at https://q-mission-control-ten.vercel.app is a frontend for these exact files — same data, more readable. Use the files directly.

### 5. #agent-charles briefs (bonus)
```
message(action=read, target=C0AFMV9ND0U, limit=10)
```
Check for any explicit topic requests or briefs dropped since last Sunday.

---

## Output Format

The output is a source brief. Every item must be **specific** — a real number, a real moment, a real tension. No vague themes.

```
SOURCE BRIEF — Week of [date]

YOUTUBE VIDEO: [title] | [url]
BEST LINES FROM VIDEO:
- "[exact quote or close paraphrase]" — [why it's postable]
- "[exact quote or close paraphrase]"

WHAT WAS ACTUALLY BUILT / DONE THIS WEEK (from #q + memory):
- [specific thing with a number or outcome]
- [specific thing with a number or outcome]
- [specific thing with a number or outcome]

IDEAS + TAKES FROM #q-content:
- [specific idea or take Koren expressed]
- [specific idea or take Koren expressed]

EXPLICIT BRIEFS FROM #agent-charles:
- [any direct requests]

HARD NUMBERS AVAILABLE THIS WEEK:
- [every $ amount, %, time delta, or count mentioned in any source]

TOP 3 SPECIFIC MOMENTS FOR POSTS (not themes — moments):
1. MOMENT: [what specifically happened]
   TENSION: [what people assume vs. what actually happened]
   INSIGHT: [one-line flip]
   FREE VALUE: [what the reader can take and use immediately]

2. MOMENT: [what specifically happened]
   TENSION: [assumption vs. reality]
   INSIGHT: [one-line flip]
   FREE VALUE: [actionable takeaway]

3. MOMENT: [what specifically happened]
   TENSION: [assumption vs. reality]
   INSIGHT: [one-line flip]
   FREE VALUE: [actionable takeaway]

KOREN'S SHARPEST TAKE THIS WEEK:
[The single most quotable or contrarian thing he said or did]
```

**The test for every moment:** 
1. Could a generic ghostwriter invent this from a prompt? If yes → cut it, dig deeper.
2. Does the reader walk away with something they can USE? If no → add the free value layer.

**Why free value matters:** Koren's goal is to build an audience of media buyers, founders, and operators. Every post should teach something real — a metric, a system, a decision rule, a framework — not just tell a story. The story is the hook. The value is why they follow.
