/**
 * Regras de negócio de produtos: busca com filtros, CRUD, imagens e opções.
 */
const { Op } = require('sequelize');
const {
  sequelize,
  Product,
  ProductImage,
  ProductOption,
  ProductCategory,
  Category,
} = require('../models');
const HttpError = require('../utils/HttpError');
const { Validator, assertBody, isNonEmptyString } = require('../utils/validators');
const { parsePagination, parseFields, parseIdList, isInteger, pick } = require('../utils/query');
const imageStorage = require('./imageStorage');

const FIELDS = [
  'id',
  'enabled',
  'name',
  'slug',
  'stock',
  'description',
  'price',
  'price_with_discount',
  'category_ids',
  'images',
  'options',
];

const SHAPES = ['square', 'circle'];
const OPTION_TYPES = ['text', 'color'];

/* ------------------------------------------------------------------ */
/* Formatação                                                          */
/* ------------------------------------------------------------------ */

const splitValues = (values) =>
  String(values ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

const formatOption = (option) => ({
  id: option.id,
  title: option.title,
  shape: option.shape,
  radius: option.radius,
  type: option.type,
  values: splitValues(option.values),
});

/** Converte o model no formato de resposta da documentação. */
function toResponse(product, baseUrl) {
  return {
    id: product.id,
    enabled: Boolean(product.enabled),
    name: product.name,
    slug: product.slug,
    stock: product.stock,
    description: product.description,
    price: product.price,
    price_with_discount: product.price_with_discount,
    category_ids: (product.categories || []).map((category) => category.id).sort((a, b) => a - b),
    images: (product.images || [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((image) => ({ id: image.id, content: imageStorage.toUrl(image.path, baseUrl) })),
    options: (product.options || [])
      .slice()
      .sort((a, b) => a.id - b.id)
      .map(formatOption),
  };
}

/** Monta os includes necessários, carregando associações apenas quando pedidas em `fields`. */
function buildIncludes(fields) {
  const wants = (field) => !fields || fields.includes(field);
  const include = [];
  if (wants('images')) include.push({ model: ProductImage, as: 'images', separate: true });
  if (wants('options')) include.push({ model: ProductOption, as: 'options', separate: true });
  if (wants('category_ids')) {
    include.push({ model: Category, as: 'categories', attributes: ['id'], through: { attributes: [] } });
  }
  return include;
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

/** Normaliza o raio: aceita 4, "4" ou "4px". */
function parseRadius(value) {
  if (value === undefined || value === null || value === '') return undefined;
  const match = String(value).trim().match(/^(\d+)(px)?$/);
  return match ? Number(match[1]) : NaN;
}

/** Aceita `values` (ou `value`, como aparece em um exemplo da documentação) como array ou string "a,b". */
function readOptionValues(option) {
  const raw = option.values ?? option.value;
  if (raw === undefined) return undefined;
  const list = Array.isArray(raw) ? raw.map((item) => String(item).trim()) : splitValues(raw);
  return list;
}

function validateOption(option, index, validator, { isNew }) {
  const prefix = `options[${index}]`;
  if (!option || typeof option !== 'object') {
    validator.add(prefix, 'Deve ser um objeto');
    return;
  }
  if (!isNew && option.deleted === true) return;

  if (isNew || option.title !== undefined) {
    if (!isNonEmptyString(option.title)) validator.add(`${prefix}.title`, 'Campo obrigatório');
  }
  if (option.shape !== undefined && !SHAPES.includes(option.shape)) {
    validator.add(`${prefix}.shape`, 'Use "square" ou "circle"');
  }
  if (option.type !== undefined && !OPTION_TYPES.includes(option.type)) {
    validator.add(`${prefix}.type`, 'Use "text" ou "color"');
  }
  if (Number.isNaN(parseRadius(option.radius))) {
    validator.add(`${prefix}.radius`, 'Use um número inteiro, ex.: 4 ou "4px"');
  }

  const values = readOptionValues(option);
  if (isNew || values !== undefined) {
    if (!values || values.length === 0 || values.some((value) => !value)) {
      validator.add(`${prefix}.values`, 'Informe ao menos um valor');
    } else if (values.some((value) => value.includes(','))) {
      validator.add(`${prefix}.values`, 'Os valores não podem conter vírgula');
    }
  }
}

function validateImage(image, index, validator, { isNew }) {
  const prefix = `images[${index}]`;
  if (!image || typeof image !== 'object') {
    validator.add(prefix, 'Deve ser um objeto');
    return;
  }
  if (!isNew && image.deleted === true) return;

  if (isNew) {
    if (!imageStorage.isSupportedType(image.type)) {
      validator.add(`${prefix}.type`, 'Tipo obrigatório: image/png, image/jpeg, image/jpg, image/webp ou image/gif');
    }
    if (!isNonEmptyString(image.content)) validator.add(`${prefix}.content`, 'Conteúdo base64 obrigatório');
    return;
  }

  if (image.type !== undefined && !imageStorage.isSupportedType(image.type)) {
    validator.add(`${prefix}.type`, 'Tipo de imagem não suportado');
  }
  if (image.content !== undefined && !isNonEmptyString(image.content)) {
    validator.add(`${prefix}.content`, 'Deve ser base64 ou a URL atual da imagem');
  }
}

function validateProduct(data, { partial = false } = {}) {
  assertBody(data);
  const validator = new Validator()
    .boolean(data, 'enabled')
    .string(data, 'name', { partial })
    .slug(data, 'slug', { partial })
    .boolean(data, 'use_in_menu')
    .number(data, 'stock', { required: false, integer: true })
    .number(data, 'price', { partial })
    .number(data, 'price_with_discount', { partial });

  if (data.description !== undefined && data.description !== null && typeof data.description !== 'string') {
    validator.add('description', 'Deve ser um texto');
  }

  if (data.category_ids !== undefined) {
    const ids = data.category_ids;
    if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id) || id < 1)) {
      validator.add('category_ids', 'Deve ser uma lista de IDs inteiros');
    }
  }

  for (const [key, validateItem] of [
    ['images', validateImage],
    ['options', validateOption],
  ]) {
    if (data[key] === undefined) continue;
    if (!Array.isArray(data[key])) {
      validator.add(key, 'Deve ser uma lista');
      continue;
    }
    data[key].forEach((item, index) =>
      validateItem(item, index, validator, { isNew: !partial || item?.id === undefined }),
    );
  }

  validator.throwIfInvalid();
}

async function ensureCategoriesExist(categoryIds, transaction) {
  const unique = Array.from(new Set(categoryIds));
  if (unique.length === 0) return unique;
  const found = await Category.count({ where: { id: unique }, transaction });
  if (found !== unique.length) {
    throw HttpError.badRequest('Dados da requisição inválidos', [
      { field: 'category_ids', message: 'Uma ou mais categorias não existem' },
    ]);
  }
  return unique;
}

async function ensureSlugAvailable(slug, ignoreId, transaction) {
  const existing = await Product.findOne({ where: { slug }, transaction });
  if (existing && existing.id !== ignoreId) {
    throw HttpError.badRequest('Dados da requisição inválidos', [{ field: 'slug', message: 'Slug já cadastrado' }]);
  }
}

const optionAttributes = (option) => {
  const attributes = {};
  if (option.title !== undefined) attributes.title = option.title.trim();
  if (option.shape !== undefined) attributes.shape = option.shape;
  if (option.type !== undefined) attributes.type = option.type;
  const radius = parseRadius(option.radius);
  if (radius !== undefined) attributes.radius = radius;
  const values = readOptionValues(option);
  if (values !== undefined) attributes.values = values.join(',');
  return attributes;
};

/* ------------------------------------------------------------------ */
/* Busca                                                               */
/* ------------------------------------------------------------------ */

function parsePriceRange(value) {
  if (value === undefined || value === '') return undefined;
  const match = String(value).match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/);
  if (!match || Number(match[1]) > Number(match[2])) {
    throw HttpError.badRequest('O parâmetro "price-range" deve seguir o formato min-max, ex.: 100-200');
  }
  return [Number(match[1]), Number(match[2])];
}

