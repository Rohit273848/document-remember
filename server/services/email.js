import nodemailer from 'nodemailer';
import { env, mailConfigured } from '../config/env.js';

let transporter;
function getTransporter() {
  if (!mailConfigured) return null;
  if (!transporter) transporter = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE, auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } });
  return transporter;
}
export async function sendEmail({ to, subject, text, html }) {
  const mailer = getTransporter();
  if (!mailer) return { skipped: true };
  await mailer.sendMail({ from: env.EMAIL_FROM, to, subject, text, html });
  return { sent: true };
}

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);

export function buildReminderEmail({ documentTitle, message, url, language = 'en' }) {
  const safeMessage = escapeHtml(message);
  const safeUrl = escapeHtml(url);
  const safeSubjectTitle = String(documentTitle).replace(/[\r\n]+/g, ' ').slice(0, 180);
  const hindi = language === 'hi';
  const subject = hindi ? `नवीनीकरण रिमाइंडर: ${safeSubjectTitle}` : `Renewal reminder: ${safeSubjectTitle}`;
  const openLabel = hindi ? 'परिवार के दस्तावेज़ खोलें' : 'Open family documents';
  const securityNote = hindi ? 'दस्तावेज़ देखने के लिए साइन इन करें। Hearth खोलने से पहले परिवार की पहुँच जाँचता है।' : 'Sign in to review the document. Hearth checks your family access before opening it.';
  const footerNote = hindi ? 'यह रिमाइंडर Hearth से भेजा गया है, जहाँ परिवार के दस्तावेज़ और नवीनीकरण व्यवस्थित रहते हैं।' : 'This reminder was sent from Hearth, your family document and renewal workspace.';
  return {
    subject,
    text: `${message}\n\n${openLabel}: ${url}`,
    html: `<!doctype html><html lang="${hindi ? 'hi' : 'en'}"><body style="margin:0;padding:24px 12px;background:#f4f7f5;font-family:Arial,Helvetica,sans-serif;color:#30463e"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#ffffff;border:1px solid #e3ebe5;border-radius:16px;overflow:hidden"><tr><td style="padding:20px 24px;background:#17645f;color:#ffffff"><div style="font-size:21px;font-weight:700;letter-spacing:-.5px">hearth</div><div style="margin-top:4px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#d6e8e0">${hindi ? 'परिवार के दस्तावेज़' : 'Family documents'}</div></td></tr><tr><td style="padding:26px 24px 10px"><div style="display:inline-block;padding:7px 10px;border-radius:20px;background:#edf5f0;color:#477b6e;font-size:12px;font-weight:700">${hindi ? 'नवीनीकरण रिमाइंडर' : 'Renewal reminder'}</div><h1 style="margin:16px 0 10px;color:#263d36;font-size:23px;line-height:1.45">${hindi ? 'इस तारीख़ को याद रखें' : 'A date to keep in view'}</h1><p style="margin:0;color:#52665d;font-size:16px;line-height:1.7">${safeMessage}</p></td></tr><tr><td style="padding:20px 24px 12px"><a href="${safeUrl}" style="display:inline-block;padding:13px 18px;border-radius:9px;background:#17645f;color:#ffffff;text-decoration:none;font-size:14px;font-weight:700">${openLabel}</a><p style="margin:16px 0 0;color:#7f8d85;font-size:13px;line-height:1.65">${securityNote}</p></td></tr><tr><td style="padding:15px 24px;border-top:1px solid #edf1ee;background:#fafcfb;color:#829087;font-size:12px;line-height:1.6">${footerNote}</td></tr></table></body></html>`,
  };
}
