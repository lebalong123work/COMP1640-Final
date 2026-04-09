const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/closureDateController');
router.get('/', auth, c.list);
router.put('/:id', auth, role('admin'), c.update);
router.delete('/:id', auth, role('admin'), c.remove);
module.exports = router;
