const { DateTime } = require('luxon');
const { sendMail, tz } = require('./mail');

function fmt(dtIso) {
  return DateTime.fromISO(dtIso, { zone: 'utc' }).setZone(tz).toFormat("ccc, LLL d yyyy 'at' hh:mm a z");
}

async function notifyAdminsOnSubmit({ invoice, user }) {
  const to = (process.env.ADMIN_NOTIFY_EMAILS || '').split(',').map(s=>s.trim()).filter(Boolean);
  if (!to.length) return;
  const subject = `[Invoice Submitted] ${user.name} — #${invoice.id} • ${invoice.total_formatted}`;
  const url = `${process.env.APP_BASE_URL}/admin/invoices/${invoice.id}`;
  const submittedAt = fmt(invoice.created_at);
  const text = `${user.name} submitted invoice #${invoice.id} (${invoice.total_formatted}) on ${submittedAt}.
Review: ${url}`;
  const html = `
    <p><b>${user.name}</b> submitted <b>Invoice #${invoice.id}</b> (${invoice.total_formatted}) on ${submittedAt}.</p>
    <p><a href="${url}">Review invoice</a></p>
  `;
  await sendMail({ to, subject, text, html });
}

async function notifyUserOnPaid({ invoice, user, paidBy }) {
  const subject = `[Paid] Invoice #${invoice.id} — ${invoice.total_formatted}`;
  const paidAt = fmt(invoice.paid_at);
  const text = `Your invoice #${invoice.id} was marked Paid on ${paidAt} by ${paidBy?.name || 'Admin'}.`;
  const html = `
    <p>Your <b>Invoice #${invoice.id}</b> (${invoice.total_formatted}) was marked <b>Paid</b> on ${paidAt} by ${paidBy?.name || 'Admin'}.</p>
  `;
  await sendMail({ to: user.email, subject, text, html });
}

module.exports = { notifyAdminsOnSubmit, notifyUserOnPaid };