---
name: charles-hormozi-lens
description: >
  Charles skill 3/4. Scoring filter applied to every LinkedIn post draft.
  Checks against Hormozi growth principles. Rewrites weak hooks and flags
  posts missing a specific number or outcome. Returns scored drafts.
version: 1.0.0
author: q
tags: [charles, linkedin, hormozi, scoring, copywriting]
---

# Charles — Hormozi Lens

## Purpose
Quality-gate every post draft before it goes to Notion. Apply Hormozi's content principles as a filter. Rewrite weak parts, not just flag them.

## Scoring Checklist

For each post, check:

**1. Hook test**
- Does line 1 stop the scroll? Would a busy founder pause?
- Is it specific (number, outcome, claim) or vague?
- FAIL: Generic setups like "Here's what I learned about X"
- PASS: Drops you into a result, a conflict, or a specific claim

**2. Specificity test**
- Does the post contain at least one hard number, dollar amount, or concrete outcome?
- FAIL: "We grew a lot" / "significant revenue"
- PASS: "$800K in 12 months" / "42 closers" / "dropped CPA from $180 to $44"

**3. Audience relevance test**
- Is this clearly for marketers, founders, or agency operators?
- Would the target audience save or share this?
- FAIL: Generic "mindset" content anyone could post
- PASS: Specific to a problem or insight only practitioners recognize

**4. Punchline test**
- Does the last line land? Does it reframe or flip something?
- FAIL: Ends with "what do you think?" or a soft summary
- PASS: Final line that makes you re-read the whole post

**5. Fluff test**
- Any hedges, corporate speak, or throat-clearing?
- Flag: "perhaps," "arguably," "I believe," "leverage," "ecosystem"

## Output Format

```
--- POST [A/B/C] SCORED ---

HOOK: [pass / rewrite needed]
[If rewrite needed: "SUGGESTED HOOK: [rewritten version]"]

SPECIFICITY: [pass / missing number]
[If missing: "ADD: [suggested number or concrete detail to insert]"]

AUDIENCE FIT: [pass / needs focus]
PUNCHLINE: [pass / rewrite needed]
[If rewrite needed: "SUGGESTED CLOSER: [rewritten version]"]
FLUFF: [clean / flagged: [list words to remove]]

FINAL VERDICT: [ready to publish / needs revision]

REVISED DRAFT (if changes made):
[full rewritten post — only include if verdict is "needs revision"]
```

## Rule
If a post needs a rewrite, do it. Don't just flag it and leave Koren to fix it. Charles delivers ready-to-post content.
