/**
 * Request validation middleware - validates body/params/query and returns 400 on failure.
 */

function validate(schema) {
  return (req, res, next) => {
    const keys = ['body', 'params', 'query'];
    const errors = [];

    for (const key of keys) {
      if (!schema[key]) continue;
      const value = req[key];
      for (const [field, rules] of Object.entries(schema[key])) {
        const val = value[field];
        if (rules.required && (val === undefined || val === null || val === '')) {
          errors.push({ field: `${key}.${field}`, message: `${field} is required` });
        }
        if (rules.type && val !== undefined && val !== null) {
          const actual = typeof val;
          if (actual !== rules.type) {
            errors.push({ field: `${key}.${field}`, message: `${field} must be ${rules.type}` });
          }
        }
      }
    }

    if (errors.length) {
      return res.status(400).json({ success: false, error: { message: 'Validation failed', details: errors } });
    }
    next();
  };
}

module.exports = { validate };
