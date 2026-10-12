const nodemailer = require('nodemailer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

const getMailCredentials = () => ({
  user: process.env.SMTP_USER || process.env.EMAIL_USER,
  password: process.env.SMTP_PASSWORD || process.env.EMAIL_PASS,
});

const getTransporter = () => {
  const credentials = getMailCredentials();
  const required = ['SMTP_HOST', 'SMTP_PORT'];
  const missing = required.filter((name) => !process.env[name]);
  if (!credentials.user) missing.push('SMTP_USER o EMAIL_USER');
  if (!credentials.password) missing.push('SMTP_PASSWORD o EMAIL_PASS');
  if (missing.length) {
    throw new Error(`Falta configuración SMTP: ${missing.join(', ')}`);
  }
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: Number(process.env.SMTP_PORT) === 465,
    connectionTimeout: 20000,
    greetingTimeout: 20000,
    socketTimeout: 30000,
    auth: {
      user: credentials.user,
      pass: credentials.password,
    },
  });
};

const sendRecoveryEmail = async (email, token) => {
  const resetBase = process.env.NODE_ENV === 'production'
    ? 'https://servicioftth.com/reset-password'
    : 'http://localhost:5173/reset-password';
  const resetLink = `${resetBase}/${encodeURIComponent(token)}`;
  const credentials = getMailCredentials();
  const requestId = crypto.randomUUID();
  const requestedAt = new Date();
  const transporter = getTransporter();

  let delivery;
  try { delivery = await transporter.sendMail({
    from: `"ENTEL FTTH" <${credentials.user}>`,
    replyTo: credentials.user,
    to: email,
    subject: `Recuperación de contraseña ENTEL FTTH - ${requestedAt.toLocaleTimeString('es-BO')}`,
    text: [
      'Solicitaste restablecer la contraseña de tu cuenta ENTEL FTTH.',
      `Abre este enlace: ${resetLink}`,
      'El enlace expira en 15 minutos.',
      `Identificador de solicitud: ${requestId}`,
      'Si no realizaste esta solicitud, ignora este mensaje.',
    ].join('\n\n'),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#172033">
        <h2 style="color:#0076b9">Recuperación de contraseña</h2>
        <p>Solicitaste restablecer la contraseña de tu cuenta ENTEL FTTH.</p>
        <p>El enlace estará disponible durante 15 minutos.</p>
        <a href="${resetLink}" style="background:#0076b9;color:white;padding:12px 20px;
          text-decoration:none;border-radius:5px">Restablecer contraseña</a>
        <p style="margin-top:24px;font-size:12px;color:#687386">
          Solicitud: ${requestId}. Si no realizaste esta solicitud, ignora este mensaje.
        </p>
      </div>`,
    headers: {
      'X-Entity-Ref-ID': requestId,
    },
  }); } finally { transporter.close(); }

  const accepted = delivery.accepted?.some(
    (recipient) => String(recipient).toLowerCase() === email.toLowerCase(),
  );
  if (!accepted) {
    throw new Error(`El servidor SMTP no aceptó el destinatario ${email}`);
  }
  return {
    messageId: delivery.messageId,
    accepted: delivery.accepted,
    rejected: delivery.rejected,
    response: delivery.response,
    requestId,
  };
};

const isMailConfigured = () => {
  const credentials = getMailCredentials();
  return Boolean(
    process.env.SMTP_HOST && process.env.SMTP_PORT
    && credentials.user && credentials.password
  );
};

const buildNotificationEmail = (email, title, message) => {
  const frontendUrl = process.env.NODE_ENV === 'production'
    ? 'https://servicioftth.com'
    : 'http://localhost:5173';
  const notificationsUrl = `${frontendUrl}/notificaciones`;
  const logoPath = path.resolve(__dirname, '../../../Frontend/src/assets/entel_bolivia.webp');
  const attachments = fs.existsSync(logoPath)
    ? [{ filename: 'entel-bolivia.webp', path: logoPath, cid: 'entel-logo' }]
    : [];
  return {
    to: email,
    subject: title,
    text: `${message}\n\nConsulta tu cuenta: ${notificationsUrl}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:16px;line-height:1.6"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(message).replaceAll('\n', '<br>')}</p><a href="${escapeHtml(notificationsUrl)}">Consultar notificaciones</a></div>`,
    attachments,
  };
};

const sendNotificationEmail = async (email, title, message) => {
  const credentials = getMailCredentials();
  const transporter = getTransporter();
  let delivery;
  try { delivery = await transporter.sendMail({
    from: `"ENTEL FTTH" <${credentials.user}>`,
    replyTo: credentials.user,
    ...buildNotificationEmail(email, title, message),
  }); } finally { transporter.close(); }
  const accepted = delivery.accepted?.some(
    (recipient) => String(recipient).toLowerCase() === email.toLowerCase(),
  );
  if (!accepted) {
    throw new Error(`El servidor SMTP no aceptó el destinatario ${email}`);
  }
  return delivery;
};

module.exports = {
  sendRecoveryEmail, sendNotificationEmail, isMailConfigured, buildNotificationEmail, getTransporter,
};
