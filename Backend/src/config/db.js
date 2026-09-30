const { Pool } = require('pg');
require('dotenv').config();

const requiredVariables = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]);

if (missingVariables.length > 0) {
  throw new Error(
    `Faltan variables de PostgreSQL: ${missingVariables.join(', ')}. ` +
    'Copia .env.example como .env y completa la configuración.'
  );
}

const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (error) => {
  console.error('Error inesperado en PostgreSQL:', error.message);
});

const query = async (text, params) => {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    if (process.env.DB_DEBUG === 'true') {
      console.log('Query ejecutada:', {
        duration: Date.now() - start,
        rows: result.rowCount,
      });
    }
    return result;
  } catch (error) {
    console.error('Error en query:', error.message);
    throw error;
  }
};

module.exports = { pool, query };
