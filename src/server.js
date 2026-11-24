/**
 * Ponto de entrada: valida a conexão com o banco e sobe o servidor HTTP.
 */
const app = require('./app');
const { sequelize } = require('./models');
const { port } = require('./config/env');

async function start() {
  try {
    await sequelize.authenticate();
    console.log(`Banco de dados conectado (${sequelize.getDialect()})`);

    app.listen(port, () => {
      console.log(`API rodando em http://localhost:${port}`);
      console.log(`Documentação em http://localhost:${port}/docs`);
    });
  } catch (error) {
    console.error('Error in start server:', error);
    process.exit(1);
  }
}

start();
