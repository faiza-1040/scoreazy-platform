const nodemailer = require('nodemailer');

// Gmail SMTP using port 587 + STARTTLS (more widely supported than port 465)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,        // false = STARTTLS (upgrades after connection)
  family: 4,            // FORCE IPv4 (Bypasses the timeout block!)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false  // allow self-signed certs in dev
  }
});

// @desc  Send a generic email
// @param {string} to      - Recipient address
// @param {string} subject - Email subject
// @param {string} html    - HTML body
const sendMail = async (to, subject, html) => {
  const mailOptions = {
    from: `"Scoreazy 🎓" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  };

  await transporter.sendMail(mailOptions);
};

module.exports = { sendMail };
