const express = require('express');
const { list, getById, getReviews } = require('../controllers/shopController');

const router = express.Router();

router.get('/', list);
router.get('/:id', getById);
router.get('/:id/reviews', getReviews);

module.exports = router;
