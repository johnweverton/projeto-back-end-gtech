const fs = require('fs');
const request = require('supertest');
const app = require('../src/app');
const { sequelize } = require('../src/models');

const api = () => request(app);

/** PNG 1x1 em base64 para os testes de upload. */
const PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function resetDatabase() {
  await sequelize.sync({ force: true });
}

async function closeDatabase() {
  await sequelize.close();
  fs.rmSync(process.env.UPLOAD_DIR, { recursive: true, force: true });
}

/** Cadastra um usuário e retorna um token JWT válido. */
async function createUserAndToken(email = 'admin@mail.com') {
  await api()
    .post('/v1/user')
    .send({ firstname: 'Admin', surname: 'Teste', email, password: '123@123', confirmPassword: '123@123' })
    .expect(201);
  const { body } = await api().post('/v1/user/token').send({ email, password: '123@123' }).expect(200);
  return body.token;
}

module.exports = { api, PNG_BASE64, resetDatabase, closeDatabase, createUserAndToken };
