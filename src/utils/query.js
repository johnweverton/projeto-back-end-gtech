/**
 * Helpers para interpretar query strings de busca (paginação, campos e booleanos).
 */
const HttpError = require('./HttpError');

const DEFAULT_LIMIT = 12;
const DEFAULT_PAGE = 1;

const isInteger = (value) => /^-?\d+$/.test(String(value));

/**
 * Lê `limit` e `page`. `limit=-1` retorna todos os itens (page é ignorado).
 * @returns {{ limit: number, page: number, offset?: number, all: boolean }}
 */
function parsePagination(query) {
  const limit = query.limit === undefined || query.limit === '' ? DEFAULT_LIMIT : query.limit;
  const page = query.page === undefined || query.page === '' ? DEFAULT_PAGE : query.page;

  if (!isInteger(limit) || (Number(limit) < 1 && Number(limit) !== -1)) {
    throw HttpError.badRequest('O parâmetro "limit" deve ser um inteiro positivo ou -1');
  }
  if (!isInteger(page) || Number(page) < 1) {
    throw HttpError.badRequest('O parâmetro "page" deve ser um inteiro maior que zero');
  }

  const numericLimit = Number(limit);
  const numericPage = Number(page);

  if (numericLimit === -1) return { limit: -1, page: 1, all: true };
  return { limit: numericLimit, page: numericPage, offset: (numericPage - 1) * numericLimit, all: false };
}

/**
 * Lê `fields=a,b,c` validando contra a lista de campos permitidos.
 * @returns {string[] | null} null quando não informado (todos os campos).
 */
function parseFields(value, allowed) {
  if (value === undefined || value === '') return null;
  const fields = String(value)
    .split(',')
    .map((field) => field.trim())
    .filter(Boolean);

  const invalid = fields.filter((field) => !allowed.includes(field));
  if (fields.length === 0 || invalid.length > 0) {
    throw HttpError.badRequest(`Campos inválidos em "fields": ${invalid.join(', ') || value}`, {
      allowed,
    });
  }
  return fields;
}

/** Converte "true"/"false"/"1"/"0" em boolean. */
function parseBoolean(value, name) {
  if (value === undefined || value === '') return undefined;
  if (['true', '1'].includes(String(value).toLowerCase())) return true;
  if (['false', '0'].includes(String(value).toLowerCase())) return false;
  throw HttpError.badRequest(`O parâmetro "${name}" deve ser true ou false`);
}

/** Converte "1,2,3" em [1, 2, 3], validando inteiros. */
function parseIdList(value, name) {
  if (value === undefined || value === '') return undefined;
  const items = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (items.length === 0 || items.some((item) => !isInteger(item) || Number(item) < 1)) {
    throw HttpError.badRequest(`O parâmetro "${name}" deve ser uma lista de IDs separados por vírgula`);
  }
  return items.map(Number);
}

/** Mantém apenas as chaves pedidas em `fields`. */
function pick(object, fields) {
  if (!fields) return object;
  return Object.fromEntries(fields.filter((field) => field in object).map((field) => [field, object[field]]));
}

module.exports = { parsePagination, parseFields, parseBoolean, parseIdList, pick, isInteger };
