/**
 * Regras de negócio de categorias.
 */
const { Category } = require('../models');
const HttpError = require('../utils/HttpError');
const { Validator, assertBody } = require('../utils/validators');
const { parsePagination, parseFields, parseBoolean } = require('../utils/query');

const FIELDS = ['id', 'name', 'slug', 'use_in_menu'];

const toResponse = (category) => ({
  id: category.id,
  name: category.name,
  slug: category.slug,
  use_in_menu: Boolean(category.use_in_menu),
});

function validate(data, { partial = false } = {}) {
  assertBody(data);
  new Validator()
    .string(data, 'name', { partial })
    .slug(data, 'slug', { partial })
    .boolean(data, 'use_in_menu')
    .throwIfInvalid();
}

async function ensureSlugAvailable(slug, ignoreId) {
  const existing = await Category.findOne({ where: { slug } });
  if (existing && existing.id !== ignoreId) {
    throw HttpError.badRequest('Dados da requisição inválidos', [{ field: 'slug', message: 'Slug já cadastrado' }]);
  }
}

/** GET /v1/category/search */
async function search(query) {
  const { limit, page, offset, all } = parsePagination(query);
  const fields = parseFields(query.fields, FIELDS);
  const useInMenu = parseBoolean(query.use_in_menu, 'use_in_menu');

  const where = {};
  if (useInMenu !== undefined) where.use_in_menu = useInMenu;

  // Busca apenas as colunas pedidas (o id é sempre lido para ordenação estável).
  const attributes = fields ? Array.from(new Set(['id', ...fields])) : FIELDS;

  const { rows, count } = await Category.findAndCountAll({
    where,
    attributes,
    order: [['id', 'ASC']],
    ...(all ? {} : { limit, offset }),
  });

  const data = rows.map((row) => {
    const item = toResponse(row);
    return fields ? Object.fromEntries(fields.map((field) => [field, item[field]])) : item;
  });

  return { data, total: count, limit, page };
}

async function findById(id) {
  const category = await Category.findByPk(id);
  if (!category) throw HttpError.notFound('Categoria não encontrada');
  return toResponse(category);
}

async function create(data) {
  validate(data);
  await ensureSlugAvailable(data.slug);
  const category = await Category.create({
    name: data.name.trim(),
    slug: data.slug,
    use_in_menu: data.use_in_menu ?? false,
  });
  return toResponse(category);
}

async function update(id, data) {
  const category = await Category.findByPk(id);
  if (!category) throw HttpError.notFound('Categoria não encontrada');
  validate(data, { partial: true });

  const changes = {};
  if (data.name !== undefined) changes.name = data.name.trim();
  if (data.slug !== undefined) {
    await ensureSlugAvailable(data.slug, category.id);
    changes.slug = data.slug;
  }
  if (data.use_in_menu !== undefined) changes.use_in_menu = data.use_in_menu;

  if (Object.keys(changes).length === 0) {
    throw HttpError.badRequest('Informe ao menos um campo para atualizar: name, slug ou use_in_menu');
  }
  await category.update(changes);
}

async function remove(id) {
  const deleted = await Category.destroy({ where: { id } });
  if (!deleted) throw HttpError.notFound('Categoria não encontrada');
}

module.exports = { search, findById, create, update, remove, FIELDS };
