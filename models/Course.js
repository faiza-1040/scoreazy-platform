const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  ageGroup: {
    type: String,
    required: true,
    trim: true
  },
  price: {
    type: Number,
    required: true
  },
  duration: {
    type: String,
    required: true,
    trim: true
  },
  syllabus: [
    {
      day: { type: Number, required: true },
      title: { type: String, required: true },
      description: { type: String, required: true }
    }
  ]
});

module.exports = mongoose.model('Course', CourseSchema);
