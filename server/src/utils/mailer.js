const nodemailer = require('nodemailer');

// Способы отправки (по приоритету):
// 1. Brevo HTTP API (BREVO_API_KEY): работает на Render, т.к. идёт по HTTPS (порт 443)
// 2. SMTP (SMTP_USER + SMTP_PASS): удобно локально, на бесплатном Render порты SMTP закрыты
// 3. Ничего не настроено: код печатается в консоль (режим разработки)
const BREVO_URL = 'https://api.brevo.com/v3/smtp/email';
const brevoKey = process.env.BREVO_API_KEY;

const hasSmtp = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
const port = Number(process.env.SMTP_PORT || 587);

const transporter =
    !brevoKey && hasSmtp
        ? nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port,
            secure: port === 465,
            auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        })
        : null;

// MAIL_FROM: "odaklan <me@example.com>" или просто "me@example.com".
// В Brevo адрес отправителя должен быть подтверждён (Senders, domains & dedicated IPs → Senders).
function parseSender() {
    const raw = (process.env.MAIL_FROM || process.env.SMTP_USER || '').trim();
    const m = raw.match(/^\s*"?(.*?)"?\s*<([^>]+)>\s*$/);
    if (m) return { name: m[1] || 'odaklan', email: m[2].trim() };
    return { name: 'odaklan', email: raw };
}

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

async function sendViaBrevo({ to, subject, text, html }) {
    const sender = parseSender();
    if (!sender.email) throw new Error('MAIL_FROM is not set (a verified Brevo sender is required)');

    const res = await fetch(BREVO_URL, {
        method: 'POST',
        headers: {
            'api-key': brevoKey,
            'content-type': 'application/json',
            accept: 'application/json',
        },
        body: JSON.stringify({
            sender,
            to: [{ email: to }],
            subject,
            textContent: text,
            htmlContent: html,
        }),
        signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
        const body = await res.text().catch(() => '');
        const err = new Error(`Brevo API ${res.status}: ${body.slice(0, 300)}`);
        err.code = `BREVO_${res.status}`;
        throw err;
    }
}

// Общая функция отправки письма, используется и для кода, и для проверочного скрипта
async function sendMail({ to, subject, text, html }) {
    if (brevoKey) return sendViaBrevo({ to, subject, text, html });
    if (transporter) {
        return transporter.sendMail({
            from: process.env.MAIL_FROM || process.env.SMTP_USER,
            to,
            subject,
            text,
            html,
        });
    }
    return null;
}

const isConfigured = () => Boolean(brevoKey || transporter);

async function sendCode(to, code) {
    if (!isConfigured()) {
        console.log(`[DEV] Verification code for ${to}: ${code}`);
        return;
    }

    try {
        await sendMail({
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

module.exports = { sendCode, sendMail, buildHtml, isConfigured, transporter };