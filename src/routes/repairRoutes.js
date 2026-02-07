const express = require('express');
const { list, getById } = require('../controllers/repairController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireUser, list);
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
