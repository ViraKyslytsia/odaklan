require('dotenv').config();
const { sendMail, buildHtml, isConfigured, transporter } = require('./mailer');

async function main() {
    const to = process.argv[2];
    if (!to) {
        console.log('Usage: node src/utils/testMail.js your@email.com');
        return;
    }
    if (!isConfigured()) {
        console.log('Mail is not configured: set BREVO_API_KEY (or SMTP_USER and SMTP_PASS) in .env');
        return;
    }

    if (transporter) {
        console.log('1) Checking connection to the mail server...');
        await transporter.verify();
        console.log('   OK: connected and logged in');
    }

    console.log(`${transporter ? '2' : '1'}) Sending a test email...`);
    await sendMail({
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