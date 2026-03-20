import fs from 'fs';

const QPHONE_CHANNEL_ID = 'REPLACE_WITH_QPHONE_CHANNEL_ID';

function getSlackToken() {
  const config = JSON.parse(fs.readFileSync('/Users/q/.openclaw/openclaw.json', 'utf-8'));
  const token = config?.plugins?.entries?.slack?.config?.token
    || config?.channels?.slack?.token
    || config?.integrations?.slack?.token;
  if (!token) throw new Error('Slack token not found in openclaw.json');
  return token;
}

async function slackApi(method, params = {}) {
  const res = await fetch(`https://slack.com/api/${method}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getSlackToken()}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack ${method} failed: ${data.error}`);
  return data;
}

async function slackGet(method, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`https://slack.com/api/${method}?${qs}`, {
    headers: { Authorization: `Bearer ${getSlackToken()}` }
  });
  const data = await res.json();
  if (!data.ok) throw new Error(`Slack ${method} failed: ${data.error}`);
  return data;
}

async function slackPost(text, blocks = null) {
  const payload = { channel: QPHONE_CHANNEL_ID, text };
  if (blocks) payload.blocks = blocks;
  return slackApi('chat.postMessage', payload);
}

// ── Outbound approval request ──

export async function postOutboundApproval({ to, contactName, body, trigger, messageId }) {
  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: '\ud83d\udce4 Outbound SMS \u2014 Awaiting Approval' } },
    { type: 'section', text: { type: 'mrkdwn', text: [
      `*To:* ${contactName} (${to})`,
      `*Trigger:* ${trigger}`,
      `*Message:*\n> ${body}`,
      `\`ID: ${messageId}\``
    ].join('\n') } },
    { type: 'divider' },
    { type: 'context', elements: [{ type: 'mrkdwn', text: '\u2705 to approve and send  |  \u274c to reject' }] }
  ];
  return slackPost(`\ud83d\udce4 Outbound to ${contactName}: "${body.slice(0, 50)}..."`, blocks);
}

// ── Inbound notification ──

export async function postInboundNotification({ from, body, contactName, contactCompany, flag, score, twilioSid }) {
  const emoji = flag === 'malicious' ? '\ud83d\udea9' : flag === 'suspicious' ? '\u26a0\ufe0f' : '\ud83d\udce9';
  const prefix = flag === 'malicious' ? '\ud83d\udea9 *QUARANTINED*' : flag === 'suspicious' ? '\u26a0\ufe0f *SUSPICIOUS*' : '\ud83d\udce9 *Inbound SMS*';
  const sender = contactName ? `${contactName}${contactCompany ? ` (${contactCompany})` : ''} \u2014 ${from}` : from;

  const blocks = [
    { type: 'header', text: { type: 'plain_text', text: `${emoji} Inbound SMS` } },
    { type: 'section', text: { type: 'mrkdwn', text: [
      prefix,
      `*From:* ${sender}`,
      `*Message:*\n> ${body}`,
      `Security: ${flag} (${score.toFixed(2)}) | SID: \`${twilioSid}\``
    ].join('\n') } }
  ];
  return slackPost(`${emoji} From ${sender}: "${body.slice(0, 50)}..."`, blocks);
}

// ── Failure notification ──

export async function postFailure({ to, contactName, error, messageId }) {
  return slackPost(`\ud83d\udd34 *SMS Failed*\n*To:* ${contactName || to}\n*Error:* ${error}\n*ID:* \`${messageId}\``);
}

// ── Opt-out notification (Gap 4) ──

export async function postOptOut({ from, contactName }) {
  return slackPost(`\u26d4 *${contactName || from}* opted out. Marked as Do Not Contact.`);
}

// ── Approval polling helpers (Gap 1) ──

/** Get recent bot messages from #qphone that contain an ID: tag. */
export async function getRecentBotMessages() {
  const oldest = String(Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000));
  const data = await slackGet('conversations.history', {
    channel: QPHONE_CHANNEL_ID,
    oldest,
    limit: '50'
  });

  const idPattern = /`ID:\s*([a-f0-9-]{36})`/;
  const results = [];

  for (const msg of data.messages || []) {
    // Only look at bot messages (have bot_id or subtype === 'bot_message')
    if (!msg.bot_id && msg.subtype !== 'bot_message') continue;
    const match = msg.text?.match(idPattern);
    if (!match) continue;
    results.push({ ts: msg.ts, messageId: match[1], text: msg.text });
  }

  return results;
}

/** Get reactions on a specific message. Returns { approved, rejected, approvedBy }. */
export async function getReactions(ts) {
  try {
    const data = await slackGet('reactions.get', { channel: QPHONE_CHANNEL_ID, timestamp: ts });
    const reactions = data.message?.reactions || [];

    let approved = false;
    let rejected = false;
    let approvedBy = null;

    for (const r of reactions) {
      if (r.name === 'white_check_mark') {
        approved = true;
        approvedBy = r.users?.[0] || null;
      }
      if (r.name === 'x') {
        rejected = true;
      }
    }

    return { approved, rejected, approvedBy };
  } catch (err) {
    console.warn(`Failed to get reactions for ts=${ts}: ${err.message}`);
    return { approved: false, rejected: false, approvedBy: null };
  }
}

/** Post confirmation that a message was sent after approval. */
export async function postApprovalResult({ contactName, phone, sid }) {
  return slackPost(`\u2705 *Sent* to ${contactName || phone}. SID: \`${sid}\``);
}

/** Post notification that a message was rejected. */
export async function postRejectionResult({ contactName, phone }) {
  return slackPost(`\u274c *Rejected* message to ${contactName || phone}.`);
}
