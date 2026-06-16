const Calculation = require('../models/Calculation');
const calc = require('../services/calculatorService');

// Helper to save calculation (non-blocking)
const saveCalc = (type, input, result, userId, ip) => {
  Calculation.create({ userId: userId || null, calculatorType: type, input, result, ipAddress: ip }).catch(() => {});
};

// POST /api/calculator/sgpa
const sgpa = async (req, res, next) => {
  try {
    const { subjects } = req.body;
    const result = calc.calculateSGPA(subjects);
    saveCalc('sgpa', { subjects }, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// POST /api/calculator/cgpa
const cgpa = async (req, res, next) => {
  try {
    const { semesters } = req.body;
    const result = calc.calculateCGPA(semesters);
    saveCalc('cgpa', { semesters }, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// POST /api/calculator/cgpa-to-percentage
const cgpaToPercentage = async (req, res, next) => {
  try {
    const { cgpa: cgpaVal, formula } = req.body;
    const result = calc.cgpaToPercentage(cgpaVal, formula);
    saveCalc('cgpa_to_percentage', { cgpa: cgpaVal, formula }, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// POST /api/calculator/percentage-to-cgpa
const percentageToCGPA = async (req, res, next) => {
  try {
    const { percentage, formula } = req.body;
    const result = calc.percentageToCGPA(percentage, formula);
    saveCalc('percentage_to_cgpa', { percentage, formula }, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// POST /api/calculator/attendance
const attendance = async (req, res, next) => {
  try {
    const { totalClasses, attendedClasses } = req.body;
    const result = calc.calculateAttendance(Number(totalClasses), Number(attendedClasses));
    saveCalc('attendance', { totalClasses, attendedClasses }, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// GET /api/calculator/history
const history = async (req, res, next) => {
  try {
    const { type, limit = 20, page = 1 } = req.query;
    const filter = { userId: req.user._id };
    if (type) filter.calculatorType = type;

    const total = await Calculation.countDocuments(filter);
    const records = await Calculation.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit));

    res.json({ success: true, total, page: Number(page), records });
  } catch (e) {
    next(e);
  }
};

module.exports = { sgpa, cgpa, cgpaToPercentage, percentageToCGPA, attendance, history };
