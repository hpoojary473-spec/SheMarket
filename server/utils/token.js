const jwt = require('jsonwebtoken');

function signToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email
    },
    process.env.JWT_SECRET || 'dev-secret',
    { expiresIn: '7d' }
  );
}

module.exports = { signToken };