/** Lê `option[45]=GG,PP` → { 45: ['GG', 'PP'] }. */
function parseOptionFilters(value) {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw HttpError.badRequest('O filtro de opções deve seguir o formato option[<id>]=valor1,valor2');
  }
  const entries = Object.entries(value);
  if (entries.some(([id, values]) => !isInteger(id) || typeof values !== 'string' || !values.trim())) {
    throw HttpError.badRequest('O filtro de opções deve seguir o formato option[<id>]=valor1,valor2');
  }
  return entries.map(([id, values]) => [Number(id), splitValues(values)]);
}

/** Interseção de conjuntos de IDs (null = sem restrição). */
const intersect = (current, ids) => (current === null ? ids : current.filter((id) => ids.includes(id)));

/** GET /v1/product/search */
async function search(query, baseUrl) {
  const { limit, page, offset, all } = parsePagination(query);
  const fields = parseFields(query.fields, FIELDS);
  const categoryIds = parseIdList(query.category_ids, 'category_ids');
  const priceRange = parsePriceRange(query['price-range']);
  const optionFilters = parseOptionFilters(query.option);
  const match = typeof query.match === 'string' ? query.match.trim() : '';

  const where = {};
  let restrictIds = null;

  if (match) {
    where[Op.or] = [{ name: { [Op.like]: `%${match}%` } }, { description: { [Op.like]: `%${match}%` } }];
  }

  if (priceRange) where.price = { [Op.between]: priceRange };

  if (categoryIds) {
    const links = await ProductCategory.findAll({
      where: { category_id: categoryIds },
      attributes: ['product_id'],
      raw: true,
    });
    restrictIds = intersect(restrictIds, Array.from(new Set(links.map((link) => link.product_id))));
  }

  if (optionFilters) {
    for (const [optionId, wanted] of optionFilters) {
      const option = await ProductOption.findByPk(optionId, { attributes: ['product_id', 'values'], raw: true });
      const available = option ? splitValues(option.values) : [];
      const matches = option && wanted.some((value) => available.includes(value));
      restrictIds = intersect(restrictIds, matches ? [option.product_id] : []);
    }
  }

  if (restrictIds !== null) where.id = { [Op.in]: restrictIds };

  const total = await Product.count({ where });
  const rows = await Product.findAll({
    where,
    include: buildIncludes(fields),
    order: [['id', 'ASC']],
    ...(all ? {} : { limit, offset }),
  });

  const data = rows.map((product) => pick(toResponse(product, baseUrl), fields));
  return { data, total, limit, page };
}

