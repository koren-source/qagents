import fs from 'fs';
import twilio from 'twilio';

const CRED_DIR = '/Users/q/.openclaw/workspace/credentials';

function loadCred(filename) {
  return fs.readFileSync(`${CRED_DIR}/${filename}`, 'utf-8').trim();
}

let client = null;
function getClient() {
  if (!client) {
    client = twilio(loadCred('twilio-account-sid.txt'), loadCred('twilio-auth-token.txt'));
  }
  return client;
}

/**
 * Send SMS via Twilio. Returns the Twilio message object (.sid, .status).
 */
export async function sendSms(to, body, opts = {}) {
  const tw = getClient();
  const params = {
    to,
    from: opts.from || loadCred('twilio-phone-number.txt'),
    body
  };
  if (opts.statusCallback) params.statusCallback = opts.statusCallback;

  try {
    const message = await tw.messages.create(params);
    console.log(`   Twilio SID: ${message.sid} | Status: ${message.status}`);
    return message;
  } catch (err) {
    console.error(`   Twilio error: ${err.message} (code: ${err.code})`);
    throw err;
  }
}
