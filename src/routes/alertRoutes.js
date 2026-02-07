const express = require('express');
const { list } = require('../controllers/alertController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireUser, list);

module.exports = router;
