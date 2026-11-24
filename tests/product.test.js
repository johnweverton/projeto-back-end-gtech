const fs = require('fs');
const path = require('path');
const { api, PNG_BASE64, resetDatabase, closeDatabase, createUserAndToken } = require('./helpers');
const { ProductCategory, ProductImage, ProductOption } = require('../src/models');

const uploadedFile = (url) => path.join(process.env.UPLOAD_DIR, url.replace('http://test.local/media/', ''));

describe('Produtos', () => {
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  const productPayload = (overrides = {}) => ({
    enabled: true,
    name: 'Produto 01',
    slug: 'produto-01',
    stock: 10,
    description: 'Descrição do produto 01',
    price: 119.9,
    price_with_discount: 99.9,
    category_ids: [1, 2],
    images: [
      { type: 'image/png', content: PNG_BASE64 },
      { type: 'image/png', content: `data:image/png;base64,${PNG_BASE64}` },
    ],
    options: [
      { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', value: ['PP', 'GG', 'M'] },
      { title: 'Cor', shape: 'circle', type: 'color', values: ['#000', '#333'] },
    ],
    ...overrides,
  });

  const createProduct = (data) => api().post('/v1/product').set(auth()).send(data);

  beforeEach(async () => {
    await resetDatabase();
    token = await createUserAndToken();
    for (const [name, slug] of [
      ['Tênis', 'tenis'],
      ['Ofertas', 'ofertas'],
      ['Casual', 'casual'],
    ]) {
      await api().post('/v1/category').set(auth()).send({ name, slug }).expect(201);
    }
  });

  afterAll(closeDatabase);

  describe('POST /v1/product', () => {
    it('cria produto com categorias, imagens e opções (201)', async () => {
      const { body } = await createProduct(productPayload()).expect(201);

      expect(body).toMatchObject({
        id: 1,
        enabled: true,
        name: 'Produto 01',
        slug: 'produto-01',
        stock: 10,
        price: 119.9,
        price_with_discount: 99.9,
        category_ids: [1, 2],
      });
      expect(body.images).toHaveLength(2);
      expect(body.images[0].content).toMatch(/^http:\/\/test\.local\/media\/products\/1\/.+\.png$/);
      expect(fs.existsSync(uploadedFile(body.images[0].content))).toBe(true);
      expect(body.options).toEqual([
        { id: 1, title: 'Tamanho', shape: 'square', radius: 4, type: 'text', values: ['PP', 'GG', 'M'] },
        { id: 2, title: 'Cor', shape: 'circle', radius: 0, type: 'color', values: ['#000', '#333'] },
      ]);
    });

    it('a imagem salva é servida em /media', async () => {
      const { body } = await createProduct(productPayload()).expect(201);
      const mediaPath = body.images[0].content.replace('http://test.local', '');
      await api().get(mediaPath).expect(200).expect('Content-Type', /image\/png/);
    });

    it('retorna 400 para dados inválidos', async () => {
      await createProduct({ name: 'Sem preço', slug: 'sem-preco' }).expect(400);
      await createProduct(productPayload({ category_ids: [99] })).expect(400);
      await createProduct(productPayload({ images: [{ type: 'image/bmp', content: PNG_BASE64 }] })).expect(400);
      await createProduct(productPayload({ images: [{ type: 'image/png', content: '%%%' }] })).expect(400);
      await createProduct(productPayload({ options: [{ title: 'Cor', shape: 'triangle', values: ['a'] }] })).expect(400);
    });

    it('não grava nada quando a criação falha', async () => {
      await createProduct(productPayload({ slug: 'duplicado' })).expect(201);
      await createProduct(productPayload({ slug: 'duplicado' })).expect(400);
      expect(await ProductImage.count()).toBe(2);
    });

    it('exige token (400 sem cabeçalho, 401 inválido)', async () => {
      await api().post('/v1/product').send(productPayload()).expect(400);
      await api().post('/v1/product').set('Authorization', 'Bearer x').send(productPayload()).expect(401);
    });
  });

  describe('GET /v1/product/:id', () => {
    it('retorna 200 e 404', async () => {
      await createProduct(productPayload()).expect(201);
      const { body } = await api().get('/v1/product/1').expect(200);
      expect(body.category_ids).toEqual([1, 2]);
      await api().get('/v1/product/999').expect(404);
    });
  });

  describe('GET /v1/product/search', () => {
    beforeEach(async () => {
      await createProduct(productPayload({ images: [] })).expect(201);
      await createProduct(
        productPayload({
          name: 'Tênis Corrida',
          slug: 'tenis-corrida',
          description: 'Leve',
          price: 300,
          category_ids: [1],
          images: [],
          options: [{ title: 'Tamanho', values: ['40', '41'] }],
        }),
      ).expect(201);
      await createProduct(
        productPayload({ name: 'Boné', slug: 'bone', description: 'Aba reta', price: 50, category_ids: [3], images: [], options: [] }),
      ).expect(201);
    });

    it('lista com paginação padrão', async () => {
      const { body } = await api().get('/v1/product/search').expect(200);
      expect(body).toMatchObject({ total: 3, limit: 12, page: 1 });
      expect(body.data).toHaveLength(3);
    });

    it('filtra por match (nome ou descrição)', async () => {
      const byName = await api().get('/v1/product/search').query({ match: 'Tênis' }).expect(200);
      expect(byName.body.data.map((p) => p.slug)).toEqual(['tenis-corrida']);
      const byDescription = await api().get('/v1/product/search?match=aba').expect(200);
      expect(byDescription.body.data.map((p) => p.slug)).toEqual(['bone']);
    });

    it('filtra por category_ids e price-range', async () => {
      const byCategory = await api().get('/v1/product/search?category_ids=2,3').expect(200);
      expect(byCategory.body.data.map((p) => p.slug)).toEqual(['produto-01', 'bone']);

      const byPrice = await api().get('/v1/product/search?price-range=100-300').expect(200);
      expect(byPrice.body.data.map((p) => p.slug)).toEqual(['produto-01', 'tenis-corrida']);
    });

    it('filtra por option[id]=valores', async () => {
      // opção 3 = Tamanho do "Tênis Corrida" (40, 41)
      const found = await api().get('/v1/product/search?option[3]=41,42').expect(200);
      expect(found.body.data.map((p) => p.slug)).toEqual(['tenis-corrida']);
      const none = await api().get('/v1/product/search?option[3]=GG').expect(200);
      expect(none.body.total).toBe(0);
    });

    it('limita campos com fields e pagina', async () => {
      const { body } = await api().get('/v1/product/search?fields=name,price&limit=2&page=2').expect(200);
      expect(body).toMatchObject({ total: 3, limit: 2, page: 2 });
      expect(body.data).toEqual([{ name: 'Boné', price: 50 }]);
    });

    it('retorna 400 para filtros inválidos', async () => {
      await api().get('/v1/product/search?price-range=300-100').expect(400);
      await api().get('/v1/product/search?price-range=abc').expect(400);
      await api().get('/v1/product/search?category_ids=a,b').expect(400);
      await api().get('/v1/product/search?fields=senha').expect(400);
      await api().get('/v1/product/search?option=1').expect(400);
    });
  });

  describe('PUT /v1/product/:id', () => {
    it('atualiza campos, categorias, imagens e opções (204)', async () => {
      const created = (await createProduct(productPayload()).expect(201)).body;
      const [keepImage, removeImage] = created.images;

      await api()
        .put('/v1/product/1')
        .set(auth())
        .send({
          name: 'Produto 01 atualizado',
          slug: 'produto-01-atualizado',
          stock: 20,
          price: 49.9,
          price_with_discount: 0,
          category_ids: [3],
          images: [
            { type: 'image/png', content: PNG_BASE64 },
            { id: removeImage.id, deleted: true },
            { id: keepImage.id, content: keepImage.content },
          ],
          options: [
            { id: 1, deleted: true },
            { id: 2, radius: '10px', value: ['42/43', '44/45'] },
            { title: 'Tipo', shape: 'square', type: 'text', values: ['100% algodão', '65% algodão'] },
          ],
        })
        .expect(204);

      const { body } = await api().get('/v1/product/1').expect(200);
      expect(body).toMatchObject({ name: 'Produto 01 atualizado', stock: 20, price: 49.9, price_with_discount: 0, category_ids: [3] });
      expect(body.images.map((image) => image.id)).toEqual([keepImage.id, 3]);
      expect(fs.existsSync(uploadedFile(removeImage.content))).toBe(false);
      expect(body.options).toEqual([
        { id: 2, title: 'Cor', shape: 'circle', radius: 10, type: 'color', values: ['42/43', '44/45'] },
        { id: 3, title: 'Tipo', shape: 'square', radius: 0, type: 'text', values: ['100% algodão', '65% algodão'] },
      ]);
    });

    it('substitui o arquivo quando a imagem recebe novo base64', async () => {
      const created = (await createProduct(productPayload()).expect(201)).body;
      const image = created.images[0];
      await api()
        .put('/v1/product/1')
        .set(auth())
        .send({ images: [{ id: image.id, content: PNG_BASE64 }] })
        .expect(204);
      const { body } = await api().get('/v1/product/1').expect(200);
      expect(body.images[0].id).toBe(image.id);
      expect(body.images[0].content).not.toBe(image.content);
      expect(fs.existsSync(uploadedFile(image.content))).toBe(false);
    });

    it('retorna 400 para dados inválidos e 404 para inexistente', async () => {
      await createProduct(productPayload()).expect(201);
      await api().put('/v1/product/1').set(auth()).send({ price: 'caro' }).expect(400);
      await api().put('/v1/product/1').set(auth()).send({ images: [{ id: 999, deleted: true }] }).expect(400);
      await api().put('/v1/product/1').set(auth()).send({}).expect(400);
      await api().put('/v1/product/999').set(auth()).send({ name: 'X' }).expect(404);
    });
  });

  describe('DELETE /v1/product/:id', () => {
    it('remove produto, relações e arquivos (204) e depois retorna 404', async () => {
      const created = (await createProduct(productPayload()).expect(201)).body;
      await api().delete('/v1/product/1').set(auth()).expect(204);

      expect(await ProductImage.count()).toBe(0);
      expect(await ProductOption.count()).toBe(0);
      expect(await ProductCategory.count()).toBe(0);
      expect(fs.existsSync(uploadedFile(created.images[0].content))).toBe(false);
      await api().delete('/v1/product/1').set(auth()).expect(404);
    });
  });
});
