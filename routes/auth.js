const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');
const auth = require('../middleware/auth');
const User = require('../models/User');
const { sendMail } = require('../utils/mailer');

// Rate limiter: max 10 auth attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { msg: 'Too many requests from this IP, please try again after 15 minutes' }
});

// Helper: extract first validation error as a plain string
const firstError = (req) => {
  const result = validationResult(req);
  if (result.isEmpty()) return null;
  return result.array()[0].msg;
};

// Helper: sign a JWT and return it
const signToken = (userId) => {
  return new Promise((resolve, reject) => {
    const payload = { user: { id: userId } };
    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'supersecretjwtkey123',
      { expiresIn: '7d' },
      (err, token) => {
        if (err) reject(err);
        else resolve(token);
      }
    );
  });
};

// ------------------------------------------------------------------
// @route    POST /api/auth/signup
// @desc     Register a new user & send email verification link
// @access   Public
// ------------------------------------------------------------------
router.post(
  '/signup',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    const error = firstError(req);
    if (error) {
      return res.status(400).json({ msg: error });
    }

    const { name, email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (user) {
        // If registered but not yet verified, regenerate token and resend
        if (!user.isVerified) {
          const verificationToken = crypto.randomBytes(32).toString('hex');
          user.verificationToken = verificationToken;
          await user.save();

          const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?verify=${verificationToken}`;
          console.log(`[DEV] Resend verify URL for ${email}: ${verifyUrl}`);

          // Fire-and-forget — email failure does NOT crash the response
          sendMail(email, '📧 Verify your Scoreazy account', buildVerificationEmail(user.name, verifyUrl))
            .catch(err => console.error('Resend email failed:', err.message));

          return res.status(400).json({
            msg: 'This email is registered but not verified. A new verification link has been sent to your inbox.',
            emailSent: true,
            verifyUrl  // available in dev so you can click directly
          });
        }
        return res.status(400).json({ msg: 'An account with this email already exists. Please log in.' });
      }

      // New user — generate verification token
      const verificationToken = crypto.randomBytes(32).toString('hex');

      user = new User({ name, email, password, verificationToken, isVerified: false });

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(password, salt);
      await user.save();

      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?verify=${verificationToken}`;
      console.log(`[DEV] Verify URL for ${email}: ${verifyUrl}`);

      // Fire-and-forget — email failure does NOT crash the response
      sendMail(email, '📧 Verify your Scoreazy account', buildVerificationEmail(name, verifyUrl))
        .catch(err => console.error('Signup email failed:', err.message));

      res.json({
        msg: `Account created! A verification email has been sent to ${email}. Click the link in your inbox to activate your account.`,
        emailSent: true,
        verifyUrl  // available in dev so you can click directly if email fails
      });

    } catch (err) {
      console.error('Signup error:', err.message);
      res.status(500).json({ msg: 'Server error. Please try again later.' });
    }
  }
);

// ------------------------------------------------------------------
// @route    GET /api/auth/verify/:token
// @desc     Verify email address from link & auto-login user
// @access   Public
// ------------------------------------------------------------------
router.get('/verify/:token', async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });

    if (!user) {
      return res.status(400).json({ msg: 'Verification link is invalid or has already been used.' });
    }

    user.isVerified = true;
    user.verificationToken = null;
    await user.save();

    // Auto-login: return a JWT so the frontend can log them in immediately
    const token = await signToken(user.id);

    // Send welcome email now that they are verified
    sendMail(
      user.email,
      '🎉 Welcome to Scoreazy — You\'re Verified!',
      buildWelcomeEmail(user.name)
    ).catch((err) => console.error('Welcome email failed:', err.message));

    res.json({
      msg: 'Email verified successfully! You are now logged in.',
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    POST /api/auth/login
// @desc     Authenticate user & get token
// @access   Public
// ------------------------------------------------------------------
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().withMessage('Please enter a valid email address'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    const error = firstError(req);
    if (error) {
      return res.status(400).json({ msg: error });
    }

    const { email, password } = req.body;

    try {
      let user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ msg: 'No account found with this email. Please sign up first.' });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Incorrect password. Please try again.' });
      }

      // Block login if email not verified
      if (!user.isVerified) {
        return res.status(403).json({
          msg: 'Your email is not verified yet. Please check your inbox and click the verification link.',
          notVerified: true
        });
      }

      const token = await signToken(user.id);

      res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    GET /api/auth/me
// @desc     Get current logged-in user profile
// @access   Private
// ------------------------------------------------------------------
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password -resetPasswordToken -resetPasswordExpires -verificationToken');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// ------------------------------------------------------------------
// @route    PUT /api/auth/me
// @desc     Update current user profile (name, email, phone)
// @access   Private
// ------------------------------------------------------------------
router.put(
  '/me',
  auth,
  [
    body('name').optional().trim().notEmpty().withMessage('Name cannot be blank'),
    body('email').optional().isEmail().withMessage('Please enter a valid email'),
    body('phone').optional().trim()
  ],
  async (req, res) => {
    const error = firstError(req);
    if (error) {
      return res.status(400).json({ msg: error });
    }

    const { name, email, phone } = req.body;

    try {
      const updateFields = {};
      if (name) updateFields.name = name;
      if (phone !== undefined) updateFields.phone = phone;

      if (email) {
        const existing = await User.findOne({ email });
        if (existing && existing.id !== req.user.id) {
          return res.status(400).json({ msg: 'Email already in use by another account' });
        }
        updateFields.email = email;
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { $set: updateFields },
        { new: true }
      ).select('-password -resetPasswordToken -resetPasswordExpires -verificationToken');

      res.json(user);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    PUT /api/auth/change-password
// @desc     Change password (requires current password)
// @access   Private
// ------------------------------------------------------------------
router.put(
  '/change-password',
  auth,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  async (req, res) => {
    const error = firstError(req);
    if (error) {
      return res.status(400).json({ msg: error });
    }

    const { currentPassword, newPassword } = req.body;

    try {
      const user = await User.findById(req.user.id);

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return res.status(400).json({ msg: 'Current password is incorrect' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);

      await user.save();

      res.json({ msg: 'Password changed successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    POST /api/auth/forgot-password
// @desc     Send password reset link to user's email
// @access   Public
// ------------------------------------------------------------------
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().withMessage('Please enter a valid email address')],
  async (req, res) => {
    const error = firstError(req);
    if (error) {
      return res.status(400).json({ msg: error });
    }

    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      // Always respond the same to prevent user enumeration
      if (!user) {
        return res.json({ msg: 'If that email exists, a reset link has been sent' });
      }

      // Generate a secure random token (expires in 1 hour)
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.resetPasswordToken = resetToken;
      user.resetPasswordExpires = Date.now() + 60 * 60 * 1000; // 1 hour

      await user.save();

      const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?reset=${resetToken}`;

      await sendMail(
        email,
        '🔐 Reset Your Scoreazy Password',
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
          <h2 style="color:#4f46e5;">Password Reset Request</h2>
          <p style="color:#555;">Hi <strong>${user.name}</strong>, we received a request to reset your Scoreazy account password.</p>
          <p style="color:#555;">Click the button below to set a new password. This link expires in <strong>1 hour</strong>.</p>
          <a href="${resetUrl}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Reset Password</a>
          <p style="margin-top:20px;color:#999;font-size:13px;">Or copy and paste this URL into your browser:<br/><span style="color:#4f46e5;">${resetUrl}</span></p>
          <hr style="margin-top:30px;border:none;border-top:1px solid #eee;" />
          <p style="color:#aaa;font-size:12px;">If you did not request a password reset, you can safely ignore this email.</p>
        </div>`
      );

      res.json({ msg: 'If that email exists, a reset link has been sent' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// @route    POST /api/auth/reset-password
// @desc     Reset password using token from email link
// @access   Public
// ------------------------------------------------------------------
router.post(
  '/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
  ],
  async (req, res) => {
    const error = firstError(req);
    if (error) {
      return res.status(400).json({ msg: error });
    }

    const { token, newPassword } = req.body;

    try {
      const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ msg: 'Reset token is invalid or has expired' });
      }

      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(newPassword, salt);
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;

      await user.save();

      // Send confirmation email
      sendMail(
        user.email,
        '✅ Your Scoreazy Password Has Been Reset',
        `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:30px;border:1px solid #eee;border-radius:10px;">
          <h2 style="color:#4f46e5;">Password Successfully Reset</h2>
          <p style="color:#555;">Hi <strong>${user.name}</strong>, your Scoreazy password has been changed successfully.</p>
          <p style="color:#555;">If you did not make this change, please contact us immediately.</p>
          <hr style="margin-top:30px;border:none;border-top:1px solid #eee;" />
          <p style="color:#aaa;font-size:12px;">Scoreazy Security Team</p>
        </div>`
      ).catch((err) => console.error('Password reset confirmation email failed:', err.message));

      res.json({ msg: 'Password has been reset successfully. You can now log in.' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server error');
    }
  }
);

// ------------------------------------------------------------------
// Email HTML builders
// ------------------------------------------------------------------
function buildVerificationEmail(name, verifyUrl) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">🎓 Scoreazy</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Confidence Building for Kids</p>
      </div>
      <div style="background:#fff;padding:40px 30px;">
        <h2 style="color:#1a1a2e;margin-top:0;">Hi ${name}, confirm your email! 👋</h2>
        <p style="color:#555;line-height:1.6;">
          Thanks for signing up with Scoreazy! You're just one step away from unlocking confidence-building courses for your child.
        </p>
        <p style="color:#555;line-height:1.6;">Click the button below to verify your email address and activate your account:</p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${verifyUrl}"
            style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold;">
            ✅ Verify My Email
          </a>
        </div>
        <p style="color:#999;font-size:13px;line-height:1.6;">
          Or copy this link into your browser:<br/>
          <span style="color:#4f46e5;word-break:break-all;">${verifyUrl}</span>
        </p>
        <p style="color:#999;font-size:12px;margin-top:24px;">
          This link does not expire. If you did not create an account, you can safely ignore this email.
        </p>
      </div>
      <div style="background:#f9f9f9;padding:20px 30px;text-align:center;">
        <p style="color:#bbb;font-size:12px;margin:0;">© 2026 Scoreazy. All rights reserved.</p>
      </div>
    </div>
  `;
}

function buildWelcomeEmail(name) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:0;border-radius:12px;overflow:hidden;">
      <div style="background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:40px 30px;text-align:center;">
        <h1 style="color:#fff;margin:0;font-size:28px;">🎓 Scoreazy</h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;">Confidence Building for Kids</p>
      </div>
      <div style="background:#fff;padding:40px 30px;">
        <h2 style="color:#1a1a2e;margin-top:0;">Welcome aboard, ${name}! 🎉</h2>
        <p style="color:#555;line-height:1.6;">
          Your email has been verified and your Scoreazy account is now fully active!
        </p>
        <p style="color:#555;line-height:1.6;">
          You can now browse our confidence-building courses and enroll your child today.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}"
            style="display:inline-block;padding:14px 36px;background:linear-gradient(135deg,#4f46e5,#7c3aed);color:#fff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:bold;">
            🚀 Browse Courses
          </a>
        </div>
      </div>
      <div style="background:#f9f9f9;padding:20px 30px;text-align:center;">
        <p style="color:#bbb;font-size:12px;margin:0;">© 2026 Scoreazy. All rights reserved.</p>
      </div>
    </div>
  `;
}

module.exports = router;
