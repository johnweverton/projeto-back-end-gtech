/**
 * Regras de negócio de usuários e autenticação.
 */
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { jwt: jwtConfig } = require('../config/env');
const HttpError = require('../utils/HttpError');
const { Validator, assertBody } = require('../utils/validators');

const SALT_ROUNDS = 10;
const MIN_PASSWORD_LENGTH = 6;

const toResponse = (user) => ({
  id: user.id,
  firstname: user.firstname,
  surname: user.surname,
  email: user.email,
});

async function ensureEmailAvailable(email, ignoreId) {
  const existing = await User.findOne({ where: { email } });
  if (existing && existing.id !== ignoreId) {
    throw HttpError.badRequest('Dados da requisição inválidos', [{ field: 'email', message: 'E-mail já cadastrado' }]);
  }
}

async function findById(id) {
  const user = await User.findByPk(id);
  if (!user) throw HttpError.notFound('Usuário não encontrado');
  return toResponse(user);
}

async function create(data) {
  assertBody(data);
  const validator = new Validator()
    .string(data, 'firstname')
    .string(data, 'surname')
    .email(data, 'email')
    .string(data, 'password')
    .string(data, 'confirmPassword');

  if (typeof data.password === 'string' && data.password.length < MIN_PASSWORD_LENGTH) {
    validator.add('password', `A senha deve ter pelo menos ${MIN_PASSWORD_LENGTH} caracteres`);
  }
  if (data.password !== data.confirmPassword) {
    validator.add('confirmPassword', 'As senhas não conferem');
  }
  validator.throwIfInvalid();

  const email = data.email.trim().toLowerCase();
  await ensureEmailAvailable(email);

  const user = await User.create({
    firstname: data.firstname.trim(),
    surname: data.surname.trim(),
    email,
    password: await bcrypt.hash(data.password, SALT_ROUNDS),
  });
  return toResponse(user);
}

async function update(id, data) {
  assertBody(data);
  const user = await User.findByPk(id);
  if (!user) throw HttpError.notFound('Usuário não encontrado');

  new Validator()
    .string(data, 'firstname', { partial: true })
    .string(data, 'surname', { partial: true })
    .email(data, 'email', { partial: true })
    .throwIfInvalid();

  const changes = {};
  if (data.firstname !== undefined) changes.firstname = data.firstname.trim();
  if (data.surname !== undefined) changes.surname = data.surname.trim();
  if (data.email !== undefined) {
    changes.email = data.email.trim().toLowerCase();
    await ensureEmailAvailable(changes.email, user.id);
  }

  if (Object.keys(changes).length === 0) {
    throw HttpError.badRequest('Informe ao menos um campo para atualizar: firstname, surname ou email');
  }

  await user.update(changes);
}

async function remove(id) {
  const deleted = await User.destroy({ where: { id } });
  if (!deleted) throw HttpError.notFound('Usuário não encontrado');
}

/** Gera o JWT a partir de e-mail e senha. Credenciais inválidas retornam 400 (conforme especificação). */
async function generateToken(data) {
  assertBody(data);
  new Validator().email(data, 'email').string(data, 'password').throwIfInvalid();

  const user = await User.scope('withPassword').findOne({ where: { email: data.email.trim().toLowerCase() } });
  const valid = user && (await bcrypt.compare(data.password, user.password));
  if (!valid) throw HttpError.badRequest('E-mail ou senha inválidos');

  const token = jwt.sign({ sub: user.id, email: user.email }, jwtConfig.secret, {
    expiresIn: jwtConfig.expiresIn,
  });
  return { token };
}

module.exports = { findById, create, update, remove, generateToken };
