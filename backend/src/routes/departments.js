const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/departmentController');
router.get('/', auth, c.list);
router.post('/', auth, role('admin'), c.create);
router.delete('/:id', auth, role('admin'), c.remove);
module.exports = router;
