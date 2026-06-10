require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets from the public folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect Database
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/scoreazy';
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB Connected...'))
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Define Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/courses', require('./routes/courses'));
app.use('/api/billing', require('./routes/billing'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/admin', require('./routes/admin'));

// Fallback to index.html for single-page style navigation if requested
app.get('*', (req, res) => {
  res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('');
  console.log('  🚀 Server is running!');
  console.log('');
  console.log(`  👉 Open in browser: http://localhost:${PORT}`);
  console.log('');
  console.log('  Press Ctrl+C to stop the server.');
  console.log('');
});
