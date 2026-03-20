/**
 * Prompt injection detection for inbound SMS.
 *
 * Layers:
 *   1. Input sanitization (strip zero-width chars, normalize, truncate)
 *   2. Pattern matching (known injection phrases)
 *   3. Keyword blocklist (sensitive operations)
 *
 * Returns: { flag: 'safe'|'suspicious'|'malicious', sanitized, score }
 */

const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions/i,
  /ignore\s+(all\s+)?prior\s+instructions/i,
  /you\s+are\s+now/i,
  /system\s*prompt/i,
  /act\s+as\s+(a\s+)?/i,
  /pretend\s+(you('re|\s+are)\s+)/i,
  /new\s+instructions/i,
  /override\s+(your\s+)?/i,
  /disregard\s+(all\s+)?/i,
  /forget\s+(all\s+)?previous/i,
  /jailbreak/i,
  /DAN\s+mode/i,
  /developer\s+mode/i,
  /do\s+anything\s+now/i,
];

const BLOCKLIST_PATTERNS = [
  /send\s+to\s+all/i,
  /forward\s+(this\s+)?(to|message)/i,
  /delete\s+(all|everything|message)/i,
  /api\s*key/i,
  /password/i,
  /secret/i,
  /access\s*token/i,
  /list\s+(all\s+)?(customer|user|contact|email)/i,
  /database/i,
  /export\s+(all|data|customer)/i,
];

function sanitize(raw) {
  return raw
    .replace(/[\u200B\u200C\u200D\uFEFF\u00AD]/g, '')
    .trim()
    .slice(0, 1600);
}

function scorePatterns(body, patterns, weight, cap = 1.0) {
  return Math.min(patterns.filter(p => p.test(body)).length * weight, cap);
}

export function analyzeMessage(rawBody) {
  const sanitized = sanitize(rawBody);
  const total = Math.min(
    scorePatterns(sanitized, INJECTION_PATTERNS, 0.6) +
    scorePatterns(sanitized, BLOCKLIST_PATTERNS, 0.3, 0.5),
    1.0
  );

  let flag;
  if (total >= 0.6) flag = 'malicious';
  else if (total >= 0.3) flag = 'suspicious';
  else flag = 'safe';

  return { flag, sanitized, score: total };
}
