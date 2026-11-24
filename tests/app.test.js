const { api, closeDatabase } = require('./helpers');
const { parsePagination, parseFields, parseBoolean, parseIdList, pick } = require('../src/utils/query');

afterAll(closeDatabase);

describe('Aplicação', () => {
  it('GET / informa a API e a documentação', async () => {
    const { body } = await api().get('/').expect(200);
    expect(body).toMatchObject({ name: 'Digital Store API', docs: '/docs' });
  });

  it('serve a especificação OpenAPI', async () => {
    const { body } = await api().get('/docs.json').expect(200);
    expect(body.openapi).toMatch(/^3\./);
    expect(Object.keys(body.paths)).toEqual(expect.arrayContaining(['/v1/product/search', '/v1/user/token']));
  });

  it('retorna 404 em JSON para rotas inexistentes', async () => {
    const { body } = await api().get('/v1/nada').expect(404);
    expect(body.message).toMatch(/não encontrada/);
  });
});

describe('utils/query', () => {
  it('parsePagination aplica padrões e trata limit=-1', () => {
    expect(parsePagination({})).toEqual({ limit: 12, page: 1, offset: 0, all: false });
    expect(parsePagination({ limit: '5', page: '3' })).toEqual({ limit: 5, page: 3, offset: 10, all: false });
    expect(parsePagination({ limit: '-1', page: '9' })).toEqual({ limit: -1, page: 1, all: true });
    expect(() => parsePagination({ limit: '0' })).toThrow();
  });

  it('parseFields, parseBoolean, parseIdList e pick', () => {
    expect(parseFields('name, slug', ['name', 'slug'])).toEqual(['name', 'slug']);
    expect(() => parseFields('password', ['name'])).toThrow();
    expect(parseBoolean('true', 'x')).toBe(true);
    expect(parseBoolean('0', 'x')).toBe(false);
    expect(parseIdList('15,24', 'ids')).toEqual([15, 24]);
    expect(pick({ a: 1, b: 2 }, ['b'])).toEqual({ b: 2 });
  });
});
