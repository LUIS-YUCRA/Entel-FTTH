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
    ? [{ filename: 'entel-bolivia.webp', path: logoPath, cid: 'entel-logo', contentDisposition: 'inline' }]
    : [];
  return {
    to: email,
    subject: title,
    text: `${message}\n\nConsulta tu cuenta: ${notificationsUrl}`,
    html: `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#edf6fb;font-family:Arial,Helvetica,sans-serif;color:#173653;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#edf6fb;">
    <tr><td align="center" style="padding:28px 12px;">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #cce2ef;border-radius:16px;overflow:hidden;">
        <tr><td style="padding:24px 28px;background-color:#0088bc;background-image:linear-gradient(110deg,#0076b4,#00a3c7);color:#ffffff;">
          ${attachments.length ? '<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding:8px 18px;background-color:#ffffff;border-radius:8px;"><img src="cid:entel-logo" width="84" alt="ENTEL" style="display:block;width:84px;height:auto;border:0;"></td></tr></table>' : '<strong style="font-size:30px;color:#ffffff;">entel</strong>'}
          <p style="margin:16px 0 8px;font-size:12px;line-height:1.4;">Sistema de atención técnica FTTH</p>
          <h1 style="margin:0;font-size:22px;line-height:1.4;font-weight:bold;">${escapeHtml(title)}</h1>
        </td></tr>
        <tr><td style="padding:24px 28px 28px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
            <tr><td style="padding:20px 22px;border-left:4px solid #00a3d4;background-color:#f3f9fd;border-radius:8px;font-size:14px;line-height:1.75;word-break:break-word;">${escapeHtml(message).replaceAll('\n', '<br>')}</td></tr>
          </table>
          <p style="margin:24px 0 16px;font-size:13px;line-height:1.6;">Consulta el seguimiento, historial y datos de la visita desde el sistema ENTEL FTTH.</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td bgcolor="#007fba" style="border-radius:8px;">
            <a href="${escapeHtml(notificationsUrl)}" style="display:inline-block;padding:14px 22px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:bold;">Consultar notificaciones</a>
          </td></tr></table>
          <p style="margin:18px 0 0;font-size:11px;line-height:1.5;word-break:break-all;"><a href="${escapeHtml(notificationsUrl)}" style="color:#0076b4;">${escapeHtml(notificationsUrl)}</a></p>
        </td></tr>
        <tr><td style="padding:16px 28px;border-top:1px solid #d8e9f3;background-color:#f8fbfe;color:#6687a2;font-size:11px;line-height:1.5;">ENTEL Bolivia · Atención técnica de fibra óptica</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`,
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
