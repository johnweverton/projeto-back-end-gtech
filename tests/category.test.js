const { api, resetDatabase, closeDatabase, createUserAndToken } = require('./helpers');

describe('Categorias', () => {
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const createCategory = (data) => api().post('/v1/category').set(auth()).send(data);

  beforeEach(async () => {
    await resetDatabase();
    token = await createUserAndToken();
  });

  afterAll(closeDatabase);

  it('POST cria categoria (201) com use_in_menu padrão false', async () => {
    const { body } = await createCategory({ name: 'Shoes', slug: 'shoes' }).expect(201);
    expect(body).toEqual({ id: 1, name: 'Shoes', slug: 'shoes', use_in_menu: false });
  });

  it('POST retorna 400 para dados inválidos ou slug duplicado e exige token', async () => {
    await createCategory({ name: '', slug: 'Slug Inválido' }).expect(400);
    await createCategory({ name: 'Shoes', slug: 'shoes' }).expect(201);
    await createCategory({ name: 'Outra', slug: 'shoes' }).expect(400);
    await api().post('/v1/category').send({ name: 'X', slug: 'x' }).expect(400);
    await api().post('/v1/category').set('Authorization', 'Bearer x').send({ name: 'X', slug: 'x' }).expect(401);
  });

  it('GET /:id retorna 200 e 404', async () => {
    await createCategory({ name: 'Shoes', slug: 'shoes', use_in_menu: true }).expect(201);
    const { body } = await api().get('/v1/category/1').expect(200);
    expect(body).toEqual({ id: 1, name: 'Shoes', slug: 'shoes', use_in_menu: true });
    await api().get('/v1/category/99').expect(404);
  });

  describe('GET /search', () => {
    beforeEach(async () => {
      for (let i = 1; i <= 15; i += 1) {
        await createCategory({ name: `Categoria ${i}`, slug: `categoria-${i}`, use_in_menu: i % 2 === 0 }).expect(201);
      }
    });

    it('pagina com limit padrão 12', async () => {
      const { body } = await api().get('/v1/category/search').expect(200);
      expect(body).toMatchObject({ total: 15, limit: 12, page: 1 });
      expect(body.data).toHaveLength(12);
    });

    it('respeita page e limit=-1', async () => {
      const page2 = await api().get('/v1/category/search?limit=10&page=2').expect(200);
      expect(page2.body.data).toHaveLength(5);
      expect(page2.body.data[0].id).toBe(11);

      const all = await api().get('/v1/category/search?limit=-1').expect(200);
      expect(all.body.data).toHaveLength(15);
      expect(all.body.limit).toBe(-1);
    });

    it('filtra por use_in_menu e limita campos', async () => {
      const { body } = await api().get('/v1/category/search?use_in_menu=true&fields=name,slug').expect(200);
      expect(body.total).toBe(7);
      expect(body.data[0]).toEqual({ name: 'Categoria 2', slug: 'categoria-2' });
    });

    it('retorna 400 para parâmetros inválidos', async () => {
      await api().get('/v1/category/search?limit=abc').expect(400);
      await api().get('/v1/category/search?page=0').expect(400);
      await api().get('/v1/category/search?fields=senha').expect(400);
      await api().get('/v1/category/search?use_in_menu=talvez').expect(400);
    });
  });

  it('PUT atualiza (204), valida (400) e retorna 404', async () => {
    await createCategory({ name: 'Shoes', slug: 'shoes' }).expect(201);
    await api().put('/v1/category/1').set(auth()).send({ name: 'Tênis', use_in_menu: true }).expect(204);
    const { body } = await api().get('/v1/category/1').expect(200);
    expect(body).toMatchObject({ name: 'Tênis', use_in_menu: true });

    await api().put('/v1/category/1').set(auth()).send({ use_in_menu: 'sim' }).expect(400);
    await api().put('/v1/category/99').set(auth()).send({ name: 'X' }).expect(404);
  });

  it('DELETE remove (204) e retorna 404 depois', async () => {
    await createCategory({ name: 'Shoes', slug: 'shoes' }).expect(201);
    await api().delete('/v1/category/1').set(auth()).expect(204);
    await api().delete('/v1/category/1').set(auth()).expect(404);
  });
});
