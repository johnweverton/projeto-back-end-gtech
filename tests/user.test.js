const jwt = require('jsonwebtoken');
const { api, resetDatabase, closeDatabase, createUserAndToken } = require('./helpers');
const { User } = require('../src/models');

const validUser = {
  firstname: 'user firstname',
  surname: 'user surname',
  email: 'user@mail.com',
  password: '123@123',
  confirmPassword: '123@123',
};

describe('Usuários', () => {
  let token;

  beforeEach(async () => {
    await resetDatabase();
    token = await createUserAndToken();
  });

  afterAll(closeDatabase);

  describe('POST /v1/user', () => {
    it('cadastra usuário (201) sem expor a senha e grava hash bcrypt', async () => {
      const { body } = await api().post('/v1/user').send(validUser).expect(201);
      expect(body).toEqual({ id: expect.any(Number), firstname: 'user firstname', surname: 'user surname', email: 'user@mail.com' });

      const stored = await User.scope('withPassword').findByPk(body.id);
      expect(stored.password).not.toBe('123@123');
      expect(stored.password).toMatch(/^\$2[aby]\$/);
    });

    it('retorna 400 quando as senhas não conferem', async () => {
      const { body } = await api().post('/v1/user').send({ ...validUser, confirmPassword: 'outra' }).expect(400);
      expect(body.errors).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'confirmPassword' })]));
    });

    it('retorna 400 para campos obrigatórios ausentes ou e-mail inválido', async () => {
      await api().post('/v1/user').send({ email: 'invalido' }).expect(400);
    });

    it('retorna 400 para e-mail duplicado', async () => {
      await api().post('/v1/user').send(validUser).expect(201);
      await api().post('/v1/user').send(validUser).expect(400);
    });

    it('retorna 400 para JSON malformado', async () => {
      await api().post('/v1/user').set('Content-Type', 'application/json').send('{"x":').expect(400);
    });
  });

  describe('GET /v1/user/:id', () => {
    it('retorna o usuário (200)', async () => {
      const { body } = await api().get('/v1/user/1').expect(200);
      expect(body).toEqual({ id: 1, firstname: 'Admin', surname: 'Teste', email: 'admin@mail.com' });
    });

    it('retorna 404 para usuário inexistente', async () => {
      await api().get('/v1/user/999').expect(404);
      await api().get('/v1/user/abc').expect(404);
    });
  });

  describe('PUT /v1/user/:id', () => {
    it('atualiza (204)', async () => {
      await api()
        .put('/v1/user/1')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstname: 'Novo', surname: 'Nome', email: 'novo@mail.com' })
        .expect(204);
      const { body } = await api().get('/v1/user/1').expect(200);
      expect(body.email).toBe('novo@mail.com');
    });

    it('retorna 400 para dados inválidos e 404 para inexistente', async () => {
      await api().put('/v1/user/1').set('Authorization', `Bearer ${token}`).send({ email: 'x' }).expect(400);
      await api().put('/v1/user/999').set('Authorization', `Bearer ${token}`).send({ firstname: 'A' }).expect(404);
    });
  });

  describe('DELETE /v1/user/:id', () => {
    it('remove (204) e depois retorna 404', async () => {
      await api().delete('/v1/user/1').set('Authorization', `Bearer ${token}`).expect(204);
      await api().delete('/v1/user/1').set('Authorization', `Bearer ${token}`).expect(404);
    });
  });

  describe('Autenticação', () => {
    it('POST /v1/user/token retorna 400 para credenciais inválidas', async () => {
      await api().post('/v1/user/token').send({ email: 'admin@mail.com', password: 'errada' }).expect(400);
      await api().post('/v1/user/token').send({}).expect(400);
    });

    it('token gerado contém o id do usuário', async () => {
      expect(jwt.decode(token)).toEqual(expect.objectContaining({ sub: 1, email: 'admin@mail.com' }));
    });

    it('rejeita com 400 quando o cabeçalho Authorization não é enviado', async () => {
      await api().put('/v1/user/1').send({ firstname: 'X' }).expect(400);
      await api().delete('/v1/user/1').set('Authorization', 'Token abc').expect(400);
    });

    it('rejeita com 401 quando o token é inválido ou expirado', async () => {
      await api().delete('/v1/user/1').set('Authorization', 'Bearer token-invalido').expect(401);
      const expired = jwt.sign({ sub: 1 }, process.env.JWT_SECRET, { expiresIn: -10 });
      await api().delete('/v1/user/1').set('Authorization', `Bearer ${expired}`).expect(401);
    });
  });
});
