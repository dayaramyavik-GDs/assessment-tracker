const { Joi, objectId } = require('./common');
const { TYPES, STATUSES } = require('../models/Assessment');

const fields = {
  unitId: objectId,
  title: Joi.string().trim().min(1).max(100),
  type: Joi.string().valid(...TYPES),
  dueAt: Joi.date().iso(),
  weighting: Joi.number().greater(0).max(100),
  maxMark: Joi.number().greater(0).max(1000),
  markReceived: Joi.number().min(0).allow(null),
  status: Joi.string().valid(...STATUSES),
  notes: Joi.string().allow('').max(1000),
  clientId: Joi.string().uuid(),
};

exports.createAssessment = Joi.object(fields)
  .fork(['unitId', 'title', 'type', 'dueAt', 'weighting'], (s) => s.required());
exports.updateAssessment = Joi.object(fields).fork(['clientId'], (s) => s.forbidden()).min(1);
exports.listAssessments = Joi.object({
  unitId: objectId,
  from: Joi.date().iso(),
  to: Joi.date().iso(),
  status: Joi.string().valid(...STATUSES),
});