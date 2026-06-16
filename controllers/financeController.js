const Calculation = require('../models/Calculation');
const calc = require('../services/calculatorService');

const saveCalc = (type, input, result, userId, ip) => {
  Calculation.create({ userId: userId || null, calculatorType: type, input, result, ipAddress: ip }).catch(() => {});
};

// POST /api/finance/emi
const emi = async (req, res, next) => {
  try {
    const { loanAmount, annualInterestRate, tenureMonths } = req.body;
    const result = calc.calculateEMI(Number(loanAmount), Number(annualInterestRate), Number(tenureMonths));
    saveCalc('emi', req.body, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// POST /api/finance/sip
const sip = async (req, res, next) => {
  try {
    const { monthlyInvestment, annualInterestRate, durationMonths } = req.body;
    const result = calc.calculateSIP(Number(monthlyInvestment), Number(annualInterestRate), Number(durationMonths));
    saveCalc('sip', req.body, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// POST /api/finance/fd
const fd = async (req, res, next) => {
  try {
    const { principal, annualRate, years, compoundingFrequency } = req.body;
    const result = calc.calculateFD(Number(principal), Number(annualRate), Number(years), compoundingFrequency);
    saveCalc('fd', req.body, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// POST /api/finance/rd
const rd = async (req, res, next) => {
  try {
    const { monthlyDeposit, annualRate, months } = req.body;
    const result = calc.calculateRD(Number(monthlyDeposit), Number(annualRate), Number(months));
    saveCalc('rd', req.body, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

// POST /api/finance/salary
const salary = async (req, res, next) => {
  try {
    const { annualCTC } = req.body;
    const result = calc.calculateSalary(Number(annualCTC));
    saveCalc('salary', req.body, result, req.user?._id, req.ip);
    res.json({ success: true, ...result });
  } catch (e) {
    next(e);
  }
};

module.exports = { emi, sip, fd, rd, salary };
