const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Transaction = require('../models/Transaction');

// ------------------------------------------------------------------
// @route    GET /api/dashboard
// @desc     Get a summary dashboard for the logged-in parent
// @access   Private
// ------------------------------------------------------------------
router.get('/', auth, async (req, res) => {
  try {
    const [user, enrollments, transactions] = await Promise.all([
      User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires'),
      Enrollment.find({ userId: req.user.id }).populate('courseId'),
      Transaction.find({ userId: req.user.id }).sort({ paidAt: -1 })
    ]);

    // Unique children enrolled
    const children = [...new Set(enrollments.map((e) => e.childName))];

    // Total spend
    const totalSpent = transactions
      .filter((t) => t.status === 'paid')
      .reduce((sum, t) => sum + t.amount, 0);

    // Active vs completed enrollments
    const activeEnrollments = enrollments.filter((e) => e.status === 'active');
    const completedEnrollments = enrollments.filter((e) => e.status === 'completed');

    res.json({
      user,
      summary: {
        totalChildren: children.length,
        children,
        totalEnrollments: enrollments.length,
        activeEnrollments: activeEnrollments.length,
        completedEnrollments: completedEnrollments.length,
        totalSpent: parseFloat(totalSpent.toFixed(2))
      },
      recentTransactions: transactions.slice(0, 5),
      enrollments
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
