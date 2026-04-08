const router = require('express').Router();
const auth = require('../middleware/auth');
const role = require('../middleware/role');
const c = require('../controllers/exportController');
router.get('/csv', auth, role('qa_manager'), c.exportCsv);
router.get('/csv-ideas', auth, role('qa_manager'), c.exportIdeaCsv);
router.get('/csv-comments', auth, role('qa_manager'), c.exportCommentCsv);
router.get('/zip', auth, role('qa_manager'), c.exportZip);
module.exports = router;
