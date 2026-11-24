/**
 * Configuração do banco usada pelo Sequelize e pelo sequelize-cli (migrations/seeders).
 * O dialeto padrão é MySQL; SQLite fica disponível para desenvolvimento rápido e testes.
 */
require('dotenv').config({ quiet: true });

const dialect = process.env.DB_DIALECT || 'mysql';

const common = {
  dialect,
  logging: false,
  define: {
    underscored: true, // createdAt → created_at
    timestamps: true,
  },
};

const connection =
  dialect === 'sqlite'
    ? { storage: process.env.DB_STORAGE || './database.sqlite' }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 3306,
        database: process.env.DB_NAME || 'digital_store',
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
      };

module.exports = {
  development: { ...common, ...connection },
  production: { ...common, ...connection },
  test: { ...common, dialect: 'sqlite', storage: ':memory:' },
};
