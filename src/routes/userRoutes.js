const express = require('express');
const { getMe } = require('../controllers/userController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

router.get('/me', authenticate, requireUser, getMe);

module.exports = router;
