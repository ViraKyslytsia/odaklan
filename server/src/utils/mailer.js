const nodemailer = require('nodemailer');

const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const port = Number(process.env.SMTP_PORT || 587);

const transporter = hasSmtp
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port,
        secure: port === 465,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    })
    : null;

function buildHtml(code) {
    return `
  <div style="font-family:Arial,sans-serif;background:#FAF9F7;padding:32px;">
    <div style="max-width:420px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;text-align:center;">
      <h2 style="color:#6D5BFF;margin:0 0 8px;">odaklan</h2>
      <p style="color:#444444;margin:0 0 24px;">Your verification code</p>
      <div style="font-size:36px;letter-spacing:8px;font-weight:bold;color:#222222;margin-bottom:24px;">${code}</div>
      <p style="color:#888888;font-size:13px;margin:0;">This code expires in 10 minutes. If you did not sign up, just ignore this email.</p>
    </div>
  </div>`;
}

async function sendCode(to, code) {
    if (!transporter) {
        console.log(`[DEV] Verification code for ${to}: ${code}`);
        return;
    }

    try {
        await transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to,
            subject: 'odaklan: your verification code',
            text: `Your verification code is ${code}. It expires in 10 minutes.`,
            html: buildHtml(code),
        });
        console.log(`Verification email sent to ${to}`);
    } catch (err) {
        console.error(`Email sending failed (${err.code || 'no code'}): ${err.message}`);
        throw err;
    }
}

module.exports = { sendCode, buildHtml, transporter };