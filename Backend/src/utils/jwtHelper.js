const { randomUUID } = require('node:crypto');
const jwt = require('jsonwebtoken');

const requireSecret = (name) => {
  if (!process.env[name]) throw new Error(`Falta la variable ${name}`);
  return process.env[name];
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
  const decoded = jwt.verify(token, requireSecret('JWT_SECRET'));
  if (decoded.type !== 'access') throw new Error('Tipo de token inválido');
  return decoded;
};

const generateRefreshToken = (user) => jwt.sign(
  { userId: user.id, type: 'refresh' },
  requireSecret('JWT_REFRESH_SECRET'),
  { expiresIn: '7d', jwtid: randomUUID() },
);

const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, requireSecret('JWT_REFRESH_SECRET'));
  if (decoded.type !== 'refresh') throw new Error('Tipo de token inválido');
  return decoded;
};

module.exports = {
  generateToken,
  verifyToken,
  generateRefreshToken,
  verifyRefreshToken,
};