async function findById(id, baseUrl) {
  const product = await Product.findByPk(id, { include: buildIncludes() });
  if (!product) throw HttpError.notFound('Produto não encontrado');
  return toResponse(product, baseUrl);
}

/* ------------------------------------------------------------------ */
/* Escrita                                                             */
/* ------------------------------------------------------------------ */

async function create(data, baseUrl) {
  validateProduct(data);
  const writtenFiles = [];

  try {
    const productId = await sequelize.transaction(async (transaction) => {
      await ensureSlugAvailable(data.slug, undefined, transaction);
      const categoryIds = await ensureCategoriesExist(data.category_ids ?? [], transaction);

      const product = await Product.create(
        {
          enabled: data.enabled ?? false,
          name: data.name.trim(),
          slug: data.slug,
          use_in_menu: data.use_in_menu ?? false,
          stock: data.stock ?? 0,
          description: data.description ?? null,
          price: data.price,
          price_with_discount: data.price_with_discount,
        },
        { transaction },
      );

      if (categoryIds.length) {
        await ProductCategory.bulkCreate(
          categoryIds.map((categoryId) => ({ product_id: product.id, category_id: categoryId })),
          { transaction },
        );
      }

      for (const image of data.images ?? []) {
        const relativePath = await imageStorage.save(product.id, image.type, image.content);
        writtenFiles.push(relativePath);
        await ProductImage.create({ product_id: product.id, enabled: true, path: relativePath }, { transaction });
      }

      if (data.options?.length) {
        await ProductOption.bulkCreate(
          data.options.map((option) => ({ product_id: product.id, ...optionAttributes(option) })),
          { transaction },
        );
      }

      return product.id;
    });

    return findById(productId, baseUrl);
  } catch (error) {
    await imageStorage.removeMany(writtenFiles);
    throw error;
  }
}

