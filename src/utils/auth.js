const bcrypt = require('bcryptjs');
const SALT_ROUNDS = 12;

/**
 * Hash password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hashedPassword - Hashed password
 * @returns {Promise<boolean>} True if password matches
 */
async function comparePassword(password, hashedPassword) {
  if (!password || !hashedPassword) {
    return false;
  }
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} Validation result
 */
function validatePassword(password) {
  const errors = [];
  
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long');
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters long');
  }
  
  // Optional: Add more complex password requirements
  // if (!/(?=.*[a-z])/.test(password)) {
  //   errors.push('Password must contain at least one lowercase letter');
  // }
  
  // if (!/(?=.*[A-Z])/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }
  
  // if (!/(?=.*\d)/.test(password)) {
  //   errors.push('Password must contain at least one number');
  // }
  
  // if (!/(?=.*[@$!%*?&])/.test(password)) {
  //   errors.push('Password must contain at least one special character');
  // }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  hashPassword,
  comparePassword,
  validatePassword,
  SALT_ROUNDS
};
