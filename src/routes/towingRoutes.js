const express = require('express');
const { history, getById } = require('../controllers/towingController');
const { authenticate, requireUser } = require('../middleware/auth');

const router = express.Router();

router.get('/history', authenticate, requireUser, history);
router.get('/:id', authenticate, requireUser, getById);

module.exports = router;
