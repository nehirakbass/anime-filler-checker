import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const TO_EMAIL = 'nehirakbas08@gmail.com';
const FROM_EMAIL = 'reports@animefillerchecker.com';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const {
    message,
    email,
    site_url,
    detected_anime,
    browser,
    extension_version,
    name,
  } = req.body || {};

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const isExtensionReport = !!extension_version;
  const subject = isExtensionReport
    ? `[AFC Report] ${extension_version} — ${detected_anime || 'N/A'}`
    : `[AFC Contact] Message from ${name || email || 'visitor'}`;

  const lines = [
    `<b>Message:</b><br>${message.replace(/\n/g, '<br>')}`,
    email ? `<b>Email:</b> ${email}` : null,
    name ? `<b>Name:</b> ${name}` : null,
    site_url ? `<b>Site URL:</b> ${site_url}` : null,
    detected_anime ? `<b>Detected:</b> ${detected_anime}` : null,
    extension_version ? `<b>Version:</b> ${extension_version}` : null,
    browser ? `<b>Browser:</b> ${browser}` : null,
  ].filter(Boolean).join('<br><br>');

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: TO_EMAIL,
      subject,
      html: `<div style="font-family:sans-serif;font-size:14px;line-height:1.6">${lines}</div>`,
    });

    if (error) throw new Error(error.message);

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('report send error:', err);
    return res.status(500).json({ error: 'Failed to send' });
  }
}
