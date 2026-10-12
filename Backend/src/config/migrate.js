require('./env');
const fs = require('fs');
const path = require('path');
const { pool } = require('./db');

const run = async () => {
  const sqlDirectory = path.resolve(__dirname, '../../sql');
  const migrations = fs.readdirSync(sqlDirectory)
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const migration of migrations) {
    const sql = fs.readFileSync(path.join(sqlDirectory, migration), 'utf8');
    await pool.query(sql);
  }
  console.log('Migración PostgreSQL completada');
  await pool.end();
};

run().catch(async (error) => {
  console.error('Error de migración:', error.message);
  await pool.end();
  process.exitCode = 1;
});
