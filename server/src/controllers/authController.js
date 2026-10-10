const User = require('../models/User');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { signToken } = require('../middleware/auth');

const send = (res, status, user) => res.status(status).json({ token: signToken(user), user });

exports.register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.findOne({ email })) throw new AppError('An account with this email already exists.', 409);
  // Role is never taken from the request body: public sign-ups are always customers.
  const user = await User.create({ name, email, password, role: 'user' });
  send(res, 201, user);
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new AppError('Incorrect email or password.', 401);
  }
  send(res, 200, user);
});

exports.me = (req, res) => res.json({ user: req.user });
