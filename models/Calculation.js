const mongoose = require('mongoose');

const calculationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    calculatorType: {
      type: String,
      required: true,
      enum: [
        'sgpa', 'cgpa', 'cgpa_to_percentage', 'percentage_to_cgpa',
        'attendance', 'emi', 'sip', 'fd', 'rd', 'salary',
      ],
    },
    input: {
      type: mongoose.Schema.Types.Mixed,
    },
    result: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    ipAddress: String,
  },
  {
    timestamps: true,
  }
);

calculationSchema.index({ userId: 1, createdAt: -1 });
calculationSchema.index({ calculatorType: 1, createdAt: -1 });

module.exports = mongoose.model('Calculation', calculationSchema);
