# Digital Store API | Projeto Final de Back-end

API REST da **Digital Store**, desenvolvida conforme o [escopo oficial do projeto](https://github.com/digitalcollegebr/projeto-backend).

## Equipe

- John Weverton

## Tecnologias

| Tecnologia | Uso |
|---|---|
| **Node.js + Express 5** | Servidor HTTP e rotas da API |
| **Sequelize + sequelize-cli** | ORM, migrations e seeders |
| **MySQL** (padrão) / SQLite | Banco de dados. SQLite é opcional, para rodar sem instalar MySQL |
| **JWT** (`jsonwebtoken`) | Autenticação das rotas POST, PUT e DELETE |
| **bcrypt** | Hash das senhas |
| **Dotenv** | Configuração por variáveis de ambiente |
| **Swagger UI** (OpenAPI 3) | Documentação interativa em `/docs` |
| **Jest + Supertest** | Testes automatizados (44 testes) |
| **Nodemon** | Recarregamento automático em desenvolvimento |

## Estrutura (MVC + Services)

```
├── src/
│   ├── config/          # env.js (variáveis) e database.js (Sequelize/CLI)
│   ├── controllers/     # Recebem a requisição e devolvem a resposta HTTP
│   ├── database/
│   │   ├── migrations/  # Criação das 6 tabelas
│   │   └── seeders/     # Dados de demonstração
│   ├── docs/openapi.js  # Especificação Swagger/OpenAPI
│   ├── middleware/      # auth (JWT) e errorHandler (erros centralizados)
│   ├── models/          # Models Sequelize e associações
│   ├── routes/          # Rotas /v1/user, /v1/category, /v1/product
│   ├── services/        # Regras de negócio e acesso ao banco
│   ├── utils/           # HttpError, validações e parsing de query strings
│   ├── app.js           # Configuração do Express
│   └── server.js        # Inicialização do servidor
├── tests/               # Testes Jest + Supertest
├── uploads/             # Imagens dos produtos (servidas em /media)
├── .env.example
└── docker-compose.yml   # MySQL pronto para uso
```

## Como rodar

Pré-requisito: **Node.js 20+**.

### 1. Instalar e configurar

```bash
npm install
cp .env.example .env     # no Windows: copy .env.example .env
```

### 2. Banco de dados

**Opção A — MySQL (padrão)**

Se você tem Docker, suba o MySQL com:

```bash
docker compose up -d
```

Ou use um MySQL local e ajuste `DB_HOST`, `DB_USER`, `DB_PASSWORD` e `DB_NAME` no `.env`. Depois crie o banco, se necessário:

```bash
npx sequelize-cli db:create
```

**Opção B — SQLite (sem instalar)**

No `.env`, defina:

```env
DB_DIALECT=sqlite
DB_STORAGE=./database.sqlite
```

### 3. Migrations e dados de exemplo

```bash
npm run db:migrate    # cria as tabelas
npm run db:seed       # usuário, categorias e produtos de exemplo
```

### 4. Iniciar

```bash
npm run dev           # desenvolvimento (nodemon)
npm start             # produção
```

- API: http://localhost:3000
- Documentação Swagger: **http://localhost:3000/docs**
- Login de exemplo (seed): `admin@digitalstore.com` / `123@123`

### Outros comandos

```bash
npm test                # testes (SQLite em memória, não precisa de banco)
npm run lint            # ESLint
npm run db:migrate:undo # desfaz todas as migrations
npm run db:reset        # desfaz, recria e popula o banco
```

## Banco de dados

```
users                 categories              products
─────────────         ──────────────          ─────────────────────
id (PK)               id (PK)                 id (PK)
firstname             name                    enabled
surname               slug (único)            name
email (único)         use_in_menu (índice)    slug (único)
password (bcrypt)     created_at              use_in_menu
created_at            updated_at              stock
updated_at                                    description
                                              price (índice)
                                              price_with_discount
                                              created_at / updated_at

product_images        product_options         product_categories (N:N)
──────────────        ───────────────         ────────────────────────
id (PK)               id (PK)                 product_id  (PK, FK → products)
product_id (FK)       product_id (FK)         category_id (PK, FK → categories)
enabled               title
path                  shape (square|circle)
                      radius
                      type (text|color)
                      values ("P,M,G")
```

- As chaves estrangeiras usam `ON DELETE CASCADE`: remover um produto ou categoria limpa as relações.
- Há índices nas colunas usadas pelos filtros da busca (`use_in_menu`, `price`, `product_id`, `category_id`).

## Endpoints

Base: `/v1`. Os endpoints marcados com 🔒 exigem o cabeçalho `Authorization: Bearer <jwt>`.

| Método | Rota | Descrição | Sucesso |
|---|---|---|---|
| POST | `/user/token` | Gera o token JWT | 200 |
| POST | `/user` | Cadastra usuário | 201 |
| GET | `/user/:id` | Busca usuário | 200 |
| PUT 🔒 | `/user/:id` | Atualiza usuário | 204 |
| DELETE 🔒 | `/user/:id` | Remove usuário | 204 |
| GET | `/category/search` | Lista categorias (`limit`, `page`, `fields`, `use_in_menu`) | 200 |
| GET | `/category/:id` | Busca categoria | 200 |
| POST 🔒 | `/category` | Cadastra categoria | 201 |
| PUT 🔒 | `/category/:id` | Atualiza categoria | 204 |
| DELETE 🔒 | `/category/:id` | Remove categoria | 204 |
| GET | `/product/search` | Lista produtos (`limit`, `page`, `fields`, `match`, `category_ids`, `price-range`, `option[id]`) | 200 |
| GET | `/product/:id` | Busca produto | 200 |
| POST 🔒 | `/product` | Cadastra produto com imagens (base64) e opções | 201 |
| PUT 🔒 | `/product/:id` | Atualiza produto, imagens e opções | 204 |
| DELETE 🔒 | `/product/:id` | Remove produto | 204 |

Os exemplos completos de payload e resposta estão no **Swagger** (`/docs`).

### Exemplo rápido

```bash
# 1. Gerar token
curl -X POST http://localhost:3000/v1/user/token \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@digitalstore.com","password":"123@123"}'

# 2. Criar categoria
curl -X POST http://localhost:3000/v1/category \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN>" \
  -d '{"name":"Shoes","slug":"shoes","use_in_menu":true}'

# 3. Buscar produtos
curl "http://localhost:3000/v1/product/search?match=Nike&price-range=100-900&fields=id,name,price"
```

## Respostas de erro

Todos os erros retornam JSON:

```json
{
  "message": "Dados da requisição inválidos",
  "errors": [{ "field": "email", "message": "E-mail inválido" }]
}
```

| Status | Quando |
|---|---|
| 400 | Dados inválidos, JSON malformado, query string inválida, e-mail ou slug duplicado, credenciais inválidas no `/user/token`, ou cabeçalho `Authorization` ausente |
| 401 | Token JWT inválido ou expirado |
| 404 | Recurso ou rota inexistente |

## Decisões de implementação

- **Autenticação:** a documentação pede `400` quando falta o token (Seção 05) e `401` quando ele é inválido (endpoints). A API segue as duas regras: cabeçalho ausente ou fora do formato `Bearer` retorna **400**, e token inválido ou expirado retorna **401**.
- **Rotas públicas:** `POST /v1/user` (cadastro) e `POST /v1/user/token` (login) não exigem token, senão seria impossível criar o primeiro usuário.
- **Imagens:** recebidas em base64 (também aceita data URI), salvas em `uploads/products/<id>/` e expostas em `/media/...`. O campo `content` da resposta traz a URL pública.
- **Atualização de produto:** em `images` e `options`, itens sem `id` são criados, itens com `id` são atualizados e `{ "id": X, "deleted": true }` remove o item. Uma imagem com `content` igual à URL atual é mantida.
- **Opções:** aceitam `values` ou `value` (os dois aparecem nos exemplos da documentação), como array. `radius` aceita `4` ou `"4px"`.
- **`price-range`:** filtra pelo campo `price`.
- **Transações:** criação, atualização e remoção de produtos rodam em transação. Se algo falhar, as imagens gravadas no disco são removidas.
