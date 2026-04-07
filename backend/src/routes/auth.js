const router = require('express').Router();
const c = require('../controllers/authController');
const auth = require('../middleware/auth');
router.post('/login', c.login);
router.post('/forgot-password', c.forgotPassword);
router.get('/me', auth, c.me);
module.exports = router;
