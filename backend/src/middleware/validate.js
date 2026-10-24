const AppError = require('../utils/AppError');

module.exports = (schema, source = 'body') => (req, res, next) => {
  const { value, error } = schema.validate(req[source] ?? {}, {
    abortEarly: false,
    stripUnknown: true,
    errors: { wrap: { label: false } },
  });
  if (error) {
    const details = error.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return next(new AppError(400, 'VALIDATION_ERROR', 'Check the highlighted fields.', details));
  }
  req.valid = { ...(req.valid || {}), [source]: value };
  next();
};