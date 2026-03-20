# QPhone Memory Note for Q

> Paste this into Q's MEMORY.md or system prompt so Q knows how to route SMS tasks.

---

## QPhone — SMS Agent

QPhone handles all SMS. Located at ~/agents/qagents/qphone/

**To send a text (goes to Slack for approval):**
```
cd ~/agents/qagents/qphone && node index.js --send --to +1XXX --body "message"
```

**To use a template:**
```
node index.js --template meeting_followup --to +1XXX first_name=John
```

**Available templates:** meeting_followup, meeting_reminder, warm_touch, post_discovery

**How approval works:**
- Messages post to #qphone in Slack
- React with the checkmark to send, X to reject
- Approval poller runs every 30 seconds via cron
- Auto-approved templates (meeting_followup, meeting_reminder, post_discovery) send immediately

**Rules for Q:**
- NEVER bypass the approval flow
- NEVER send without posting to #qphone first
- Always check "Do Not Contact" status before drafting
- Contact book is in Notion — use QPhone's contact-resolver for lookups
