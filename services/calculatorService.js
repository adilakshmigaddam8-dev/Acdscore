// ─── Academic Calculators ───────────────────────────────────────────────────

/**
 * SGPA = Σ(credit × gradePoint) / Σcredits
 * @param {Array<{credit: number, gradePoint: number}>} subjects
 */
const calculateSGPA = (subjects) => {
  if (!subjects || subjects.length === 0) throw new Error('No subjects provided.');

  let totalWeighted = 0;
  let totalCredits = 0;

  for (const s of subjects) {
    if (s.credit <= 0) throw new Error('Credit must be greater than 0.');
    if (s.gradePoint < 0 || s.gradePoint > 10) throw new Error('Grade point must be between 0 and 10.');
    totalWeighted += s.credit * s.gradePoint;
    totalCredits += s.credit;
  }

  const sgpa = totalWeighted / totalCredits;
  return { sgpa: parseFloat(sgpa.toFixed(2)), totalCredits };
};

/**
 * CGPA = average of all semester SGPAs (simple average)
 * @param {Array<{semester: number, sgpa: number, credits?: number}>} semesters
 */
const calculateCGPA = (semesters) => {
  if (!semesters || semesters.length === 0) throw new Error('No semester data provided.');

  // Weighted by credits if provided, else simple average
  const hasCredits = semesters.every((s) => s.credits && s.credits > 0);

  let cgpa;
  if (hasCredits) {
    const totalWeighted = semesters.reduce((sum, s) => sum + s.sgpa * s.credits, 0);
    const totalCredits = semesters.reduce((sum, s) => sum + s.credits, 0);
    cgpa = totalWeighted / totalCredits;
  } else {
    cgpa = semesters.reduce((sum, s) => sum + s.sgpa, 0) / semesters.length;
  }

  return { cgpa: parseFloat(cgpa.toFixed(2)), semesters: semesters.length };
};

/**
 * CGPA to Percentage using common Indian university formulas
 * @param {number} cgpa
 * @param {string} formula - 'standard' | 'anna_university' | 'jntu' | 'vtu' | 'mumbai'
 */
const cgpaToPercentage = (cgpa, formula = 'standard') => {
  if (cgpa < 0 || cgpa > 10) throw new Error('CGPA must be between 0 and 10.');

  const formulaMap = {
    standard: cgpa * 9.5,
    anna_university: cgpa * 10 - 7.5,
    jntu: (cgpa - 0.75) * 10,
    vtu: cgpa * 10,
    mumbai: (cgpa / 10) * 100,
  };

  const percentage = formulaMap[formula] || cgpa * 9.5;
  return {
    percentage: parseFloat(Math.max(0, Math.min(100, percentage)).toFixed(2)),
    formula,
    cgpa,
  };
};

/**
 * Percentage to CGPA
 * @param {number} percentage
 * @param {string} formula
 */
const percentageToCGPA = (percentage, formula = 'standard') => {
  if (percentage < 0 || percentage > 100) throw new Error('Percentage must be between 0 and 100.');

  const formulaMap = {
    standard: percentage / 9.5,
    anna_university: (percentage + 7.5) / 10,
    jntu: percentage / 10 + 0.75,
    vtu: percentage / 10,
    mumbai: (percentage / 100) * 10,
  };

  const cgpa = formulaMap[formula] || percentage / 9.5;
  return {
    cgpa: parseFloat(Math.min(10, cgpa).toFixed(2)),
    formula,
    percentage,
  };
};

/**
 * Attendance percentage
 */
const calculateAttendance = (totalClasses, attendedClasses) => {
  if (totalClasses <= 0) throw new Error('Total classes must be greater than 0.');
  if (attendedClasses < 0) throw new Error('Attended classes cannot be negative.');
  if (attendedClasses > totalClasses) throw new Error('Attended cannot exceed total classes.');

  const attendancePercentage = (attendedClasses / totalClasses) * 100;
  const classesNeededFor75 = Math.max(0, Math.ceil(0.75 * totalClasses - attendedClasses));
  const classesCanSkip = Math.max(
    0,
    Math.floor(attendedClasses - 0.75 * (totalClasses + classesNeededFor75))
  );

  return {
    attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
    totalClasses,
    attendedClasses,
    missedClasses: totalClasses - attendedClasses,
    status: attendancePercentage >= 75 ? 'Safe' : 'Low',
    classesNeededFor75,
    classesCanSkip,
  };
};

// ─── Financial Calculators ───────────────────────────────────────────────────

/**
 * EMI = P × r × (1+r)^n / ((1+r)^n - 1)
 */
const calculateEMI = (loanAmount, annualInterestRate, tenureMonths) => {
  if (loanAmount <= 0) throw new Error('Loan amount must be positive.');
  if (annualInterestRate < 0) throw new Error('Interest rate cannot be negative.');
  if (tenureMonths <= 0) throw new Error('Tenure must be positive.');

  const r = annualInterestRate / 12 / 100;
  let emi;

  if (r === 0) {
    emi = loanAmount / tenureMonths;
  } else {
    emi = (loanAmount * r * Math.pow(1 + r, tenureMonths)) / (Math.pow(1 + r, tenureMonths) - 1);
  }

  const totalPayment = emi * tenureMonths;
  const totalInterest = totalPayment - loanAmount;

  return {
    emi: Math.round(emi),
    totalInterest: Math.round(totalInterest),
    totalPayment: Math.round(totalPayment),
    loanAmount,
    annualInterestRate,
    tenureMonths,
  };
};

