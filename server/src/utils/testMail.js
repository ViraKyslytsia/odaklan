require('dotenv').config();
const { transporter, buildHtml } = require('./mailer');

async function main() {
    const to = process.argv[2];
    if (!to) {
        console.log('Usage: node src/utils/testMail.js your@email.com');
        return;
    }
    if (!transporter) {
        console.log('SMTP is not configured: SMTP_USER or SMTP_PASS is missing in .env');
        return;
    }

    console.log('1) Checking connection to the mail server...');
    await transporter.verify();
    console.log('   OK: connected and logged in');

    console.log('2) Sending a test email...');
    await transporter.sendMail({
        from: process.env.MAIL_FROM || process.env.SMTP_USER,
        to,
        subject: 'odaklan: test email',
        text: 'Test code: 123456',
        html: buildHtml('123456'),
    });
    console.log(`   OK: email sent to ${to}`);
}

main().catch((err) => {
    console.error('FAILED:', err.code || '', err.message);
});