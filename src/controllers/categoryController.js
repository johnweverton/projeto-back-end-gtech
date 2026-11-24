/**
 * Controllers de categoria.
 */
const categoryService = require('../services/categoryService');
const { parseId } = require('../utils/validators');

const NOT_FOUND = 'Categoria não encontrada';

async function search(req, res) {
  res.status(200).json(await categoryService.search(req.query));
}

async function show(req, res) {
  res.status(200).json(await categoryService.findById(parseId(req.params.id, NOT_FOUND)));
}

async function store(req, res) {
  const category = await categoryService.create(req.body);
  res.status(201).location(`/v1/category/${category.id}`).json(category);
}

async function update(req, res) {
  await categoryService.update(parseId(req.params.id, NOT_FOUND), req.body);
  res.status(204).end();
}

async function destroy(req, res) {
  await categoryService.remove(parseId(req.params.id, NOT_FOUND));
  res.status(204).end();
}

module.exports = { search, show, store, update, destroy };
