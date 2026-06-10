const User = require('../models/User');

// Middleware: must be used AFTER the `auth` middleware (req.user must be set)
module.exports = async function adminOnly(req, res, next) {
  try {
    const user = await User.findById(req.user.id).select('role');

    if (!user || user.role !== 'admin') {
      return res.status(403).json({ msg: 'Access denied: Admins only' });
    }

    next();
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
