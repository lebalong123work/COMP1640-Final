const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/categoryController');
router.get('/', auth, c.list);
router.post('/', auth, role('qa_manager'), c.create);
router.delete('/:id', auth, role('qa_manager'), c.remove);
module.exports = router;
