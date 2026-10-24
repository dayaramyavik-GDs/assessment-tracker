const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const env = require('../config/env');
const AppError = require('../utils/AppError');

// Comparing against a dummy hash when the email is unknown keeps response times
// similar, so attackers can't tell which emails are registered from timing.
const DUMMY_HASH = bcrypt.hashSync('timing-safe-dummy-password', env.bcryptRounds);

const signToken = (user) =>
  jwt.sign({}, env.jwtSecret, { subject: String(user._id), expiresIn: env.jwtExpiresIn, algorithm: 'HS256' });

exports.register = async (req, res) => {
  const { name, email, password } = req.valid.body;
  if (await User.exists({ email })) {
    throw new AppError(409, 'EMAIL_TAKEN', 'An account with this email already exists.');
  }
  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);
  const user = await User.create({ name, email, passwordHash });
  res.status(201).json({ token: signToken(user), user: user.toPublic() });
};

exports.login = async (req, res) => {
  const { email, password } = req.valid.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
  if (!user || !ok) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }
  res.json({ token: signToken(user), user: user.toPublic() });
};

exports.me = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) throw new AppError(401, 'UNAUTHORISED', 'Please log in.');
  res.json({ user: user.toPublic() });
};