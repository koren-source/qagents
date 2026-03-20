export const TEMPLATES = {
  meeting_followup: {
    body: "Hey {{first_name}}, great connecting today. I'll send over {{deliverable}} by {{date}}. Text me here if anything comes up.",
    autoApprove: true
  },
  meeting_reminder: {
    body: "Quick reminder — we're connecting at {{time}} today. Here's the link: {{meeting_url}}",
    autoApprove: true
  },
  warm_touch: {
    body: "Hey {{first_name}}, {{custom_message}}",
    autoApprove: false  // Custom content = requires Slack approval
  },
  post_discovery: {
    body: "Hey {{first_name}}, really enjoyed the conversation about {{topic}}. I'll follow up with {{next_step}} this week.",
    autoApprove: true
  }
};

export function renderTemplate(key, context) {
  const template = TEMPLATES[key];
  if (!template) throw new Error(`Unknown template: ${key}. Available: ${Object.keys(TEMPLATES).join(', ')}`);

  let body = template.body;
  for (const [k, v] of Object.entries(context)) {
    body = body.replaceAll(`{{${k}}}`, v);
  }

  const unfilled = body.match(/\{\{[^}]+\}\}/g);
  if (unfilled) console.warn(`\u26a0\ufe0f  Unfilled template variables: ${unfilled.join(', ')}`);

  return body;
}