/** Aplica as operações de imagem do PUT: criar, substituir, manter ou remover. */
async function applyImageChanges(product, images, transaction, writtenFiles, filesToRemove) {
  const existing = await ProductImage.findAll({ where: { product_id: product.id }, transaction });
  const byId = new Map(existing.map((image) => [image.id, image]));

  for (const [index, image] of images.entries()) {
    if (image.id === undefined) {
      const relativePath = await imageStorage.save(product.id, image.type, image.content);
      writtenFiles.push(relativePath);
      await ProductImage.create({ product_id: product.id, enabled: true, path: relativePath }, { transaction });
      continue;
    }

    const current = byId.get(image.id);
    if (!current) {
      throw HttpError.badRequest('Dados da requisição inválidos', [
        { field: `images[${index}].id`, message: 'Imagem não pertence a este produto' },
      ]);
    }

    if (image.deleted === true) {
      await current.destroy({ transaction });
      filesToRemove.push(current.path);
      continue;
    }

    // Conteúdo igual a uma URL mantém a imagem; base64 substitui o arquivo.
    if (image.content !== undefined && !imageStorage.isUrl(image.content)) {
      const type = image.type ?? imageStorage.typeFromPath(current.path) ?? 'image/png';
      const relativePath = await imageStorage.save(product.id, type, image.content);
      writtenFiles.push(relativePath);
      filesToRemove.push(current.path);
      await current.update({ path: relativePath }, { transaction });
    }
  }
}

/** Aplica as operações de opções do PUT: criar, atualizar parcialmente ou remover. */
async function applyOptionChanges(product, options, transaction) {
  const existing = await ProductOption.findAll({ where: { product_id: product.id }, transaction });
  const byId = new Map(existing.map((option) => [option.id, option]));

  for (const [index, option] of options.entries()) {
    if (option.id === undefined) {
      await ProductOption.create({ product_id: product.id, ...optionAttributes(option) }, { transaction });
      continue;
    }

    const current = byId.get(option.id);
    if (!current) {
      throw HttpError.badRequest('Dados da requisição inválidos', [
        { field: `options[${index}].id`, message: 'Opção não pertence a este produto' },
      ]);
    }

    if (option.deleted === true) await current.destroy({ transaction });
    else await current.update(optionAttributes(option), { transaction });
  }
}

async function update(id, data) {
  const product = await Product.findByPk(id);
  if (!product) throw HttpError.notFound('Produto não encontrado');
  validateProduct(data, { partial: true });

  const scalarFields = ['enabled', 'name', 'slug', 'use_in_menu', 'stock', 'description', 'price', 'price_with_discount'];
  const changes = Object.fromEntries(scalarFields.filter((field) => data[field] !== undefined).map((f) => [f, data[f]]));
  if (typeof changes.name === 'string') changes.name = changes.name.trim();

  const hasChanges =
    Object.keys(changes).length > 0 || ['category_ids', 'images', 'options'].some((key) => data[key] !== undefined);
  if (!hasChanges) throw HttpError.badRequest('Informe ao menos um campo para atualizar');

  const writtenFiles = [];
  const filesToRemove = [];

  try {
    await sequelize.transaction(async (transaction) => {
      if (changes.slug) await ensureSlugAvailable(changes.slug, product.id, transaction);
      if (Object.keys(changes).length) await product.update(changes, { transaction });

      if (data.category_ids !== undefined) {
        const categoryIds = await ensureCategoriesExist(data.category_ids, transaction);
        await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
        if (categoryIds.length) {
          await ProductCategory.bulkCreate(
            categoryIds.map((categoryId) => ({ product_id: product.id, category_id: categoryId })),
            { transaction },
          );
        }
      }

      if (data.images !== undefined) {
        await applyImageChanges(product, data.images, transaction, writtenFiles, filesToRemove);
      }
      if (data.options !== undefined) await applyOptionChanges(product, data.options, transaction);
    });
  } catch (error) {
    await imageStorage.removeMany(writtenFiles);
    throw error;
  }

  // Arquivos antigos só são apagados depois que a transação foi confirmada.
  await imageStorage.removeMany(filesToRemove);
}

async function remove(id) {
  const product = await Product.findByPk(id);
  if (!product) throw HttpError.notFound('Produto não encontrado');

  await sequelize.transaction(async (transaction) => {
    await ProductImage.destroy({ where: { product_id: product.id }, transaction });
    await ProductOption.destroy({ where: { product_id: product.id }, transaction });
    await ProductCategory.destroy({ where: { product_id: product.id }, transaction });
    await product.destroy({ transaction });
  });

  await imageStorage.removeProductFolder(product.id);
}

module.exports = { search, findById, create, update, remove, FIELDS };