/**
 * SIP maturity = P × [(1+r)^n - 1] / r × (1+r)
 */
const calculateSIP = (monthlyInvestment, annualInterestRate, durationMonths) => {
  if (monthlyInvestment <= 0) throw new Error('Monthly investment must be positive.');
  if (annualInterestRate < 0) throw new Error('Interest rate cannot be negative.');
  if (durationMonths <= 0) throw new Error('Duration must be positive.');

  const r = annualInterestRate / 12 / 100;
  let maturityValue;

  if (r === 0) {
    maturityValue = monthlyInvestment * durationMonths;
  } else {
    maturityValue = monthlyInvestment * ((Math.pow(1 + r, durationMonths) - 1) / r) * (1 + r);
  }

  const investedAmount = monthlyInvestment * durationMonths;
  const wealthGain = maturityValue - investedAmount;

  return {
    maturityValue: Math.round(maturityValue),
    investedAmount: Math.round(investedAmount),
    wealthGain: Math.round(wealthGain),
    monthlyInvestment,
    annualInterestRate,
    durationMonths,
  };
};

/**
 * Fixed Deposit (compound interest)
 */
const calculateFD = (principal, annualRate, years, compoundingFrequency = 4) => {
  if (principal <= 0) throw new Error('Principal must be positive.');
  const r = annualRate / 100;
  const n = compoundingFrequency;
  const t = years;

  const maturityAmount = principal * Math.pow(1 + r / n, n * t);
  const totalInterest = maturityAmount - principal;

  return {
    maturityAmount: Math.round(maturityAmount),
    totalInterest: Math.round(totalInterest),
    principal,
    annualRate,
    years,
  };
};

/**
 * Recurring Deposit
 */
const calculateRD = (monthlyDeposit, annualRate, months) => {
  if (monthlyDeposit <= 0) throw new Error('Monthly deposit must be positive.');
  const r = annualRate / 400; // quarterly compounding
  let maturityAmount = 0;

  for (let i = 1; i <= months; i++) {
    maturityAmount += monthlyDeposit * Math.pow(1 + r, months / 3);
  }

  const totalDeposited = monthlyDeposit * months;
  const totalInterest = maturityAmount - totalDeposited;

  return {
    maturityAmount: Math.round(maturityAmount),
    totalDeposited: Math.round(totalDeposited),
    totalInterest: Math.round(totalInterest),
    monthlyDeposit,
    annualRate,
    months,
  };
};

/**
 * Salary calculator (India – simplified)
 * Computes in-hand from CTC using standard HRA/PF/deductions
 */
const calculateSalary = (annualCTC) => {
  if (annualCTC <= 0) throw new Error('CTC must be positive.');

  const monthlyGross = annualCTC / 12;

  // Standard deductions (approximate)
  const basicSalary = monthlyGross * 0.5;
  const hra = basicSalary * 0.5;
  const pf = Math.min(basicSalary * 0.12, 1800); // Employee PF
  const professionalTax = 200;

  const grossDeductions = pf + professionalTax;
  const monthlyInHand = monthlyGross - grossDeductions;

  // Simplified income tax (new regime FY2024-25)
  let annualTax = 0;
  const taxableIncome = annualCTC - 75000; // std deduction ₹75k

  if (taxableIncome > 1500000) {
    annualTax = 150000 + (taxableIncome - 1500000) * 0.3;
  } else if (taxableIncome > 1200000) {
    annualTax = 90000 + (taxableIncome - 1200000) * 0.2;
  } else if (taxableIncome > 900000) {
    annualTax = 45000 + (taxableIncome - 900000) * 0.15;
  } else if (taxableIncome > 700000) {
    annualTax = 25000 + (taxableIncome - 700000) * 0.1;
  } else if (taxableIncome > 400000) {
    annualTax = (taxableIncome - 400000) * 0.05;
  }

  // Rebate u/s 87A – nil tax if income ≤ 7 lakh
  if (taxableIncome <= 700000) annualTax = 0;

  const cess = annualTax * 0.04;
  const totalTax = annualTax + cess;

  return {
    annualCTC,
    monthlyGross: Math.round(monthlyGross),
    basicSalary: Math.round(basicSalary),
    hra: Math.round(hra),
    employeePF: Math.round(pf),
    professionalTax,
    estimatedAnnualTax: Math.round(totalTax),
    estimatedMonthlyTax: Math.round(totalTax / 12),
    monthlyInHand: Math.round(monthlyInHand - totalTax / 12),
  };
};

module.exports = {
  calculateSGPA, calculateCGPA, cgpaToPercentage, percentageToCGPA,
  calculateAttendance, calculateEMI, calculateSIP, calculateFD, calculateRD, calculateSalary,
};
