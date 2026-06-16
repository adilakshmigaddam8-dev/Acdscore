const mongoose = require('mongoose');

const academicRecordSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    semester: {
      type: Number,
      required: [true, 'Semester is required'],
      min: [1, 'Semester must be at least 1'],
      max: [12, 'Semester cannot exceed 12'],
    },
    sgpa: {
      type: Number,
      required: [true, 'SGPA is required'],
      min: [0, 'SGPA cannot be negative'],
      max: [10, 'SGPA cannot exceed 10'],
    },
    credits: {
      type: Number,
      default: 0,
      min: 0,
    },
    cgpa: {
      type: Number,
      min: [0, 'CGPA cannot be negative'],
      max: [10, 'CGPA cannot exceed 10'],
    },
    percentage: {
      type: Number,
      min: 0,
      max: 100,
    },
    subjects: [
      {
        name: String,
        credit: Number,
        gradePoint: Number,
      },
    ],
    notes: {
      type: String,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

academicRecordSchema.index({ userId: 1, semester: 1 }, { unique: true });
academicRecordSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('AcademicRecord', academicRecordSchema);
