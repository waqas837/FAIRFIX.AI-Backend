const express = require('express');
const { getTerms } = require('../controllers/termsController');

const router = express.Router();
router.get('/', getTerms);
module.exports = router;
