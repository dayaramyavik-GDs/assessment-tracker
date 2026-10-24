const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/env');
const AppError = require('../utils/AppError');

module.exports = function requireAuth(req, res, next) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    return next(new AppError(401, 'UNAUTHORISED', 'Please log in.'));
  }
  try {
    const payload = jwt.verify(token, jwtSecret, { algorithms: ['HS256'] });
    req.user = { id: payload.sub };
    return next();
  } catch {
    return next(new AppError(401, 'UNAUTHORISED', 'Your session has expired. Please log in again.'));
  }
};