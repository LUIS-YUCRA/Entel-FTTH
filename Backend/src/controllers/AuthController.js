const User = require('../models/User');
const { isAllowedEmail, EMAIL_DOMAIN_MESSAGE } = require('../middleware/ValidationMiddleware');
const { query } = require('../config/db');
const {
  generateToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwtHelper');

const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_MAX_ATTEMPTS = 5;
const loginKey = (req) => `${String(req.body.email || '').trim().toLowerCase()}|${req.ip}`;
const activeAttempt = (key) => {
  const attempt = loginAttempts.get(key);
  if (attempt && Date.now() - attempt.startedAt < LOGIN_WINDOW_MS) return attempt;
  loginAttempts.delete(key);
  return null;
};
const auditLogin = (actorId, action, email, req) => query(
  `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, details)
   VALUES ($1,$2,'SESION',$3,$4::jsonb)`,
  [actorId, action, email, JSON.stringify({ ip: req.ip, userAgent: req.get('user-agent') || null })],
).catch(() => {});

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const key = loginKey(req);
    const previousAttempt = activeAttempt(key);
    if (previousAttempt?.count >= LOGIN_MAX_ATTEMPTS) {
      res.set('Retry-After', String(Math.ceil(
        (LOGIN_WINDOW_MS - (Date.now() - previousAttempt.startedAt)) / 1000,
      )));
      return res.status(429).json({
        message: 'Demasiados intentos fallidos. Espera 15 minutos antes de volver a intentarlo.',
      });
    }
    const user = await User.findByEmail(email);
    const valid = user
      && user.is_active
      && await User.verifyPassword(password, user.password);

    if (!valid) {
      const attempt = previousAttempt || { count: 0, startedAt: Date.now() };
      attempt.count += 1;
      loginAttempts.set(key, attempt);
      await auditLogin(user?.id || null, 'LOGIN_FALLIDO', String(email).toLowerCase(), req);
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    loginAttempts.delete(key);

    const token = generateToken(user);
    const refreshToken = generateRefreshToken(user);
    await User.updateLastLogin(user.id);
    await query('DELETE FROM sessions WHERE expires_at <= NOW()');
    await query(
      `INSERT INTO sessions (user_id, token, refresh_token, expires_at)
       VALUES ($1,$2,$3,NOW() + INTERVAL '7 days')`,
      [user.id, token, refreshToken],
    );
    await auditLogin(user.id, 'LOGIN_EXITOSO', user.email, req);

    const { password: omitted, ...safeUser } = user;
    return res.json({ success: true, token, refreshToken, user: safeUser });
  } catch (error) {
    return next(error);
  }
};

const register = async (req, res, next) => {
  try {
    const { fullName, email, password, serviceNumber } = req.body;
    if (await User.findByEmail(email)) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }
    const user = await User.create({ fullName, email, password, userType: 'cliente', serviceNumber });
    return res.status(201).json({ success: true, user });
  } catch (error) {
    return next(error);
  }
};

const getProfile = async (req, res) => {
  res.json({ success: true, user: await User.findProfileById(req.user.id) });
};

const updateProfile = async (req, res, next) => {
  try {
    const fullName = String(req.body.fullName ?? '').trim();
    if (req.body.fullName !== undefined && fullName.length < 3) {
      return res.status(400).json({ message: 'El nombre completo debe tener al menos 3 caracteres' });
    }
    if (req.user.user_type === 'tecnico' && req.body.maxActiveTickets !== undefined) {
      const maximum = Number(req.body.maxActiveTickets);
      if (!Number.isInteger(maximum) || maximum < 1 || maximum > 30) {
        return res.status(400).json({ message: 'La carga máxima debe ser un número entero entre 1 y 30' });
      }
    }
    const email = String(req.body.email || req.user.email).trim().toLowerCase();
    if (!isAllowedEmail(email, req.user.user_type)) {
      return res.status(400).json({
        message: EMAIL_DOMAIN_MESSAGE,
      });
    }
    const existing = await User.findByEmail(email);
    if (existing && Number(existing.id) !== Number(req.user.id)) {
      return res.status(409).json({ message: 'El correo ya está registrado' });
    }
    const user = await User.updateOwnProfile(req.user.id, { ...req.body, fullName }, req.user.user_type);
    return res.json({ success: true, user });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ message: 'El correo o código de empleado ya está registrado' });
    }
    return next(error);
  }
};

const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'Selecciona una imagen válida' });

    const bytes = req.file.buffer;
    const isJpeg = bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    const isPng = bytes.length > 8 && bytes.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    const isWebp = bytes.length > 12
      && bytes.subarray(0, 4).toString('ascii') === 'RIFF'
      && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    if (!isJpeg && !isPng && !isWebp) {
      return res.status(400).json({ message: 'La imagen debe ser JPG, PNG o WebP' });
    }

    await User.updateProfilePhoto(req.user.id, bytes, req.file.mimetype);
    const user = await User.findProfileById(req.user.id);
    return res.json({ success: true, user });
  } catch (error) {
    return next(error);
  }
};

const getProfilePhoto = async (req, res, next) => {
  try {
    const photo = await User.getProfilePhoto(req.user.id);
    if (!photo?.profile_photo) return res.status(404).json({ message: 'El usuario no registró una foto' });
    res.set({
      'Content-Type': photo.profile_photo_mime || 'image/jpeg',
      'Content-Length': photo.profile_photo.length,
      'Cache-Control': 'private, no-store, max-age=0',
      Vary: 'Authorization',
    });
    return res.send(photo.profile_photo);
  } catch (error) {
    return next(error);
  }
};

const getUserProfilePhoto = async (req, res, next) => {
  try {
    const photo = await User.getProfilePhoto(req.params.id);
    if (!photo?.profile_photo) return res.status(404).json({ message: 'Foto no registrada' });
    res.set('Content-Type', photo.profile_photo_mime || 'image/jpeg');
    res.set('Cache-Control', 'private, no-store, max-age=0');
    res.set('Vary', 'Authorization');
    return res.send(photo.profile_photo);
  } catch (error) {
    return next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    await query('DELETE FROM sessions WHERE user_id = $1 AND token = $2', [req.user.id, token]);
    return res.json({ success: true, message: 'Sesión cerrada' });
  } catch (error) {
    return next(error);
  }
};

const activity = async (req, res, next) => {
  try {
    await query('UPDATE sessions SET last_activity_at = NOW() WHERE id = $1', [req.sessionId]);
    return res.json({ success: true });
  } catch (error) { return next(error); }
};

const refreshToken = async (req, res, next) => {
  try {
    const decoded = verifyRefreshToken(req.body.refreshToken);
    const user = await User.findById(decoded.userId);
    const session = user && await query(
      `SELECT id FROM sessions
       WHERE user_id = $1 AND refresh_token = $2 AND expires_at > NOW()
         AND ($3::boolean = FALSE OR last_activity_at > NOW() - INTERVAL '2 minutes')`,
      [user.id, req.body.refreshToken, user.user_type === 'administrador'],
    );
    if (!user?.is_active || !session?.rows[0]) {
      return res.status(401).json({ message: 'Refresh token inválido' });
    }
    const token = generateToken(user);
    await query('UPDATE sessions SET token = $1 WHERE id = $2', [token, session.rows[0].id]);
    return res.json({ success: true, token });
  } catch (error) {
    return res.status(401).json({ message: 'Refresh token inválido o expirado' });
  }
};

module.exports = {
  activity, login, register, getProfile, updateProfile, uploadProfilePhoto,
  getProfilePhoto, getUserProfilePhoto, logout, refreshToken,
};
