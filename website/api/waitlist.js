import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body;

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  try {
    // Send notification to yourself about new waitlist signup
    await resend.emails.send({
      from: 'Anime Filler Checker <onboarding@resend.dev>',
      to: 'nehirakbass@gmail.com',
      subject: '🎉 New Waitlist Signup!',
      html: `
        <h2>New Waitlist Signup</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
        <p style="font-size: 12px; color: #666;">You can copy this email for your launch announcement list.</p>
      `,
    });

    // Send confirmation email to the user
    await resend.emails.send({
      from: 'Anime Filler Checker <onboarding@resend.dev>',
      to: email,
      subject: '✨ You\'re on the waitlist!',
      html: `
        <h2>Thanks for joining!</h2>
        <p>We'll notify you as soon as Anime Filler Checker launches on Chrome and Firefox.</p>
        <p>In the meantime, check out the project on <a href="https://github.com/nehirakbass/anime-filler-checker">GitHub</a>.</p>
        <br>
        <p style="color: #666; font-size: 12px;">— Nehir Akbaş</p>
      `,
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Resend error:', error);
    return res.status(500).json({ error: 'Failed to subscribe' });
  }
}
