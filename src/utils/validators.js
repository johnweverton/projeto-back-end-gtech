/**
 * Validações simples reutilizadas pelos serviços.
 */
const HttpError = require('./HttpError');
const { isInteger } = require('./query');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

/**
 * Acumula erros de validação e lança um único 400 com todos eles.
 */
class Validator {
  constructor() {
    this.errors = [];
  }

  add(field, message) {
    this.errors.push({ field, message });
    return this;
  }

  /** Valida um campo string. `required` só se aplica quando `partial` é falso. */
  string(data, field, { required = true, partial = false } = {}) {
    const value = data[field];
    if (value === undefined || value === null) {
      if (required && !partial) this.add(field, 'Campo obrigatório');
    } else if (!isNonEmptyString(value)) {
      this.add(field, 'Deve ser um texto não vazio');
    }
    return this;
  }

  email(data, field, options) {
    this.string(data, field, options);
    const value = data[field];
    if (isNonEmptyString(value) && !EMAIL_REGEX.test(value)) this.add(field, 'E-mail inválido');
    return this;
  }

  slug(data, field, options) {
    this.string(data, field, options);
    const value = data[field];
    if (isNonEmptyString(value) && !SLUG_REGEX.test(value)) {
      this.add(field, 'Slug inválido (use letras minúsculas, números e hífens)');
    }
    return this;
  }

  boolean(data, field) {
    const value = data[field];
    if (value !== undefined && value !== null && typeof value !== 'boolean') this.add(field, 'Deve ser true ou false');
    return this;
  }

  number(data, field, { required = true, partial = false, min = 0, integer = false } = {}) {
    const value = data[field];
    if (value === undefined || value === null) {
      if (required && !partial) this.add(field, 'Campo obrigatório');
    } else if (typeof value !== 'number' || Number.isNaN(value) || (integer && !Number.isInteger(value))) {
      this.add(field, integer ? 'Deve ser um número inteiro' : 'Deve ser um número');
    } else if (value < min) {
      this.add(field, `Deve ser maior ou igual a ${min}`);
    }
    return this;
  }

  throwIfInvalid(message = 'Dados da requisição inválidos') {
    if (this.errors.length > 0) throw HttpError.badRequest(message, this.errors);
  }
}

/** Garante que o corpo da requisição seja um objeto JSON. */
function assertBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw HttpError.badRequest('O corpo da requisição deve ser um objeto JSON');
  }
}

/** Converte o :id da rota em número; IDs inválidos são tratados como inexistentes (404). */
function parseId(value, message) {
  if (!isInteger(value) || Number(value) < 1) throw HttpError.notFound(message);
  return Number(value);
}

module.exports = { Validator, assertBody, parseId, isNonEmptyString };
