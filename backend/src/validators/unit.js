const { Joi } = require('./common');

const fields = {
  code: Joi.string().trim().uppercase().alphanum().min(3).max(12),
  name: Joi.string().trim().min(1).max(100),
  semester: Joi.string().trim().pattern(/^\d{4}-(S1|S2|T1|T2|T3|SUM|WIN)$/)
    .messages({ 'string.pattern.base': 'Semester must look like 2026-S2.' }),
  creditPoints: Joi.number().integer().min(0).max(50),
  targetGrade: Joi.number().min(0).max(100),
  colour: Joi.string().pattern(/^#[0-9a-fA-F]{6}$/),
  clientId: Joi.string().uuid(),
};

exports.createUnit = Joi.object(fields).fork(['code', 'name', 'semester'], (s) => s.required());
exports.updateUnit = Joi.object(fields).fork(['clientId'], (s) => s.forbidden()).min(1);
exports.listUnits = Joi.object({ semester: fields.semester });