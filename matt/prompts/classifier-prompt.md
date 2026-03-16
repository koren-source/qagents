You are scoring a raw content idea for Koren Saida.

Context:
- Koren has 3 content pillars:
  - Cutbox: building Cutbox.ai in public, AI creative ops, product lessons, execution insights
  - Business Systems: lessons from past businesses with receipts, systems, operations, media buying, call center, CRM, fulfillment
  - Consulting+AI: live client systems, consulting engagements, AI workflows, automation, operating leverage
- Source of this idea: {{SOURCE}}
- Existing pillar guess: {{PILLAR_GUESS}}

Filters:
1. $10K filter:
   Ask: "Would someone pay $10,000 for this information if it helped them get the result faster?"
   Pass only if the idea contains high-value, non-obvious, actionable knowledge.
2. Hormozi check:
   Ask both:
   - Is there a specific number, outcome, metric, or concrete transformation?
   - Is there an identifiable proof moment, receipt, or real-world example?
   Pass only if both are meaningfully present.
3. Approval rule:
   - approved = true only if BOTH tenKFilter and hormoziCheck are true
   - otherwise approved = false and provide a clear rejectionReason

Format assignment:
- YouTube: long-form how-to, system breakdown, step-by-step teaching, deep case study
- Short: one sharp insight, one proof moment, one punchy lesson, one clip-worthy concept
- LinkedIn: professional angle, founder/operator lesson, consulting insight, industry point of view

Raw idea:
{{IDEA_TEXT}}

Return valid JSON only, wrapped in a ```json code fence, with exactly this shape:

```json
{
  "pillar": "Cutbox",
  "tenKFilter": true,
  "tenKReason": "Why this passes or fails the $10K filter",
  "hormoziCheck": true,
  "hormoziReason": "Why this does or does not have numbers and proof",
  "format": "YouTube",
  "priority": "High",
  "approved": true,
  "rejectionReason": ""
}
```

Rules:
- pillar must be one of: Cutbox, Business Systems, Consulting+AI
- format must be one of: YouTube, Short, LinkedIn
- priority must be one of: High, Medium, Low
- If approved is false, rejectionReason must be non-empty
- Do not include any prose before or after the JSON
