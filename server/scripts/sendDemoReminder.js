import 'dotenv/config';
import { sendEmail } from '../services/email.js';

async function main() {
  const recipient = 'rohitmahajan6942089@gmail.com';
  const subject = 'Renewal Reminder: Passport (Demo Test)';
  const dateStr = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const text = `This is a demo renewal reminder for your Passport.

Document: Passport
Status: Expires in 30 days (${dateStr})
Action: Renewal preparation recommended

Open your family documents: http://localhost:5173/documents

---
Sent by Hearth Family Document Renewal System`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;">
      <h2 style="color: #0f766e; margin-top: 0;">Renewal Reminder: Passport</h2>
      <p style="font-size: 15px; color: #334155;">This is a <strong>demo renewal reminder</strong> to test email delivery for your family workspace.</p>
      <div style="background-color: #f8fafc; padding: 16px; border-left: 4px solid #0f766e; border-radius: 4px; margin: 20px 0;">
        <p style="margin: 6px 0; color: #1e293b;"><strong>Document:</strong> Passport</p>
        <p style="margin: 6px 0; color: #1e293b;"><strong>Milestone:</strong> 30 days before expiry</p>
        <p style="margin: 6px 0; color: #1e293b;"><strong>Expiry Date:</strong> ${dateStr}</p>
        <p style="margin: 6px 0; color: #0f766e; font-weight: bold;">Status: Action required</p>
      </div>
      <p style="margin: 24px 0;">
        <a href="http://localhost:5173/documents" style="display: inline-block; padding: 11px 22px; background-color: #0f766e; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px;">Open Family Documents</a>
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin-top: 24px;" />
      <p style="font-size: 12px; color: #94a3b8; margin-bottom: 0;">Sent automatically by Hearth Family Document Renewal System</p>
    </div>
  `;

  console.log(`Sending demo reminder email to ${recipient}...`);
  const result = await sendEmail({ to: recipient, subject, text, html });
  console.log('Result:', JSON.stringify(result));
  process.exit(0);
}

main().catch((err) => {
  console.error('Failed to send email:', err);
  process.exit(1);
});
