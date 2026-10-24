const AppError = require('../utils/AppError');
const { nodeEnv } = require('../config/env');

exports.notFound = (req, res, next) =>
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.originalUrl} not found.`));


exports.errorHandler = (err, req, res, next) => {
  let e = err;
  if (err.code === 11000) {
    e = err.keyPattern && err.keyPattern.email
      ? new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.')
      : err.keyPattern && err.keyPattern.code
        ? new AppError(409, 'DUPLICATE_UNIT', 'You already have this unit this semester.')
        : new AppError(409, 'DUPLICATE', 'That record already exists.');
  } else if (err.name === 'CastError') {
    e = new AppError(400, 'INVALID_ID', 'Invalid id.');
  } else if (err.name === 'ValidationError') {
    e = new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.',
      Object.values(err.errors).map((x) => ({ field: x.path, message: x.message })));
  } else if (err.type === 'entity.parse.failed') {
    e = new AppError(400, 'BAD_JSON', 'Request body is not valid JSON.');
  } else if (err.type === 'entity.too.large') {
    e = new AppError(413, 'TOO_LARGE', 'Request is too large.');
  }

  const status = e instanceof AppError ? e.status : 500;
  if (status >= 500) console.error(err); // full detail in server logs only

  res.status(status).json({
    error: {
      code: status >= 500 ? 'SERVER_ERROR' : e.code,
      message: status >= 500 && nodeEnv === 'production'
        ? 'Something went wrong on our side. Please try again.'
        : e.message,
      ...(e.details ? { details: e.details } : {}),
    },
  });
};