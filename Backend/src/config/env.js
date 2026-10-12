const path = require('path');
const dotenv = require('dotenv');
// Load the single Backend/.env regardless of the process working directory.
// Existing server process variables retain priority.
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });
// Mail configuration belongs to the single .env, avoiding stale hosting placeholders.
const fs = require('node:fs');
const envFile = path.resolve(__dirname, '../../.env');
if (fs.existsSync(envFile)) {
  const values = dotenv.parse(fs.readFileSync(envFile));
  for (const key of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASSWORD', 'EMAIL_USER', 'EMAIL_PASS']) {
    if (Object.hasOwn(values, key)) process.env[key] = values[key];
  }
}