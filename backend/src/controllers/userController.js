const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Unit = require('../models/Unit');
const Assessment = require('../models/Assessment');
const StudySession = require('../models/StudySession');
const env = require('../config/env');
const AppError = require('../utils/AppError');

async function loadWithPassword(id, password) {
  const user = await User.findById(id).select('+passwordHash');
  if (!user) throw new AppError(401, 'UNAUTHORISED', 'Please log in.');
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new AppError(400, 'WRONG_PASSWORD', 'Your password is incorrect.',
      [{ field: 'password', message: 'Your password is incorrect.' }]);
  }
  return user;
}

exports.updateMe = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError(401, 'UNAUTHORISED', 'Please log in.');
  const { name, settings } = req.valid.body;
  if (name !== undefined) user.name = name;
  if (settings) Object.assign(user.settings, settings);
  await user.save();
  res.json({ user: user.toPublic() });
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.valid.body;
  const user = await loadWithPassword(req.user.id, currentPassword);
  user.passwordHash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await user.save();
  res.status(204).end();
};

exports.deleteMe = async (req, res) => {
  const user = await loadWithPassword(req.user.id, req.valid.body.password);
  const filter = { userId: user._id };
  await Promise.all([StudySession.deleteMany(filter), Assessment.deleteMany(filter), Unit.deleteMany(filter)]);
  await user.deleteOne();
  res.status(204).end();
};