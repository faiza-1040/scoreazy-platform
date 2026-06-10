const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const User = require('../models/User');
const Enrollment = require('../models/Enrollment');
const Transaction = require('../models/Transaction');
const Course = require('../models/Course');
const Coupon = require('../models/Coupon');

// ------------------------------------------------------------------
// @route    GET /api/admin/users
// @desc     Get all users (paginated)
// @access   Admin
// ------------------------------------------------------------------
router.get('/users', auth, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find().select('-password -resetPasswordToken -resetPasswordExpires').skip(skip).limit(limit),
      User.countDocuments()
    ]);

    res.json({ total, page, totalPages: Math.ceil(total / limit), users });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    GET /api/admin/enrollments
// @desc     Get all enrollments across all users
// @access   Admin
// ------------------------------------------------------------------
router.get('/enrollments', auth, adminOnly, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [enrollments, total] = await Promise.all([
      Enrollment.find()
        .populate('userId', 'name email')
        .populate('courseId', 'title price')
        .sort({ enrolledAt: -1 })
        .skip(skip)
        .limit(limit),
      Enrollment.countDocuments()
    ]);

    res.json({ total, page, totalPages: Math.ceil(total / limit), enrollments });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    GET /api/admin/stats
// @desc     Platform-wide statistics
// @access   Admin
// ------------------------------------------------------------------
router.get('/stats', auth, adminOnly, async (req, res) => {
  try {
    const [totalUsers, totalCourses, totalEnrollments, totalRevenue] = await Promise.all([
      User.countDocuments(),
      Course.countDocuments(),
      Enrollment.countDocuments(),
      Transaction.aggregate([
        { $match: { status: 'paid' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    const revenue = totalRevenue.length > 0 ? parseFloat(totalRevenue[0].total.toFixed(2)) : 0;

    res.json({ totalUsers, totalCourses, totalEnrollments, totalRevenue: revenue });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    POST /api/admin/coupons
// @desc     Create a new coupon code
// @access   Admin
// ------------------------------------------------------------------
router.post(
  '/coupons',
  auth,
  adminOnly,
  [
    body('code').trim().notEmpty().withMessage('Coupon code is required'),
    body('discountPercent').isInt({ min: 1, max: 100 }).withMessage('discountPercent must be between 1 and 100'),
    body('expiresAt').isISO8601().withMessage('expiresAt must be a valid ISO 8601 date'),
    body('usageLimit').optional().isInt({ min: 1 }).withMessage('usageLimit must be a positive integer')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { code, discountPercent, expiresAt, usageLimit } = req.body;

    try {
      const existing = await Coupon.findOne({ code: code.toUpperCase() });
      if (existing) {
        return res.status(400).json({ msg: 'Coupon code already exists' });
      }

      const coupon = new Coupon({
        code: code.toUpperCase(),
        discountPercent,
        expiresAt: new Date(expiresAt),
        usageLimit: usageLimit || null
      });

      await coupon.save();

      res.status(201).json({ msg: 'Coupon created successfully', coupon });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    GET /api/admin/coupons
// @desc     List all coupons
// @access   Admin
// ------------------------------------------------------------------
router.get('/coupons', auth, adminOnly, async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    DELETE /api/admin/coupons/:id
// @desc     Delete a coupon
// @access   Admin
// ------------------------------------------------------------------
router.delete('/coupons/:id', auth, adminOnly, async (req, res) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({ msg: 'Coupon not found' });
    }

    res.json({ msg: 'Coupon deleted successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
