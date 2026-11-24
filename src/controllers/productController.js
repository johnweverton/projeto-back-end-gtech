/**
 * Controllers de produto.
 */
const productService = require('../services/productService');
const { parseId } = require('../utils/validators');
const { baseUrl: configuredBaseUrl } = require('../config/env');

const NOT_FOUND = 'Produto não encontrado';

/** URL base usada para montar o link público das imagens. */
const baseUrlOf = (req) => configuredBaseUrl || `${req.protocol}://${req.get('host')}`;

async function search(req, res) {
  res.status(200).json(await productService.search(req.query, baseUrlOf(req)));
}

async function show(req, res) {
  res.status(200).json(await productService.findById(parseId(req.params.id, NOT_FOUND), baseUrlOf(req)));
}

async function store(req, res) {
  const product = await productService.create(req.body, baseUrlOf(req));
  res.status(201).location(`/v1/product/${product.id}`).json(product);
}

async function update(req, res) {
  await productService.update(parseId(req.params.id, NOT_FOUND), req.body);
  res.status(204).end();
}

async function destroy(req, res) {
  await productService.remove(parseId(req.params.id, NOT_FOUND));
  res.status(204).end();
}

module.exports = { search, show, store, update, destroy };
