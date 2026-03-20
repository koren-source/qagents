import express from 'express';
import twilio from 'twilio';
import fs from 'fs';

const PORT = process.env.QPHONE_PORT || 3847;
const CRED_DIR = '/Users/q/.openclaw/workspace/credentials';

function loadCred(filename) {
  return fs.readFileSync(`${CRED_DIR}/${filename}`, 'utf-8').trim();
}

const OPT_OUT_REGEX = /^\s*(STOP|UNSUBSCRIBE|CANCEL|QUIT|END|STOPALL|STOP ALL)\s*$/i;

/**
 * Express server for Twilio inbound webhooks.
 *
 * Runs on the Mac Mini. Needs a public URL pointing to this port.
 * Options:
 *   Dev:  ngrok http 3847
 *   Prod: cloudflared tunnel --url http://localhost:3847
 *
 * Set the public URL in Twilio Console -> Phone Number -> Messaging -> Webhook
 */
export function startWebhookServer(deps) {
  const { analyzeMessage, resolveContact, updateContactStatus, postInboundNotification, postOptOut, logMessage } = deps;
  const app = express();
  app.use(express.urlencoded({ extended: false }));

  // Twilio signature validation
  const authToken = loadCred('twilio-auth-token.txt');
  const webhookUrl = process.env.QPHONE_WEBHOOK_URL;

  app.use('/webhook', (req, res, next) => {
    if (!webhookUrl) {
      console.warn('\u26a0\ufe0f  QPHONE_WEBHOOK_URL not set \u2014 skipping signature validation');
      return next();
    }
    const sig = req.headers['x-twilio-signature'];
    if (!twilio.validateRequest(authToken, sig, webhookUrl + req.path, req.body)) {
      console.error('\ud83d\udeab Invalid Twilio signature');
      return res.status(403).send('Invalid signature');
    }
    next();
  });

  // Inbound SMS
  app.post('/webhook/inbound', async (req, res) => {
    const { From: from, To: to, Body: rawBody = '', MessageSid: twilioSid } = req.body;
    console.log(`\ud83d\udce9 Inbound from ${from}: "${rawBody.slice(0, 80)}"`);

    // ── STOP/opt-out check (before security harness) ──
    if (OPT_OUT_REGEX.test(rawBody)) {
      console.log(`\ud83d\uded1 Opt-out from ${from}: "${rawBody}"`);
      const contact = await resolveContact(from);
      if (contact?.pageId) {
        await updateContactStatus(contact.pageId, 'Do Not Contact');
      }
      await logMessage({
        direction: 'Inbound', phone: from, body: rawBody,
        status: 'Received', securityFlag: 'Safe', twilioSid, contact
      });
      await postOptOut({ from, contactName: contact?.name });
      res.type('text/xml').send('<Response/>');
      return;
    }

    // ── Normal flow: security harness, log, notify ──
    const { flag, sanitized, score } = analyzeMessage(rawBody);
    const contact = await resolveContact(from);
    const status = flag === 'malicious' ? 'Quarantined' : 'Received';

    await logMessage({
      direction: 'Inbound', phone: from, body: rawBody, bodySanitized: sanitized,
      status, securityFlag: flag, securityScore: score, twilioSid, contact
    });

    await postInboundNotification({
      from, body: sanitized, contactName: contact?.name,
      contactCompany: contact?.company, flag, score, twilioSid
    });

    res.type('text/xml').send('<Response/>');
  });

  // Delivery status callback
  app.post('/webhook/status', async (req, res) => {
    const { MessageSid, MessageStatus, ErrorCode } = req.body;
    console.log(`\ud83d\udcca Status: ${MessageSid} \u2192 ${MessageStatus}${ErrorCode ? ` (err: ${ErrorCode})` : ''}`);
    // TODO Phase 2: Update Notion Message Log by Twilio SID
    res.sendStatus(200);
  });

  app.listen(PORT, () => {
    console.log(`\ud83d\udd0a QPhone webhook listening on :${PORT}`);
    console.log(`   Inbound: http://localhost:${PORT}/webhook/inbound`);
    console.log(`   Status:  http://localhost:${PORT}/webhook/status`);
    if (webhookUrl) console.log(`   Public:  ${webhookUrl}/webhook/inbound`);
    else console.log('   \u26a0\ufe0f  Set QPHONE_WEBHOOK_URL for signature validation');
  });
}
