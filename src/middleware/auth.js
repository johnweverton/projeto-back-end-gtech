/**
 * Valida o cabeçalho `Authorization: Bearer <jwt>`.
 * - Cabeçalho ausente ou fora do formato Bearer → 400 Bad Request (Seção 05, Requisito 02)
 * - Token presente porém inválido/expirado → 401 Unauthorized
 */
const jwt = require('jsonwebtoken');
const { jwt: jwtConfig } = require('../config/env');
const HttpError = require('../utils/HttpError');

function authenticate(req, _res, next) {
  const header = req.headers.authorization;

  if (!header) {
    return next(HttpError.badRequest('Cabeçalho Authorization ausente. Use: Authorization: Bearer <jwt>'));
  }

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(HttpError.badRequest('Cabeçalho Authorization inválido. Use: Authorization: Bearer <jwt>'));
  }

  try {
    const payload = jwt.verify(token, jwtConfig.secret);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(HttpError.unauthorized('Token de autorização inválido ou expirado'));
  }
}

module.exports = authenticate;
