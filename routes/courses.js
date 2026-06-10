const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const Course = require('../models/Course');
const Enrollment = require('../models/Enrollment');
const Transaction = require('../models/Transaction');
const Progress = require('../models/Progress');
const Review = require('../models/Review');

// ------------------------------------------------------------------
// @route    GET /api/courses
// @desc     Get all courses (supports ?ageGroup=&maxPrice=&page=&limit=)
// @access   Public
// ------------------------------------------------------------------
router.get(
  '/',
  [
    query('maxPrice').optional().isNumeric().withMessage('maxPrice must be a number'),
    query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('limit must be between 1 and 50')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const filter = {};

      if (req.query.ageGroup) {
        filter.ageGroup = { $regex: req.query.ageGroup, $options: 'i' };
      }

      if (req.query.maxPrice) {
        filter.price = { $lte: parseFloat(req.query.maxPrice) };
      }

      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 10;
      const skip = (page - 1) * limit;

      const [courses, total] = await Promise.all([
        Course.find(filter).skip(skip).limit(limit),
        Course.countDocuments(filter)
      ]);

      res.json({
        total,
        page,
        totalPages: Math.ceil(total / limit),
        courses
      });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    GET /api/courses/:id
// @desc     Get a single course by ID with full syllabus & avg rating
// @access   Public
// ------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ msg: 'Course not found' });
    }

    // Aggregate average rating from reviews
    const ratingData = await Review.aggregate([
      { $match: { courseId: course._id } },
      { $group: { _id: null, avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } }
    ]);

    const avgRating = ratingData.length > 0 ? parseFloat(ratingData[0].avgRating.toFixed(1)) : null;
    const totalReviews = ratingData.length > 0 ? ratingData[0].totalReviews : 0;

    res.json({ ...course.toObject(), avgRating, totalReviews });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    POST /api/courses/enroll
// @desc     Enroll in a course & generate a transaction record
// @access   Private
// ------------------------------------------------------------------
router.post(
  '/enroll',
  auth,
  [
    body('courseId').notEmpty().withMessage('courseId is required'),
    body('childName').trim().notEmpty().withMessage('childName is required'),
    body('childAge').isInt({ min: 1, max: 18 }).withMessage('childAge must be a number between 1 and 18')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { courseId, childName, childAge, couponCode } = req.body;

    try {
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ msg: 'Course not found' });
      }

      // Check if already enrolled in this course for this childName
      const existingEnrollment = await Enrollment.findOne({
        userId: req.user.id,
        courseId,
        childName: childName.trim()
      });

      if (existingEnrollment) {
        return res.status(400).json({ msg: 'Child is already enrolled in this course' });
      }

      // Handle optional coupon discount
      let finalAmount = course.price;
      let couponApplied = null;

      if (couponCode) {
        const Coupon = require('../models/Coupon');
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

        finalAmount = parseFloat((course.price * (1 - coupon.discountPercent / 100)).toFixed(2));
        coupon.usedCount += 1;
        await coupon.save();
        couponApplied = { code: coupon.code, discountPercent: coupon.discountPercent };
      }

      // Create Enrollment
      const enrollment = new Enrollment({
        userId: req.user.id,
        courseId,
        childName: childName.trim(),
        childAge: parseInt(childAge)
      });

      await enrollment.save();

      // Create Simulated Transaction
      const transactionId = `TXN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
      const transaction = new Transaction({
        userId: req.user.id,
        enrollmentId: enrollment.id,
        amount: finalAmount,
        status: 'paid',
        transactionId
      });

      await transaction.save();

      // Initialize progress record for the enrollment
      const progress = new Progress({ enrollmentId: enrollment.id });
      await progress.save();

      res.json({
        msg: 'Enrollment and payment successful!',
        enrollment,
        transaction,
        couponApplied
      });

    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    GET /api/courses/enrollments
// @desc     Get all enrollments for the logged-in user
// @access   Private
// ------------------------------------------------------------------
router.get('/enrollments', auth, async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.user.id }).populate('courseId');
    res.json(enrollments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    PATCH /api/courses/enrollments/:id/complete
// @desc     Mark an enrollment as completed
// @access   Private
// ------------------------------------------------------------------
router.patch('/enrollments/:id/complete', auth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ _id: req.params.id, userId: req.user.id });

    if (!enrollment) {
      return res.status(404).json({ msg: 'Enrollment not found' });
    }

    enrollment.status = 'completed';
    await enrollment.save();

    res.json({ msg: 'Enrollment marked as completed', enrollment });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    POST /api/courses/enrollments/:id/progress
// @desc     Mark a syllabus day as completed
// @access   Private
// ------------------------------------------------------------------
router.post(
  '/enrollments/:id/progress',
  auth,
  [body('day').isInt({ min: 1 }).withMessage('day must be a positive integer')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { day } = req.body;

    try {
      const enrollment = await Enrollment.findOne({ _id: req.params.id, userId: req.user.id });

      if (!enrollment) {
        return res.status(404).json({ msg: 'Enrollment not found' });
      }

      let progress = await Progress.findOne({ enrollmentId: req.params.id });

      if (!progress) {
        progress = new Progress({ enrollmentId: req.params.id });
      }

      if (!progress.completedDays.includes(day)) {
        progress.completedDays.push(day);
      }

      progress.lastActivity = Date.now();
      await progress.save();

      res.json({ msg: `Day ${day} marked as completed`, progress });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    GET /api/courses/enrollments/:id/progress
// @desc     Get progress for a specific enrollment
// @access   Private
// ------------------------------------------------------------------
router.get('/enrollments/:id/progress', auth, async (req, res) => {
  try {
    const enrollment = await Enrollment.findOne({ _id: req.params.id, userId: req.user.id });

    if (!enrollment) {
      return res.status(404).json({ msg: 'Enrollment not found' });
    }

    const progress = await Progress.findOne({ enrollmentId: req.params.id });

    res.json(progress || { enrollmentId: req.params.id, completedDays: [], lastActivity: null });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    POST /api/courses/:id/review
// @desc     Submit or update a review for an enrolled course
// @access   Private
// ------------------------------------------------------------------
router.post(
  '/:id/review',
  auth,
  [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('comment').optional().trim().isLength({ max: 1000 }).withMessage('Comment must be under 1000 characters')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { rating, comment } = req.body;

    try {
      const course = await Course.findById(req.params.id);
      if (!course) {
        return res.status(404).json({ msg: 'Course not found' });
      }

      // Ensure user is enrolled in this course
      const enrollment = await Enrollment.findOne({ userId: req.user.id, courseId: req.params.id });
      if (!enrollment) {
        return res.status(403).json({ msg: 'You must be enrolled to leave a review' });
      }

      const review = await Review.findOneAndUpdate(
        { userId: req.user.id, courseId: req.params.id },
        { rating, comment, createdAt: Date.now() },
        { upsert: true, new: true }
      );

      res.json({ msg: 'Review submitted successfully', review });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    GET /api/courses/:id/reviews
// @desc     Get all reviews for a course
// @access   Public
// ------------------------------------------------------------------
router.get('/:id/reviews', async (req, res) => {
  try {
    const reviews = await Review.find({ courseId: req.params.id })
      .populate('userId', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

module.exports = router;
