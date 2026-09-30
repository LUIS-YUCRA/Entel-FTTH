require('dotenv').config();
const User = require('../models/User');
const { pool } = require('./db');

const run = async () => {
  const required = ['ADMIN_NAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
  const missing = required.filter((name) => !process.env[name]);
  if (missing.length) throw new Error(`Faltan variables: ${missing.join(', ')}`);
  if (await User.findByEmail(process.env.ADMIN_EMAIL)) {
    console.log('El usuario administrador ya existe');
    return;
  }
  await User.create({
    fullName: process.env.ADMIN_NAME,
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    userType: 'administrador',
  });
  console.log('Administrador inicial creado');
};

run()
  .catch((error) => {
    console.error('No se pudo crear el administrador:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
