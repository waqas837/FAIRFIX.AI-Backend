const crypto = require('crypto');

/**
 * Hash VIN for compliance (CCPA/PIPEDA/GDPR)
 * Uses SHA-256 for one-way hashing
 * @param {string} vin - Plain VIN
 * @returns {string} Hashed VIN
 */
function hashVIN(vin) {
  if (!vin) return null;
  return crypto.createHash('sha256').update(vin.trim().toUpperCase()).digest('hex');
}

/**
 * Mask phone number for display (shows only last 4 digits)
 * Example: +1234567890 -> ***-***-7890
 * @param {string} phone - Phone number
 * @returns {string} Masked phone number
 */
function maskPhone(phone) {
  if (!phone) return null;
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  if (digits.length < 4) {
    return '***-***-****';
  }
  
  // Show only last 4 digits
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

/**
 * Mask email for display (shows first 2 chars and domain)
 * Example: john.doe@example.com -> jo***@example.com
 * @param {string} email - Email address
 * @returns {string} Masked email
 */
function maskEmail(email) {
  if (!email) return null;
  
  const [localPart, domain] = email.split('@');
  if (!domain) return email;
  
  if (localPart.length <= 2) {
    return `${localPart[0]}***@${domain}`;
  }
  
  return `${localPart.substring(0, 2)}***@${domain}`;
}

module.exports = {
  hashVIN,
  maskPhone,
  maskEmail
};
