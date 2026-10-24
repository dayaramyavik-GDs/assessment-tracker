const Joi = require('joi');

const objectId = Joi.string().hex().length(24).messages({
  'string.hex': 'Invalid id.',
  'string.length': 'Invalid id.',
});

const password = Joi.string().min(8).max(72).pattern(/[A-Za-z]/).pattern(/\d/).messages({
  'string.min': 'Password must be 8+ characters and include a letter and a number.',
  'string.max': 'Password must be 72 characters or fewer.',
  'string.pattern.base': 'Password must be 8+ characters and include a letter and a number.',
});

const idParam = Joi.object({ id: objectId.required() });

module.exports = { Joi, objectId, password, idParam };