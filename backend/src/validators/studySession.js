const { Joi, objectId } = require('./common');

exports.createSession = Joi.object({
  unitId: objectId.required(),
  assessmentId: objectId.allow(null),
  startedAt: Joi.date().iso().required(),
  endedAt: Joi.date().iso().greater(Joi.ref('startedAt')).required(),
  durationMinutes: Joi.number().integer().min(1).max(720).required(),
  mode: Joi.string().valid('stopwatch', 'pomodoro').default('stopwatch'),
  clientId: Joi.string().uuid().required(),
});

exports.listSessions = Joi.object({
  unitId: objectId,
  from: Joi.date().iso(),
  to: Joi.date().iso(),
});