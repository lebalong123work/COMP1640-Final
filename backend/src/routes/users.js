const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/userController');
router.get('/', auth, role('admin'), c.list);
router.post('/', auth, role('admin'), c.create);
router.delete('/:id', auth, role('admin'), c.remove);
router.post('/change-password', auth, c.changePassword);
module.exports = router;
