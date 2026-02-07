const { errorHandler } = require('./errorHandler');
const { authenticate } = require('./auth');
const { validate } = require('./validation');

module.exports = {
  errorHandler,
  authenticate,
  validate,
};
