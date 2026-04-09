const router = require('express').Router();
const auth = require('../middleware/auth');
const c = require('../controllers/ideaController');
const multer = require('multer');
const path = require('path');
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../uploads')),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });
router.get('/', auth, c.list);
router.get('/:id', auth, c.get);
router.post('/', auth, upload.array('attachments'), c.create);
router.put('/:id', auth, upload.array('attachments'), c.update);
router.delete('/:id', auth, c.remove);
module.exports = router;
