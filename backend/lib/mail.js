const nodemailer = require('nodemailer');
const tz = process.env.TIMEZONE || 'America/Denver';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendMail({ to, subject, html, text }) {
  return transporter.sendMail({
    from: process.env.MAIL_FROM,
    to, subject, text, html
  });
}

module.exports = { sendMail, tz };