const { Router } = require('express');
const authenticate = require('../middleware/auth');
const controller = require('../controllers/userController');

const router = Router();

// Rotas públicas: cadastro e geração de token precisam funcionar sem JWT.
router.post('/token', controller.token);
router.post('/', controller.store);
router.get('/:id', controller.show);

// Rotas protegidas
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.destroy);

module.exports = router;
