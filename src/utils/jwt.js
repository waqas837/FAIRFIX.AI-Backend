const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// No fallbacks — app must be started with JWT_SECRET and JWT_REFRESH_SECRET in env (validated at startup)
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '30d';

/**
 * Generate JWT access token
 * @param {string} userId - User ID
 * @returns {string} JWT token
 */
function generateToken(userId) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/**
 * Generate JWT refresh token (unique per issuance via jti to avoid DB unique constraint)
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
function generateRefreshToken(userId) {
  const jti = crypto.randomBytes(16).toString('hex');
  return jwt.sign(
    { userId, jti },
    JWT_REFRESH_SECRET,
    { expiresIn: JWT_REFRESH_EXPIRES_IN }
  );
}

/**
 * Verify JWT access token
 * @param {string} token - JWT token
 * @returns {object} Decoded payload
 */
function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Verify JWT refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {object} Decoded payload
 */
function verifyRefreshToken(refreshToken) {
  return jwt.verify(refreshToken, JWT_REFRESH_SECRET);
}

/**
 * Generate token pair (access + refresh)
 * @param {string} userId - User ID
 * @returns {object} { token, refreshToken }
 */
function generateTokenPair(userId) {
  return {
    token: generateToken(userId),
    refreshToken: generateRefreshToken(userId)
  };
}

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  verifyRefreshToken,
  generateTokenPair,
  JWT_SECRET,
  JWT_REFRESH_SECRET
};
