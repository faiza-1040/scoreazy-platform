const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // Get token from header
  let token = req.header('Authorization');

  // Support Cookie or query token if headers not present
  if (!token && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';').reduce((acc, cookie) => {
      const parts = cookie.split('=');
      acc[parts[0].trim()] = (parts[1] || '').trim();
      return acc;
    }, {});
    token = cookies['token'];
  }

  // Support Bearer prefix
  if (token && token.startsWith('Bearer ')) {
    token = token.slice(7, token.length).trim();
  }

  // Check if no token
  if (!token) {
    return res.status(411).json({ msg: 'No token, authorization denied' });
  }

  // Verify token
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'scoreazy_super_secret_key_12345');
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: 'Token is not valid' });
  }
};
