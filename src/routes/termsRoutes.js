const express = require('express');
const { getTerms } = require('../controllers/termsController');

const router = express.Router();

/**
 * @swagger
 * /terms:
 *   get:
 *     summary: Get platform terms
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Platform terms
 */
router.get('/', getTerms);

module.exports = router;
