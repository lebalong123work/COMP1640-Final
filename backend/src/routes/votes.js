const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/voteController');
router.post('/', auth, c.vote);
module.exports = router;
