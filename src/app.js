/**
 * Configura a aplicação Express (middlewares, rotas, documentação e erros).
 * Separado do server.js para permitir testes com supertest sem abrir porta.
 */
const express = require('express');
const cors = require('cors');
const qs = require('qs');
const swaggerUi = require('swagger-ui-express');
const routes = require('./routes');
const openapi = require('./docs/openapi');
const { uploadDir } = require('./config/env');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const app = express();

// Suporta filtros como option[45]=GG,PP. `parseArrays: false` mantém { 45: 'GG,PP' }
// (sem isso o qs converteria índices numéricos em array).
app.set('query parser', (queryString) => qs.parse(queryString, { parseArrays: false }));

app.use(cors());
// Limite maior para aceitar imagens em base64 no cadastro de produtos.
app.use(express.json({ limit: '10mb' }));

app.get('/', (_req, res) => {
  res.json({ name: 'Digital Store API', version: '1.0.0', docs: '/docs' });
});

app.get('/docs.json', (_req, res) => res.json(openapi));
app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: 'Digital Store API — Docs' }));

// Imagens dos produtos
app.use('/media', express.static(uploadDir, { fallthrough: true }));

app.use('/v1', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
