const rateLimit = require('express-rate-limit');

const handler = (req, res) =>
  res.status(429).json({
    error: { code: 'TOO_MANY_REQUESTS', message: 'Too many attempts. Please wait a few minutes and try again.' },
  });

const common = { windowMs: 15 * 60 * 1000, standardHeaders: 'draft-7', legacyHeaders: false, handler };

exports.authLimiter = rateLimit({
  ...common,
  limit: 10,
  skipSuccessfulRequests: true, // only failed logins/registrations count
  skip: () => process.env.NODE_ENV === 'test',
});

exports.apiLimiter = rateLimit({ ...common, limit: 300, skip: () => process.env.NODE_ENV === 'test' });
