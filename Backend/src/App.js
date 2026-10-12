const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/AuthRoutes');
const ticketRoutes = require('./routes/TicketRoutes');
const conversationRoutes = require('./routes/ConversationRoutes');
const evidenceRoutes = require('./routes/EvidenceRoutes');
const clientesRoutes = require('./routes/ClientesRoutes');
const passwordRoutes = require('./routes/PasswordRoutes');
const userRoutes = require('./routes/UserRoutes');
const dashboardRoutes = require('./routes/DashboardRoutes');
const notificationRoutes = require('./routes/NotificationRoutes');

const app = express();
app.disable('x-powered-by');
const allowedOrigins = [
  'https://servicioftth.com',
  'https://www.servicioftth.com',
  ...String(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim().replace(/\/$/, '')).filter(Boolean),
  'https://localhost:5173',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
];
const isPrivateNetworkOrigin = (origin) => {
  try {
    const { protocol, hostname, port } = new URL(origin);
    const privateIpv4 = /^(10(?:\.\d{1,3}){3}|192\.168(?:\.\d{1,3}){2}|172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2})$/;
    return protocol === 'http:' && ['5173', '4173'].includes(port)
      && (privateIpv4.test(hostname) || hostname === '127.0.0.1' || hostname === 'localhost');
  } catch {
    return false;
  }
};
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isPrivateNetworkOrigin(origin)) {
      return callback(null, true);
    }
    const error = new Error(`Origen no permitido por CORS: ${origin}`);
    error.status = 403;
    return callback(error);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'no-referrer',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Cache-Control': 'no-store',
  });
  next();
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/evidences', evidenceRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/password', passwordRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', async (req, res, next) => {
  try {
    const { query } = require('./config/db');
    const result = await query('SELECT CURRENT_TIMESTAMP AS now');
    res.json({ status: 'ok', database: 'connected', timestamp: result.rows[0].now });
  } catch (error) {
    next(error);
  }
});

app.get('/', (req, res) => {
  res.json({
    message: 'API Sistema FTTH ENTEL Bolivia',
    version: '1.0.0',
    status: 'running',
  });
});

app.use((req, res) => {
  res.status(404).json({
    error: 'Ruta no encontrada',
    message: `La ruta ${req.originalUrl} no existe`,
  });
});

app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(error.status || 500).json({
    error: 'Error interno del servidor',
    code: error.code === 'ASSISTANT_UNAVAILABLE' ? error.code : undefined,
    message: error.code === 'ASSISTANT_UNAVAILABLE' || process.env.NODE_ENV === 'development' ? error.message : 'Algo salió mal',
  });
});

module.exports = app;
