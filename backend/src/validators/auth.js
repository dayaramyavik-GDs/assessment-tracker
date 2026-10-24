const { Joi, password } = require('./common');

const email = Joi.string().trim().lowercase().email({ tlds: { allow: false } }).max(254)
  .messages({ 'string.email': 'Enter a valid email address.' });

exports.register = Joi.object({
  name: Joi.string().trim().min(1).max(60).required(),
  email: email.required(),
  password: password.required(),
});

exports.login = Joi.object({
  email: email.required(),
  password: Joi.string().max(200).required(),
});
