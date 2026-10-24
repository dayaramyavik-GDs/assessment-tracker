const { Joi, password } = require('./common');

exports.updateMe = Joi.object({
  name: Joi.string().trim().min(1).max(60),
  settings: Joi.object({
    passMark: Joi.number().min(0).max(100),
    reminderOffsetsMinutes: Joi.array().items(Joi.number().integer().min(0).max(20160)).max(5),
  }),
}).min(1);

exports.changePassword = Joi.object({
  currentPassword: Joi.string().max(200).required(),
  newPassword: password.required(),
});

exports.deleteMe = Joi.object({ password: Joi.string().max(200).required() });