import fs from 'fs';
import { Client } from '@notionhq/client';

const NOTION_KEY_PATH = '/Users/q/.openclaw/workspace/credentials/notion-cutbox-key.txt';
const MESSAGE_LOG_DB_ID = 'REPLACE_WITH_MESSAGE_LOG_DB_ID';

function getNotion() {
  return new Client({ auth: fs.readFileSync(NOTION_KEY_PATH, 'utf-8').trim() });
}

/** Log a message to the Notion Message Log. Returns the Notion page ID. */
export async function logMessage({ direction, phone, body, bodySanitized, status, trigger, securityFlag, securityScore, twilioSid, contact }) {
  const properties = {
    Direction: { select: { name: direction } },
    Phone: { rich_text: [{ text: { content: phone } }] },
    Body: { rich_text: [{ text: { content: (body || '').slice(0, 1990) } }] },
    Status: { select: { name: status } },
    Timestamp: { date: { start: new Date().toISOString() } }
  };

  if (trigger) properties.Trigger = { select: { name: trigger } };
  if (securityFlag) properties['Security Flag'] = { select: { name: securityFlag.charAt(0).toUpperCase() + securityFlag.slice(1) } };
  if (twilioSid) properties['Twilio SID'] = { rich_text: [{ text: { content: twilioSid } }] };
  if (contact?.pageId) properties.Contact = { relation: [{ id: contact.pageId }] };

  const page = await getNotion().pages.create({ parent: { database_id: MESSAGE_LOG_DB_ID }, properties });
  return page.id;
}

/** Update message status by Notion page ID. */
export async function updateMessageStatus(pageId, updates) {
  const properties = {};
  if (updates.status) properties.Status = { select: { name: updates.status } };
  if (updates.twilioSid) properties['Twilio SID'] = { rich_text: [{ text: { content: updates.twilioSid } }] };
  if (updates.approvedBy) properties['Approved By'] = { rich_text: [{ text: { content: updates.approvedBy } }] };
  if (updates.error) properties.Error = { rich_text: [{ text: { content: updates.error } }] };

  await getNotion().pages.update({ page_id: pageId, properties });
}

/** Retrieve a message by Notion page ID. Returns { phone, body, status, direction } or null. */
export async function getMessageById(pageId) {
  try {
    const page = await getNotion().pages.retrieve({ page_id: pageId });
    return {
      phone: page.properties.Phone?.rich_text?.[0]?.text?.content || null,
      body: page.properties.Body?.rich_text?.[0]?.text?.content || null,
      status: page.properties.Status?.select?.name || null,
      direction: page.properties.Direction?.select?.name || null,
      contactPageId: page.properties.Contact?.relation?.[0]?.id || null
    };
  } catch (err) {
    console.warn(`Failed to retrieve message ${pageId}: ${err.message}`);
    return null;
  }
}
