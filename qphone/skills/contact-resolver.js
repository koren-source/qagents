import fs from 'fs';
import { Client } from '@notionhq/client';

const NOTION_KEY_PATH = '/Users/q/.openclaw/workspace/credentials/notion-cutbox-key.txt';
const CONTACT_BOOK_DB_ID = 'REPLACE_WITH_CONTACT_BOOK_DB_ID';

function getNotion() {
  return new Client({ auth: fs.readFileSync(NOTION_KEY_PATH, 'utf-8').trim() });
}

/**
 * Look up a contact by phone number in the Notion Contact Book.
 * Returns { name, phone, company, role, status, tags, pageId } or null.
 */
export async function resolveContact(phoneNumber) {
  try {
    const res = await getNotion().databases.query({
      database_id: CONTACT_BOOK_DB_ID,
      filter: { property: 'Phone', rich_text: { equals: phoneNumber } },
      page_size: 1
    });

    if (res.results.length === 0) return null;
    const page = res.results[0];

    return {
      name: page.properties.Name?.title?.[0]?.text?.content || 'Unknown',
      phone: phoneNumber,
      company: page.properties.Company?.rich_text?.[0]?.text?.content || null,
      role: page.properties.Role?.rich_text?.[0]?.text?.content || null,
      status: page.properties.Status?.select?.name || null,
      tags: page.properties.Tags?.multi_select?.map(t => t.name) || [],
      pageId: page.id
    };
  } catch (err) {
    console.warn(`Contact lookup failed for ${phoneNumber}: ${err.message}`);
    return null;
  }
}

/** Update "Last Contacted" date on a contact after sending. */
export async function updateLastContacted(pageId) {
  await getNotion().pages.update({
    page_id: pageId,
    properties: { 'Last Contacted': { date: { start: new Date().toISOString().split('T')[0] } } }
  });
}

/** Update a contact's Status (e.g., to "Do Not Contact" for opt-outs). */
export async function updateContactStatus(pageId, status) {
  await getNotion().pages.update({
    page_id: pageId,
    properties: { Status: { select: { name: status } } }
  });
}
