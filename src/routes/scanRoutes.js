const express = require('express');
const { getById } = require('../controllers/scanController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
