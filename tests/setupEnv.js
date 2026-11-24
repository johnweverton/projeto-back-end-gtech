const os = require('os');
const path = require('path');

// Os testes usam SQLite em memória e uma pasta temporária para imagens.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.BASE_URL = 'http://test.local';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `digital-store-api-tests-${process.pid}`);
