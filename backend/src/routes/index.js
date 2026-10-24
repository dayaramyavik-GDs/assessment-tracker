const { Router } = require('express');
const validate = require('../middleware/validate');
const requireAuth = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimits');
const { idParam } = require('../validators/common');
const vAuth = require('../validators/auth');
const vUser = require('../validators/user');
const vUnit = require('../validators/unit');
const vAssess = require('../validators/assessment');
const vSession = require('../validators/studySession');
const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const units = require('../controllers/unitController');
const assessments = require('../controllers/assessmentController');
const sessions = require('../controllers/studySessionController');
const dashboard = require('../controllers/dashboardController');

const r = Router();
const id = validate(idParam, 'params');

// Public
r.post('/auth/register', authLimiter, validate(vAuth.register), auth.register);
r.post('/auth/login', authLimiter, validate(vAuth.login), auth.login);

// Everything below needs a valid token
r.get('/auth/me', requireAuth, auth.me);

r.patch('/users/me', requireAuth, validate(vUser.updateMe), users.updateMe);
r.put('/users/me/password', requireAuth, validate(vUser.changePassword), users.changePassword);
r.delete('/users/me', requireAuth, validate(vUser.deleteMe), users.deleteMe);

r.get('/units', requireAuth, validate(vUnit.listUnits, 'query'), units.list);
r.post('/units', requireAuth, validate(vUnit.createUnit), units.create);
r.get('/units/:id', requireAuth, id, units.get);
r.patch('/units/:id', requireAuth, id, validate(vUnit.updateUnit), units.update);
r.delete('/units/:id', requireAuth, id, units.remove);

r.get('/assessments', requireAuth, validate(vAssess.listAssessments, 'query'), assessments.list);
r.post('/assessments', requireAuth, validate(vAssess.createAssessment), assessments.create);
r.get('/assessments/:id', requireAuth, id, assessments.get);
r.patch('/assessments/:id', requireAuth, id, validate(vAssess.updateAssessment), assessments.update);
r.delete('/assessments/:id', requireAuth, id, assessments.remove);

r.get('/study-sessions', requireAuth, validate(vSession.listSessions, 'query'), sessions.list);
r.post('/study-sessions', requireAuth, validate(vSession.createSession), sessions.create);
r.delete('/study-sessions/:id', requireAuth, id, sessions.remove);

r.get('/dashboard', requireAuth, dashboard.dashboard);
r.get('/at-risk', requireAuth, dashboard.atRisk);

module.exports = r;