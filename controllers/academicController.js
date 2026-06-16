const AcademicRecord = require('../models/AcademicRecord');

// POST /api/academic/create
const createRecord = async (req, res, next) => {
  try {
    const { semester, sgpa, credits, cgpa, percentage, subjects, notes } = req.body;

    // Check duplicate semester
    const existing = await AcademicRecord.findOne({ userId: req.user._id, semester });
    if (existing) {
      return res.status(409).json({ success: false, message: `Semester ${semester} record already exists. Use update instead.` });
    }

    const record = await AcademicRecord.create({
      userId: req.user._id,
      semester, sgpa, credits, cgpa, percentage, subjects, notes,
    });

    res.status(201).json({ success: true, message: 'Academic record created.', record });
  } catch (error) {
    next(error);
  }
};

// GET /api/academic/all
const getAllRecords = async (req, res, next) => {
  try {
    const records = await AcademicRecord.find({ userId: req.user._id }).sort({ semester: 1 });

    // Compute overall CGPA
    const avgCGPA =
      records.length > 0
        ? (records.reduce((sum, r) => sum + r.sgpa, 0) / records.length).toFixed(2)
        : null;

    res.json({ success: true, count: records.length, cgpa: avgCGPA, records });
  } catch (error) {
    next(error);
  }
};

// GET /api/academic/:id
const getRecord = async (req, res, next) => {
  try {
    const record = await AcademicRecord.findOne({ _id: req.params.id, userId: req.user._id });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    res.json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

// PUT /api/academic/update/:id
const updateRecord = async (req, res, next) => {
  try {
    const record = await AcademicRecord.findOneAndUpdate(
      { _id: req.params.id, userId: req.user._id },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    res.json({ success: true, message: 'Record updated.', record });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/academic/delete/:id
const deleteRecord = async (req, res, next) => {
  try {
    const record = await AcademicRecord.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Record not found.' });
    }
    res.json({ success: true, message: 'Record deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createRecord, getAllRecords, getRecord, updateRecord, deleteRecord };
