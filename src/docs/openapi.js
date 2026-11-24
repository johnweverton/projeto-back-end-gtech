/**
 * Especificação OpenAPI 3 da API, servida em /docs (Swagger UI) e /docs.json.
 */
const errorResponse = (description) => ({
  description,
  content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
});

const responses = {
  BadRequest: errorResponse('Dados da requisição incorretos ou cabeçalho Authorization ausente'),
  Unauthorized: errorResponse('Token de autorização inválido ou expirado'),
  NotFound: errorResponse('Recurso não encontrado'),
};

const idParam = (resource) => ({
  name: 'id',
  in: 'path',
  required: true,
  description: `ID do ${resource}`,
  schema: { type: 'integer', minimum: 1 },
});

const paginationParams = [
  {
    name: 'limit',
    in: 'query',
    description: 'Itens por página. Use -1 para retornar todos.',
    schema: { type: 'integer', default: 12 },
  },
  {
    name: 'page',
    in: 'query',
    description: 'Página (ignorado quando limit=-1).',
    schema: { type: 'integer', default: 1 },
  },
];

const jsonBody = (schema, example) => ({
  required: true,
  content: { 'application/json': { schema, ...(example && { example }) } },
});

const secured = [{ bearerAuth: [] }];

module.exports = {
  openapi: '3.0.3',
  info: {
    title: 'Digital Store API',
    version: '1.0.0',
    description:
      'API REST da Digital Store. Endpoints POST, PUT e DELETE (exceto cadastro de usuário e geração de token) exigem o cabeçalho `Authorization: Bearer <jwt>`.\n\n' +
      'Para testar: gere um token em **POST /v1/user/token** e clique em **Authorize**.',
  },
  servers: [{ url: '/', description: 'Servidor atual' }],
  tags: [
    { name: 'Usuários', description: 'CRUD de usuários e autenticação' },
    { name: 'Categorias', description: 'CRUD de categorias' },
    { name: 'Produtos', description: 'CRUD de produtos, imagens e opções' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
    },
    responses,
    schemas: {
      Error: {
        type: 'object',
        properties: {
          message: { type: 'string', example: 'Dados da requisição inválidos' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: { field: { type: 'string' }, message: { type: 'string' } },
            },
          },
        },
      },
      User: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', format: 'email', example: 'user@mail.com' },
        },
      },
      UserCreate: {
        type: 'object',
        required: ['firstname', 'surname', 'email', 'password', 'confirmPassword'],
        properties: {
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', format: 'email', example: 'user@mail.com' },
          password: { type: 'string', minLength: 6, example: '123@123' },
          confirmPassword: { type: 'string', example: '123@123' },
        },
      },
      UserUpdate: {
        type: 'object',
        properties: {
          firstname: { type: 'string', example: 'user firstname' },
          surname: { type: 'string', example: 'user surname' },
          email: { type: 'string', format: 'email', example: 'user@mail.com' },
        },
      },
      TokenRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@digitalstore.com' },
          password: { type: 'string', example: '123@123' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      CategoryInput: {
        type: 'object',
        required: ['name', 'slug'],
        properties: {
          name: { type: 'string', example: 'Shoes' },
          slug: { type: 'string', example: 'shoes' },
          use_in_menu: { type: 'boolean', example: true },
        },
      },
      ProductOption: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          title: { type: 'string', example: 'Tamanho' },
          shape: { type: 'string', enum: ['square', 'circle'], example: 'square' },
          radius: { type: 'integer', example: 4 },
          type: { type: 'string', enum: ['text', 'color'], example: 'text' },
          values: { type: 'array', items: { type: 'string' }, example: ['39', '40', '41'] },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 1 },
          enabled: { type: 'boolean', example: true },
          name: { type: 'string', example: 'Produto 01' },
          slug: { type: 'string', example: 'produto-01' },
          stock: { type: 'integer', example: 10 },
          description: { type: 'string', example: 'Descrição do produto 01' },
          price: { type: 'number', example: 119.9 },
          price_with_discount: { type: 'number', example: 99.9 },
          category_ids: { type: 'array', items: { type: 'integer' }, example: [1, 2] },
          images: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer', example: 1 },
                content: { type: 'string', example: 'http://localhost:3000/media/products/1/image.png' },
              },
            },
          },
          options: { type: 'array', items: { $ref: '#/components/schemas/ProductOption' } },
        },
      },
      ProductCreate: {
        type: 'object',
        required: ['name', 'slug', 'price', 'price_with_discount'],
        properties: {
          enabled: { type: 'boolean' },
          name: { type: 'string' },
          slug: { type: 'string' },
          use_in_menu: { type: 'boolean' },
          stock: { type: 'integer' },
          description: { type: 'string' },
          price: { type: 'number' },
          price_with_discount: { type: 'number' },
          category_ids: { type: 'array', items: { type: 'integer' } },
          images: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'content'],
              properties: {
                type: { type: 'string', example: 'image/png' },
                content: { type: 'string', description: 'Imagem em base64 (aceita data URI)' },
              },
            },
          },
          options: {
            type: 'array',
            items: {
              type: 'object',
              required: ['title', 'values'],
              properties: {
                title: { type: 'string' },
                shape: { type: 'string', enum: ['square', 'circle'] },
                radius: { oneOf: [{ type: 'integer' }, { type: 'string', example: '4px' }] },
                type: { type: 'string', enum: ['text', 'color'] },
                values: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      SearchMeta: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 10 },
          limit: { type: 'integer', example: 12 },
          page: { type: 'integer', example: 1 },
        },
      },
    },
  },
  paths: {
    '/v1/user/token': {
      post: {
        tags: ['Usuários'],
        summary: 'Gera um token JWT',
        requestBody: jsonBody({ $ref: '#/components/schemas/TokenRequest' }),
        responses: {
          200: {
            description: 'Token gerado',
            content: {
              'application/json': {
                schema: { type: 'object', properties: { token: { type: 'string' } } },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/v1/user': {
      post: {
        tags: ['Usuários'],
        summary: 'Cadastra um usuário',
        requestBody: jsonBody({ $ref: '#/components/schemas/UserCreate' }),
        responses: {
          201: {
            description: 'Usuário criado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/v1/user/{id}': {
      parameters: [idParam('usuário')],
      get: {
        tags: ['Usuários'],
        summary: 'Obtém um usuário pelo ID',
        responses: {
          200: {
            description: 'Usuário encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/User' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Usuários'],
        summary: 'Atualiza um usuário',
        security: secured,
        requestBody: jsonBody({ $ref: '#/components/schemas/UserUpdate' }),
        responses: {
          204: { description: 'Atualizado' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Usuários'],
        summary: 'Remove um usuário',
        security: secured,
        responses: {
          204: { description: 'Removido' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v1/category/search': {
      get: {
        tags: ['Categorias'],
        summary: 'Lista categorias',
        parameters: [
          ...paginationParams,
          {
            name: 'fields',
            in: 'query',
            description: 'Campos retornados, separados por vírgula (id,name,slug,use_in_menu)',
            schema: { type: 'string', example: 'name,slug' },
          },
          {
            name: 'use_in_menu',
            in: 'query',
            description: 'Filtra categorias exibidas no menu',
            schema: { type: 'boolean' },
          },
        ],
        responses: {
          200: {
            description: 'Lista paginada',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    {
                      type: 'object',
                      properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Category' } } },
                    },
                    { $ref: '#/components/schemas/SearchMeta' },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/v1/category': {
      post: {
        tags: ['Categorias'],
        summary: 'Cadastra uma categoria',
        security: secured,
        requestBody: jsonBody({ $ref: '#/components/schemas/CategoryInput' }),
        responses: {
          201: {
            description: 'Categoria criada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/v1/category/{id}': {
      parameters: [idParam('categoria')],
      get: {
        tags: ['Categorias'],
        summary: 'Obtém uma categoria pelo ID',
        responses: {
          200: {
            description: 'Categoria encontrada',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Category' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Categorias'],
        summary: 'Atualiza uma categoria',
        security: secured,
        requestBody: jsonBody({ $ref: '#/components/schemas/CategoryInput' }),
        responses: {
          204: { description: 'Atualizada' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Categorias'],
        summary: 'Remove uma categoria',
        security: secured,
        responses: {
          204: { description: 'Removida' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
    '/v1/product/search': {
      get: {
        tags: ['Produtos'],
        summary: 'Lista produtos com filtros',
        parameters: [
          ...paginationParams,
          {
            name: 'fields',
            in: 'query',
            description: 'Campos retornados, separados por vírgula',
            schema: { type: 'string', example: 'name,images,price' },
          },
          {
            name: 'match',
            in: 'query',
            description: 'Termo buscado no nome ou na descrição',
            schema: { type: 'string', example: 'Tênis' },
          },
          {
            name: 'category_ids',
            in: 'query',
            description: 'IDs de categorias separados por vírgula',
            schema: { type: 'string', example: '1,2' },
          },
          {
            name: 'price-range',
            in: 'query',
            description: 'Faixa de preço (campo price) no formato min-max',
            schema: { type: 'string', example: '100-200' },
          },
          {
            name: 'option',
            in: 'query',
            description: 'Filtro por valores de uma opção: option[<id>]=valor1,valor2',
            style: 'deepObject',
            explode: true,
            schema: { type: 'object', additionalProperties: { type: 'string' }, example: { 1: '40,41' } },
          },
        ],
        responses: {
          200: {
            description: 'Lista paginada',
            content: {
              'application/json': {
                schema: {
                  allOf: [
                    {
                      type: 'object',
                      properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Product' } } },
                    },
                    { $ref: '#/components/schemas/SearchMeta' },
                  ],
                },
              },
            },
          },
          400: { $ref: '#/components/responses/BadRequest' },
        },
      },
    },
    '/v1/product': {
      post: {
        tags: ['Produtos'],
        summary: 'Cadastra um produto',
        security: secured,
        requestBody: jsonBody(
          { $ref: '#/components/schemas/ProductCreate' },
          {
            enabled: true,
            name: 'Produto 01',
            slug: 'produto-01',
            stock: 10,
            description: 'Descrição do produto 01',
            price: 119.9,
            price_with_discount: 99.9,
            category_ids: [1, 2],
            images: [
              {
                type: 'image/png',
                content:
                  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
              },
            ],
            options: [
              { title: 'Tamanho', shape: 'square', radius: '4px', type: 'text', values: ['PP', 'M', 'GG'] },
              { title: 'Cor', shape: 'circle', type: 'color', values: ['#000', '#333'] },
            ],
          },
        ),
        responses: {
          201: {
            description: 'Produto criado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
        },
      },
    },
    '/v1/product/{id}': {
      parameters: [idParam('produto')],
      get: {
        tags: ['Produtos'],
        summary: 'Obtém um produto pelo ID',
        responses: {
          200: {
            description: 'Produto encontrado',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Product' } } },
          },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      put: {
        tags: ['Produtos'],
        summary: 'Atualiza um produto',
        description:
          'Atualização parcial. Em `images` e `options`: itens sem `id` são criados, itens com `id` são atualizados e itens com `{ "id": X, "deleted": true }` são removidos. Uma imagem com `content` igual à URL atual é mantida; com base64, é substituída.',
        security: secured,
        requestBody: jsonBody({ $ref: '#/components/schemas/ProductCreate' }, {
          name: 'Produto 01 atualizado',
          price: 49.9,
          price_with_discount: 0,
          images: [{ id: 2, deleted: true }],
          options: [{ id: 1, radius: '10px', values: ['42/43', '44/45'] }],
        }),
        responses: {
          204: { description: 'Atualizado' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
      delete: {
        tags: ['Produtos'],
        summary: 'Remove um produto',
        security: secured,
        responses: {
          204: { description: 'Removido' },
          400: { $ref: '#/components/responses/BadRequest' },
          401: { $ref: '#/components/responses/Unauthorized' },
          404: { $ref: '#/components/responses/NotFound' },
        },
      },
    },
  },
};
