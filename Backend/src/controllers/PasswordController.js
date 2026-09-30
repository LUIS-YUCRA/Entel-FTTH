const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendRecoveryEmail } = require('../utils/MailService');

const allowedRecoveryDomain = (user, email) => {
  const domain = email.split('@')[1];
  if (user.user_type === 'cliente') return domain === 'gmail.com';
  return ['tecnico', 'operador', 'administrador'].includes(user.user_type)
    && domain === 'entel.bo';
};

const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@(gmail\.com|entel\.bo)$/.test(email)) {
      return res.status(400).json({
        message: 'Utiliza un correo @gmail.com para clientes o @entel.bo para personal',
      });
    }

    const user = await User.findByEmail(email);
    if (!user || !user.is_active) {
      return res.status(404).json({
        message: 'No existe una cuenta activa registrada con ese correo',
      });
    }

    if (!allowedRecoveryDomain(user, email)) {
      return res.status(400).json({
        message: 'El dominio del correo no corresponde al tipo de usuario registrado',
      });
    }

    const token = jwt.sign(
      { userId: user.id, type: 'password-reset' },
      process.env.JWT_SECRET,
      { expiresIn: '15m' },
    );
    const delivery = await sendRecoveryEmail(email, token);
    console.log('Correo de recuperación aceptado por SMTP:', {
      messageId: delivery.messageId,
      accepted: delivery.accepted,
      rejected: delivery.rejected,
      response: delivery.response,
      requestId: delivery.requestId,
    });

    return res.json({
      success: true,
      message: `Correo aceptado por Gmail para ${email}.`,
      expiresInMinutes: 15,
      deliveryId: delivery.requestId,
    });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'La contraseña debe tener al menos 8 caracteres' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.type !== 'password-reset') throw new Error('Tipo de token inválido');
    await User.updatePassword(decoded.userId, password);
    return res.json({ success: true, message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    return res.status(400).json({ message: 'Token inválido o expirado' });
  }
};

module.exports = { forgotPassword, resetPassword };
