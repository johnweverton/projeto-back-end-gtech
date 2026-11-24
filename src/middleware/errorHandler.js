/**
 * Middlewares finais: rota inexistente (404) e tratamento centralizado de erros.
 */
const { ValidationError, UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
const HttpError = require('../utils/HttpError');

function notFound(req, _res, next) {
  next(HttpError.notFound(`Rota ${req.method} ${req.originalUrl} não encontrada`));
}

// O Express identifica middlewares de erro pelos 4 argumentos, por isso `_next` é mantido.
function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message, ...(error.details && { errors: error.details }) });
  }

  // JSON malformado no corpo da requisição
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'JSON inválido no corpo da requisição' });
  }

  if (error.type === 'entity.too.large') {
    return res.status(400).json({ message: 'Corpo da requisição excede o tamanho máximo permitido' });
  }

  if (error instanceof UniqueConstraintError) {
    const fields = Object.keys(error.fields || {});
    return res.status(400).json({
      message: 'Já existe um registro com estes dados',
      errors: fields.map((field) => ({ field, message: 'Valor já cadastrado' })),
    });
  }

  if (error instanceof ForeignKeyConstraintError) {
    return res.status(400).json({ message: 'Referência a um registro inexistente' });
  }

  if (error instanceof ValidationError) {
    return res.status(400).json({
      message: 'Dados da requisição inválidos',
      errors: error.errors.map((item) => ({ field: item.path, message: item.message })),
    });
  }

  console.error('Erro inesperado:', error);
  return res.status(500).json({ message: 'Erro interno do servidor' });
}

module.exports = { notFound, errorHandler };
