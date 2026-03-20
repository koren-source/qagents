# QPhone — Twilio SMS Agent

| Status | Channel | Models | Port |
|--------|---------|--------|------|
| 🟡 Building (A2P pending) | #qphone | Sonnet 4.6 (drafting) | 3847 |

## What It Does
- Sends outbound SMS via Twilio (manual, templates, Q-drafted, calendar triggers)
- Receives inbound SMS via webhook
- Routes everything through #qphone in Slack
- Logs all messages to Notion Message Log
- Looks up contacts in Notion Contact Book
- Scans inbound for prompt injection
- Handles STOP/opt-out messages (marks contact as Do Not Contact)
- Polls Slack for approval reactions every 30 seconds

## Setup
1. Add credential files to `/Users/q/.openclaw/workspace/credentials/`:
   - `twilio-account-sid.txt`
   - `twilio-auth-token.txt`
   - `twilio-phone-number.txt`
2. Create two Notion databases (Contact Book + Message Log)
3. Update DB IDs in `skills/contact-resolver.js` and `skills/message-store.js`
4. Update `QPHONE_CHANNEL_ID` in `skills/slack-poster.js`
5. `npm install`

## Usage

    # Start inbound webhook server
    node index.js --server

    # Send SMS (routes to Slack approval)
    node index.js --send --to +1XXXXXXXXXX --body "Hey, following up"

    # Send pre-approved template
    node index.js --template meeting_reminder --to +1XXX time=3pm meeting_url=https://...

    # Poll for approval reactions
    node index.js --check-approvals

    # Test security harness
    node index.js --test-security

    # Dry run
    node index.js --send --to +1XXX --body "test" --dry-run

## Webhook
Needs a public URL → Mac Mini port 3847.
- Dev: `ngrok http 3847`
- Prod: Cloudflare Tunnel (see below)
- Set in Twilio Console → Phone Number → Messaging → Webhook

## Cloudflare Tunnel (Production)

The Mac Mini uses Cloudflare Tunnel for persistent public URLs.

1. If cloudflared is not installed: `brew install cloudflared`
2. Authenticate (one-time): `cloudflared tunnel login`
3. Create a named tunnel: `cloudflared tunnel create qphone`
4. Run the tunnel: `cloudflared tunnel --url http://localhost:3847 run qphone`
5. Note the public URL (e.g., `https://qphone.yourdomain.com`)
6. Set `QPHONE_WEBHOOK_URL` in the LaunchAgent plist (see below) to the public URL
7. Configure Twilio Console:
   - Phone Number → Messaging → "A MESSAGE COMES IN" → Webhook
   - URL: `https://qphone.yourdomain.com/webhook/inbound`
   - Method: POST
   - Status callback URL: `https://qphone.yourdomain.com/webhook/status`

If there's an existing Cloudflare Tunnel config on the Mac Mini, add a route
for the qphone subdomain instead of creating a new tunnel.

## LaunchAgents

Two LaunchAgent plists are included for the Mac Mini:

**Install:**
```bash
cp com.qphone.webhook.plist ~/Library/LaunchAgents/
cp com.qphone.approvals.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.qphone.webhook.plist
launchctl load ~/Library/LaunchAgents/com.qphone.approvals.plist
```

**Unload:**
```bash
launchctl unload ~/Library/LaunchAgents/com.qphone.webhook.plist
launchctl unload ~/Library/LaunchAgents/com.qphone.approvals.plist
```

- `com.qphone.webhook.plist` — Persistent webhook server (KeepAlive, auto-restart)
- `com.qphone.approvals.plist` — Approval poller cron (every 30 seconds)
- Logs: `/Users/q/.openclaw/workspace/logs/qphone-webhook.log` and `qphone-approvals.log`

## Notion Databases

### Contact Book
| Property | Type | Description |
|----------|------|-------------|
| Name | Title | Contact full name |
| Phone | Text | E.164 format (+1XXXXXXXXXX) |
| Email | Email | Optional |
| Company | Text | Company/brand name |
| Role | Text | Job title |
| Source | Select | Discovery Call, LinkedIn, Referral, Inbound, Conference |
| Status | Select | Active, Cold, Do Not Contact |
| Tags | Multi-select | Beta Prospect, Investor, Partner, Consulting, Personal |
| Last Contacted | Date | Auto-updated when SMS sent |
| Notes | Rich Text | Free-form context |

### Message Log
| Property | Type | Description |
|----------|------|-------------|
| Direction | Select | Outbound / Inbound |
| Contact | Relation | Links to Contact Book |
| Phone | Text | Phone number |
| Body | Rich Text | Message content |
| Status | Select | Queued, Approved, Sent, Delivered, Failed, Received, Quarantined, Rejected |
| Security Flag | Select | Safe, Suspicious, Malicious |
| Trigger | Select | Manual, Slack Command, Q Draft, Calendar, Template |
| Twilio SID | Text | Twilio message SID |
| Approved By | Text | Slack username |
| Timestamp | Date | When sent/received |
| Error | Text | Error details if failed |
