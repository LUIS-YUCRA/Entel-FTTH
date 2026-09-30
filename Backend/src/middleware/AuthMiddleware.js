const { verifyToken } = require('../utils/jwtHelper');
const User = require('../models/User');
const { query } = require('../config/db');

const authenticate = async (req, res, next) => {
  try {
    // Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'Token no proporcionado'
      });
    }

    const token = authHeader.split(' ')[1];
    
    // Verificar token
    const decoded = verifyToken(token);
    const session = await query(
      `SELECT id, last_activity_at, (last_activity_at <= NOW() - INTERVAL '2 minutes') AS idle_expired FROM sessions
       WHERE user_id = $1 AND token = $2 AND expires_at > NOW()`,
      [decoded.userId, token],
    );
    if (!session.rows[0]) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'La sesión fue cerrada o expiró',
      });
    }
    
    // Verificar que el usuario existe
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'Usuario no encontrado'
      });
    }

    if (!user.is_active) {
      return res.status(401).json({
        error: 'Acceso denegado',
        message: 'Usuario inactivo'
      });
    }

    if (user.user_type === 'administrador' && session.rows[0].idle_expired) {
      await query('DELETE FROM sessions WHERE id = $1', [session.rows[0].id]);
      return res.status(401).json({ code: 'SESSION_IDLE', message: 'Tu sesión terminó tras 2 minutos de inactividad.' });
    }
    req.sessionId = session.rows[0].id;
    // Agregar usuario al request
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Acceso denegado',
      message: 'Token inválido o expirado'
    });
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.user_type)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para realizar esta acción'
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  authorize
};
