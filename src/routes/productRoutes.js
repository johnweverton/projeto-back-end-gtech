const { Router } = require('express');
const authenticate = require('../middleware/auth');
const controller = require('../controllers/productController');

const router = Router();

// `/search` precisa vir antes de `/:id`
router.get('/search', controller.search);
router.get('/:id', controller.show);

router.post('/', authenticate, controller.store);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.destroy);

module.exports = router;
