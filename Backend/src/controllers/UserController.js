const User = require('../models/User');
const { isAllowedEmail, EMAIL_DOMAIN_MESSAGE } = require('../middleware/ValidationMiddleware');
const { query } = require('../config/db');
const { removeAccount } = require('../services/AccountRemovalService');

const audit = (actorId, action, entityId, details = {}) => query(
  `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
   VALUES ($1,$2,'USER',$3,$4)`,
  [actorId, action, String(entityId), JSON.stringify(details)],
);

const list = async (req, res, next) => {
  try {
    res.json({ success: true, users: await User.findAll() });
  } catch (error) {
    next(error);
  }
};

const get = async (req, res, next) => {
  try {
    const user = await User.findProfileById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    return res.json({ success: true, user });
  } catch (error) {
    return next(error);
  }
};

const create = async (req, res, next) => {
  try {
    const { fullName, email, password, userType } = req.body;
    if (!['operador', 'tecnico'].includes(userType)) return res.status(400).json({ message: 'Solo se pueden crear operadores o técnicos' });
    const parameter = userType === 'operador' ? 'MAX_OPERADORES' : 'MAX_TECNICOS';
    const limitResult = await query('SELECT value FROM system_parameters WHERE key = $1', [parameter]);
    const limit = limitResult.rows[0]?.value ?? (userType === 'operador' ? 5 : 4);
    const count = await query('SELECT COUNT(*)::int AS total FROM users WHERE user_type = $1 AND is_active = TRUE', [userType]);
    if (count.rows[0].total >= limit) return res.status(409).json({ message: `Se alcanzó el límite máximo de usuarios para este rol` });
    if (!isAllowedEmail(email, userType)) return res.status(400).json({ message: EMAIL_DOMAIN_MESSAGE });
    if (await User.findByEmail(email)) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }
    const user = await User.create({ fullName, email, password, userType });
    if (['tecnico', 'cliente'].includes(userType)) {
      await User.updateOwnProfile(user.id, req.body, userType);
    }
    await audit(req.user.id, 'CREAR_USUARIO', user.id, { role: user.user_type });
    return res.status(201).json({ success: true, user });
  } catch (error) {
    if (error.code === '23505') return res.status(409).json({ message: 'No se puede crear otra cuenta de administrador o el correo ya está registrado' });
    return next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const existing = await User.findById(req.params.id);
    if (!existing) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (req.body.userType && req.body.userType !== existing.user_type) return res.status(400).json({ message: 'El rol de una cuenta existente no puede cambiarse desde el perfil.' });
    if (existing.user_type === 'administrador' && req.body.isActive === true && !existing.is_active) {
      const active = await query("SELECT id FROM users WHERE user_type = 'administrador' AND is_active = TRUE AND id <> $1", [existing.id]);
      if (active.rows.length) return res.status(409).json({message:'Ya existe un administrador activo. No se puede activar otra cuenta administradora.'});
    }
    if (Number(req.params.id) === Number(req.user.id) && req.body.isActive === false) {
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }
    let user = await User.update(req.params.id, req.body);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    if (['tecnico', 'cliente'].includes(user.user_type)) {
      user = await User.updateOwnProfile(user.id, req.body, user.user_type);
    }
    await audit(req.user.id, 'ACTUALIZAR_USUARIO', user.id, req.body);
    return res.json({ success: true, user });
  } catch (error) {
    return next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const password = String(req.body.password || '');
    if (password.length < 8
      || !/[A-Z]/.test(password) || !/[a-z]/.test(password)
      || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
      return res.status(400).json({ message: 'La contraseña no cumple los requisitos de seguridad' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    await User.updatePassword(user.id, password);
    await audit(req.user.id, 'RESTABLECER_PASSWORD', user.id);
    return res.json({ success: true, message: 'Contraseña restablecida y sesiones cerradas' });
  } catch (error) {
    return next(error);
  }
};

const deactivate = async (req, res, next) => {
  try {
    if (Number(req.params.id) === Number(req.user.id)) {
      return res.status(400).json({ message: 'No puedes desactivar tu propia cuenta' });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    await User.delete(user.id);
    await query('DELETE FROM sessions WHERE user_id = $1', [user.id]);
    await audit(req.user.id, 'DESACTIVAR_USUARIO', user.id);
    return res.json({ success: true });
  } catch (error) {
    return next(error);
  }
};

const photo = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    const value = await User.getProfilePhoto(user.id);
    if (!value?.profile_photo) return res.status(404).json({ message: 'Foto no registrada' });
    res.set('Content-Type', value.profile_photo_mime || 'image/jpeg');
    res.set('Cache-Control', 'private, max-age=300');
    return res.send(value.profile_photo);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    return res.json(await removeAccount(req.params.id, req.user.id));
  } catch (error) {
    if (error.status) return res.status(error.status).json({message:error.message});
    return next(error);
  }
};

module.exports = {
  list, get, create, update, resetPassword, deactivate, photo, remove,
};
