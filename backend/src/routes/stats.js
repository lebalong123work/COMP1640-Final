const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/statsController');
router.get('/', auth, role('qa_manager'), c.getStats);
router.get('/department/:dept', auth, role('qa_coordinator', 'qa_manager'), c.getDeptStats);
router.get('/ideas-without-comments', auth, role('qa_manager'), c.ideasWithoutComments);
router.get('/anonymous-content', auth, role('qa_manager'), c.anonymousContent);
module.exports = router;
