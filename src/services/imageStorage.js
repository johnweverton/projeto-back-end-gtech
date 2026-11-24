/**
 * Armazena as imagens dos produtos (recebidas em base64) no disco do servidor.
 * O banco guarda apenas o caminho relativo; a URL pública é /media/<path>.
 */
const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { uploadDir } = require('../config/env');
const HttpError = require('../utils/HttpError');

const MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const DATA_URI_PREFIX = /^data:([\w/+.-]+);base64,/;
const BASE64_REGEX = /^[A-Za-z0-9+/]+={0,2}$/;

const isSupportedType = (type) => Object.hasOwn(MIME_EXTENSIONS, String(type).toLowerCase());
const isUrl = (value) => /^https?:\/\//i.test(String(value));

/** Decodifica o conteúdo base64 (aceita data URI) e valida o formato. */
function decode(content) {
  const raw = String(content).replace(DATA_URI_PREFIX, '').replace(/\s/g, '');
  if (!raw || !BASE64_REGEX.test(raw)) throw HttpError.badRequest('Imagem inválida: o conteúdo deve estar em base64');
  const buffer = Buffer.from(raw, 'base64');
  if (buffer.length === 0) throw HttpError.badRequest('Imagem inválida: conteúdo vazio');
  return buffer;
}

/** Garante que o caminho fique dentro da pasta de uploads (evita path traversal). */
function resolveSafe(relativePath) {
  const absolute = path.resolve(uploadDir, relativePath);
  if (!absolute.startsWith(uploadDir + path.sep)) throw new Error(`Caminho de imagem inválido: ${relativePath}`);
  return absolute;
}

/**
 * Salva uma imagem e retorna o caminho relativo (ex.: products/1/abc.png).
 * @param {number} productId
 * @param {string} type MIME type (image/png, image/jpeg...)
 * @param {string} content base64 ou data URI
 */
async function save(productId, type, content) {
  const extension = MIME_EXTENSIONS[String(type).toLowerCase()];
  if (!extension) throw HttpError.badRequest(`Tipo de imagem não suportado: ${type}`);

  const buffer = decode(content);
  const relativePath = path.posix.join('products', String(productId), `${crypto.randomUUID()}.${extension}`);
  const absolute = resolveSafe(relativePath);

  await fs.mkdir(path.dirname(absolute), { recursive: true });
  await fs.writeFile(absolute, buffer);
  return relativePath;
}

/** Remove um arquivo salvo, ignorando arquivos que já não existem. */
async function remove(relativePath) {
  if (!relativePath || isUrl(relativePath)) return;
  try {
    await fs.unlink(resolveSafe(relativePath));
  } catch (error) {
    if (error.code !== 'ENOENT') console.error(`Falha ao remover imagem ${relativePath}:`, error.message);
  }
}

async function removeMany(paths) {
  await Promise.all(paths.map(remove));
}

/** Remove a pasta de imagens de um produto. */
async function removeProductFolder(productId) {
  await fs.rm(resolveSafe(path.posix.join('products', String(productId))), { recursive: true, force: true });
}

/** Monta a URL pública de uma imagem. */
function toUrl(relativePath, baseUrl = '') {
  if (isUrl(relativePath)) return relativePath;
  return `${baseUrl}/media/${relativePath}`;
}

/** Descobre o MIME type a partir da extensão de um caminho salvo. */
function typeFromPath(relativePath) {
  const extension = path.extname(String(relativePath)).slice(1).toLowerCase();
  return Object.keys(MIME_EXTENSIONS).find((type) => MIME_EXTENSIONS[type] === extension);
}

module.exports = { save, remove, removeMany, removeProductFolder, toUrl, typeFromPath, isSupportedType, isUrl };
