/**
 * Erro com status HTTP. Lançado pelas camadas de serviço/middleware
 * e convertido em resposta JSON pelo middleware `errorHandler`.
 */
class HttpError extends Error {
  constructor(status, message, details) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.details = details;
  }

  static badRequest(message = 'Requisição inválida', details) {
    return new HttpError(400, message, details);
  }

  static unauthorized(message = 'Token de autorização inválido') {
    return new HttpError(401, message);
  }

  static notFound(message = 'Recurso não encontrado') {
    return new HttpError(404, message);
  }
}

module.exports = HttpError;
