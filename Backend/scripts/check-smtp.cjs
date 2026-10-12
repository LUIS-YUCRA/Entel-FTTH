require('../src/config/env');
const { getTransporter } = require('../src/utils/MailService');
(async () => {
  let transporter;
  try {
    console.log('SMTP:', process.env.SMTP_HOST, 'puerto:', process.env.SMTP_PORT);
    console.log('Usuario:', process.env.SMTP_USER || process.env.EMAIL_USER);
    transporter = getTransporter();
    await transporter.verify();
    console.log('OK: conexión SMTP y autenticación aceptadas. No se envió ningún correo.');
  } catch (error) {
    console.error('Falló SMTP:', error.code || 'CONFIG', error.command || '', error.message);
    process.exitCode = 1;
  } finally {
    transporter?.close();
  }
})();