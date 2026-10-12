const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');

const requireSecret = (name) => {
  if (!process.env[name]) throw new Error(`Falta la variable ${name}`);
  return process.env[name];
};

const validateJwtConfiguration = () => {
  const access = requireSecret('JWT_SECRET');
  const refresh = requireSecret('JWT_REFRESH_SECRET');
  if (process.env.NODE_ENV === 'production') {
    if ([access, refresh].some(value => value.length < 32 || /cambia_por|example|changeme/i.test(value))) {
      throw new Error('Producción requiere claves JWT aleatorias de al menos 32 caracteres, sin valores de ejemplo.');
    }
    if (access === refresh) throw new Error('JWT_SECRET y JWT_REFRESH_SECRET deben ser diferentes.');
  }
};

const generateToken = (user) => jwt.sign(
  {
    userId: user.id,
    email: user.email,
    userType: user.user_type,
    fullName: user.full_name,
    type: 'access',
  },
  requireSecret('JWT_SECRET'),
  { expiresIn: process.env.JWT_EXPIRES_IN || '24h', jwtid: randomUUID() },
);

const verifyToken = (token) => {
  const decoded = jwt.verify(token, requireSecret('JWT_SECRET'), { algorithms: ['HS256'] });
  if (decoded.type !== 'access') throw new Error('Tipo de token inválido');
  return decoded;
};

const generateRefreshToken = (user) => jwt.sign(
  { userId: user.id, type: 'refresh' },
  requireSecret('JWT_REFRESH_SECRET'),
  { expiresIn: '7d', jwtid: randomUUID() },
);

const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, requireSecret('JWT_REFRESH_SECRET'), { algorithms: ['HS256'] });
  if (decoded.type !== 'refresh') throw new Error('Tipo de token inválido');
  return decoded;
};

module.exports = {
  validateJwtConfiguration,
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
};
