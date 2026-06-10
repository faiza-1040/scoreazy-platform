const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const Transaction = require('../models/Transaction');
const Enrollment = require('../models/Enrollment');
const Coupon = require('../models/Coupon');

// ------------------------------------------------------------------
// @route    GET /api/billing/transactions
// @desc     Get all transactions for the logged-in user
// @access   Private
// ------------------------------------------------------------------
router.get('/transactions', auth, async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user.id })
      .populate({
        path: 'enrollmentId',
        populate: {
          path: 'courseId'
        }
      })
      .sort({ paidAt: -1 });

    res.json(transactions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    GET /api/billing/transactions/:id
// @desc     Get a single transaction by ID
// @access   Private
// ------------------------------------------------------------------
router.get('/transactions/:id', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id })
      .populate({
        path: 'enrollmentId',
        populate: {
          path: 'courseId'
        }
      });

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    res.json(transaction);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    GET /api/billing/transactions/:id/receipt
// @desc     Get a formatted receipt for a single transaction
// @access   Private
// ------------------------------------------------------------------
router.get('/transactions/:id/receipt', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.user.id })
      .populate({
        path: 'enrollmentId',
        populate: {
          path: 'courseId'
        }
      })
      .populate('userId', 'name email');

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    const enrollment = transaction.enrollmentId;
    const course = enrollment ? enrollment.courseId : null;

    const receipt = {
      receiptNumber: transaction.transactionId,
      paidAt: transaction.paidAt,
      status: transaction.status,
      customer: {
        name: transaction.userId.name,
        email: transaction.userId.email
      },
      child: {
        name: enrollment ? enrollment.childName : 'N/A',
        age: enrollment ? enrollment.childAge : 'N/A'
      },
      course: {
        title: course ? course.title : 'N/A',
        ageGroup: course ? course.ageGroup : 'N/A',
        duration: course ? course.duration : 'N/A'
      },
      amount: transaction.amount,
      currency: 'USD'
    };

    res.json(receipt);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    POST /api/billing/refund/:transactionId
// @desc     Request a refund for a transaction (logs the request)
// @access   Private
// ------------------------------------------------------------------
router.post('/refund/:transactionId', auth, async (req, res) => {
  try {
    const transaction = await Transaction.findOne({
      transactionId: req.params.transactionId,
      userId: req.user.id
    });

    if (!transaction) {
      return res.status(404).json({ msg: 'Transaction not found' });
    }

    if (transaction.status !== 'paid') {
      return res.status(400).json({ msg: `Cannot refund a transaction with status: ${transaction.status}` });
    }

    transaction.status = 'pending';   // pending = refund requested / under review
    await transaction.save();

    res.json({ msg: 'Refund request submitted. Our team will review it shortly.', transaction });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    POST /api/billing/apply-coupon
// @desc     Validate a coupon and return the discounted price for a course
// @access   Private
// ------------------------------------------------------------------
router.post(
  '/apply-coupon',
  auth,
  [
    body('couponCode').trim().notEmpty().withMessage('Coupon code is required'),
    body('courseId').notEmpty().withMessage('courseId is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { couponCode, courseId } = req.body;

    try {
      const Course = require('../models/Course');
      const course = await Course.findById(courseId);

      if (!course) {
        return res.status(404).json({ msg: 'Course not found' });
      }

      const coupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase() });

      if (!coupon) {
        return res.status(400).json({ msg: 'Invalid coupon code' });
      }

      if (coupon.expiresAt < new Date()) {
        return res.status(400).json({ msg: 'Coupon has expired' });
      }

      if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
        return res.status(400).json({ msg: 'Coupon usage limit reached' });
      }

      const originalPrice = course.price;
      const discountAmount = parseFloat((originalPrice * coupon.discountPercent / 100).toFixed(2));
      const finalPrice = parseFloat((originalPrice - discountAmount).toFixed(2));

      res.json({
        valid: true,
        couponCode: coupon.code,
        discountPercent: coupon.discountPercent,
        originalPrice,
        discountAmount,
        finalPrice
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

module.exports = router;
