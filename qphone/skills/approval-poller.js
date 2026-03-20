import { getRecentBotMessages, getReactions, postApprovalResult, postRejectionResult, postFailure } from './slack-poster.js';
import { getMessageById, updateMessageStatus } from './message-store.js';
import { resolveContact, updateLastContacted } from './contact-resolver.js';

/**
 * Poll #qphone for approval/rejection reactions on outbound SMS posts.
 *
 * For each bot message with an `ID: <notion-page-id>` tag:
 *   - If reacted with white_check_mark: send the SMS, update Notion
 *   - If reacted with x: reject, update Notion
 *   - If no reaction: skip (still awaiting approval)
 *
 * Designed to run as a cron job every 30 seconds via LaunchAgent.
 */
export async function checkApprovals({ sendSms }) {
  const botMessages = await getRecentBotMessages();

  if (botMessages.length === 0) {
    console.log('   No pending approval messages found.');
    return;
  }

  console.log(`   Found ${botMessages.length} messages with IDs. Checking reactions...`);

  for (const { ts, messageId } of botMessages) {
    const { approved, rejected, approvedBy } = await getReactions(ts);

    if (!approved && !rejected) continue;

    // Retrieve the message from Notion
    const msg = await getMessageById(messageId);
    if (!msg) {
      console.warn(`   Could not retrieve message ${messageId} from Notion. Skipping.`);
      continue;
    }

    // Skip if already processed (prevents race conditions between poller runs)
    if (msg.status !== 'Queued') {
      continue;
    }

    if (approved) {
      // Claim the message by setting status to Approved before sending
      await updateMessageStatus(messageId, { status: 'Approved', approvedBy: approvedBy || 'unknown' });

      try {
        const result = await sendSms(msg.phone, msg.body);
        await updateMessageStatus(messageId, { status: 'Sent', twilioSid: result.sid });

        // Update Last Contacted on the contact
        const contact = await resolveContact(msg.phone);
        if (contact?.pageId) {
          await updateLastContacted(contact.pageId);
        }

        await postApprovalResult({ contactName: contact?.name, phone: msg.phone, sid: result.sid });
        console.log(`   \u2705 Sent to ${contact?.name || msg.phone} (SID: ${result.sid})`);
      } catch (err) {
        await updateMessageStatus(messageId, { status: 'Failed', error: err.message });
        await postFailure({ to: msg.phone, contactName: null, error: err.message, messageId });
        console.error(`   \u274c Failed to send to ${msg.phone}: ${err.message}`);
      }
    } else if (rejected) {
      await updateMessageStatus(messageId, { status: 'Rejected', approvedBy: approvedBy || 'unknown' });

      const contact = await resolveContact(msg.phone);
      await postRejectionResult({ contactName: contact?.name, phone: msg.phone });
      console.log(`   \u274c Rejected message to ${contact?.name || msg.phone}`);
    }
  }
}
