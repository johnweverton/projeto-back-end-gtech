/**
 * Centraliza a leitura das variáveis de ambiente (.env) com valores padrão.
 */
const path = require('path');
require('dotenv').config({ quiet: true });

const env = process.env.NODE_ENV || 'development';

module.exports = {
  env,
  port: Number(process.env.PORT) || 3000,
  baseUrl: process.env.BASE_URL || '',
  jwt: {
    secret: process.env.JWT_SECRET || 'digital-store-dev-secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h',
  },
  uploadDir: path.resolve(process.env.UPLOAD_DIR || 'uploads'),
};
