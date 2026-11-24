/**
 * Controllers de usuário: traduzem HTTP ↔ serviço. A regra de negócio fica em services/.
 */
const userService = require('../services/userService');
const { parseId } = require('../utils/validators');

const NOT_FOUND = 'Usuário não encontrado';

async function show(req, res) {
  const user = await userService.findById(parseId(req.params.id, NOT_FOUND));
  res.status(200).json(user);
}

async function store(req, res) {
  const user = await userService.create(req.body);
  res.status(201).location(`/v1/user/${user.id}`).json(user);
}

async function update(req, res) {
  await userService.update(parseId(req.params.id, NOT_FOUND), req.body);
  res.status(204).end();
}

async function destroy(req, res) {
  await userService.remove(parseId(req.params.id, NOT_FOUND));
  res.status(204).end();
}

async function token(req, res) {
  const result = await userService.generateToken(req.body);
  res.status(200).json(result);
}

module.exports = { show, store, update, destroy, token };
