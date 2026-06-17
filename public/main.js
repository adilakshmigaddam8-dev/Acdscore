/**
 * AcadScore – main.js  (CORRECTED & REWRITTEN)
 *
 * KEY FIXES:
 *  1. Removed ALL duplicate global variable declarations — index.html inline
 *     <script> has been stripped. This file is the sole JS source.
 *  2. CGPA calculator is now SUBJECT-WISE (not semester-wise).
 *     Users enter each subject (name, code, credits, grade) from every semester.
 *     CGPA = Σ(credit × gradePoint) / Σ(credits) across all subjects.
 *     Optional semester grouping labels supported.
 *  3. All function names that were duplicated between inline script and
 *     main.js are now defined exactly once here.
 *  4. Fixed falsy-check bugs (cgpa===0, attended===0).
 *  5. Fixed marksToPoints() missing 'pct' branch.
 *  6. Fixed converter tab switch not clearing stale results.
 *  7. Single DOMContentLoaded handler — no double-init of rows.
 *  8. Dark mode preference saved to localStorage.
 */

'use strict';

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? `http://${window.location.hostname}:5000/api`
  : '/api';

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STATE  (single declaration — no inline script conflict)
// ─────────────────────────────────────────────────────────────────────────────
let inputType        = 'grade';   // SGPA input type
let cgpaInputType    = 'grade';   // CGPA input type (independent)
let activeFormula    = 'anna';    // converter formula

// SGPA
let subjectCount     = 0;
let subjects         = [];

// CGPA (subject-wise)
let cgpaSubjectCount = 0;
let cgpaSubjects     = [];
let cgpaSemBlock     = 0;         // current semester block number

// Dashboard
let dashCount        = 0;

// Exam
let examCount        = 0;

// Charts
let gpaChartInstance = null;
let barChartInstance = null;

let _toastTimer = null;

// ─────────────────────────────────────────────────────────────────────────────
// DARK MODE
// ─────────────────────────────────────────────────────────────────────────────
function toggleDark() {
  document.body.classList.toggle('dark');
  const isDark = document.body.classList.contains('dark');
  const btn = document.getElementById('darkBtn');
  if (btn) btn.textContent = isDark ? '☀️' : '🌙';
  try { localStorage.setItem('acadscore-theme', isDark ? 'dark' : 'light'); } catch (_) {}
}

function initTheme() {
  try {
    const saved = localStorage.getItem('acadscore-theme');
    if (saved === 'dark') {
      document.body.classList.add('dark');
      const btn = document.getElementById('darkBtn');
      if (btn) btn.textContent = '☀️';
    }
  } catch (_) {}
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.display = 'block';
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => { t.style.display = 'none'; }, duration);
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE NAVIGATION
// ─────────────────────────────────────────────────────────────────────────────
const NAV_PAGES = ['home','sgpa','cgpa','converter','dashboard','salary','banking','about'];
const MOB_MAP   = { home:'mob-home', sgpa:'mob-sgpa', cgpa:'mob-cgpa', converter:'mob-converter', banking:'mob-banking' };

function showPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const target = document.getElementById('page-' + id);
  if (target) target.classList.add('active');

  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  const idx = NAV_PAGES.indexOf(id);
  if (idx !== -1) { const nb = document.querySelectorAll('.nav-btn')[idx]; if (nb) nb.classList.add('active'); }

  document.querySelectorAll('.mob-nav-item').forEach(b => b.classList.remove('active'));
  if (MOB_MAP[id]) { const mb = document.getElementById(MOB_MAP[id]); if (mb) mb.classList.add('active'); }

  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Lazy-init on first visit
  if (id === 'sgpa'      && subjects.length      === 0) { for (let i = 0; i < 4; i++) addSubject(); }
  if (id === 'cgpa'      && cgpaSubjects.length  === 0) initCGPAPage();
  if (id === 'dashboard' && dashCount            === 0) { for (let i = 0; i < 6; i++) addDashSem(); }
  if (id === 'exam'      && examCount            === 0) { for (let i = 0; i < 5; i++) addExamSubject(); }
  if (id === 'attendance') calcAttendance();
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE / MARKS HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const GRADE_MAP_10 = { O:10,'A+':9,A:8,'B+':7,B:6,C:5,D:4,F:0,RA:0,AB:0,WH:0,AR:0,S:10,E:9 };
const GRADE_MAP_4  = { 'A+':4.0,A:4.0,'A-':3.7,'B+':3.3,B:3.0,'B-':2.7,'C+':2.3,C:2.0,'C-':1.7,'D+':1.3,D:1.0,F:0 };

function gradeToPoints(grade, system) {
  if (!grade) return 0;
  const g = grade.trim().toUpperCase();
  if (system === '10') return (GRADE_MAP_10[g] !== undefined) ? GRADE_MAP_10[g] : (parseFloat(grade) || 0);
  if (system === '4')  return (GRADE_MAP_4[g]  !== undefined) ? GRADE_MAP_4[g]  : (parseFloat(grade) || 0);
  return parseFloat(grade) || 0;
}

function marksToPoints(marks, system) {
  const m = parseFloat(marks);
  if (isNaN(m)) return 0;
  if (system === '10') {
    if (m >= 90) return 10; if (m >= 80) return 9; if (m >= 70) return 8;
    if (m >= 60) return 7;  if (m >= 50) return 6; if (m >= 45) return 5;
    return 0;
  }
  if (system === '4') {
    if (m >= 90) return 4.0; if (m >= 87) return 3.7; if (m >= 83) return 3.3;
    if (m >= 80) return 3.0; if (m >= 77) return 2.7; if (m >= 73) return 2.3;
    if (m >= 70) return 2.0; if (m >= 67) return 1.7; if (m >= 60) return 1.0;
    return 0;
  }
  return m; // 'pct' / 'percentage' → return raw value
}

function getGradeLabel(gpa, system) {
  if (system === '10') {
    if (gpa >= 9.5) return { label:'O',  color:'#10b981' };
    if (gpa >= 8.5) return { label:'A+', color:'#10b981' };
    if (gpa >= 7.5) return { label:'A',  color:'#3b82f6' };
    if (gpa >= 6.5) return { label:'B+', color:'#3b82f6' };
    if (gpa >= 5.5) return { label:'B',  color:'#f59e0b' };
    if (gpa >= 4.5) return { label:'C',  color:'#f59e0b' };
    return { label:'F', color:'#f43f5e' };
  }
  if (gpa >= 3.7) return { label:'A', color:'#10b981' };
  if (gpa >= 3.0) return { label:'B', color:'#3b82f6' };
  if (gpa >= 2.0) return { label:'C', color:'#f59e0b' };
  if (gpa >= 1.0) return { label:'D', color:'#f97316' };
  return { label:'F', color:'#f43f5e' };
}

function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─────────────────────────────────────────────────────────────────────────────
// SGPA CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
function setInputType(type) {
  inputType = type;
  document.getElementById('pill-grade')?.classList.toggle('active', type === 'grade');
  document.getElementById('pill-marks')?.classList.toggle('active', type === 'marks');
  document.querySelectorAll('#subjects-container .grade-col').forEach(el => {
    const lbl = el.querySelector('label'), inp = el.querySelector('input');
    if (lbl) lbl.textContent   = type === 'grade' ? 'Grade' : 'Marks / %';
    if (inp) inp.placeholder   = type === 'grade' ? 'e.g. A+' : 'e.g. 85';
  });
}

function updateGradingUI() { /* stub — kept for HTML onchange compatibility */ }

function addSubject(data = {}) {
  subjectCount++;
  const id = 'sub-' + subjectCount;
  subjects.push(id);
  const div = document.createElement('div');
  div.className = 'subject-row';
  div.id = id;
  div.innerHTML = `
    <div><label>Subject Name</label>
      <input type="text" placeholder="e.g. Mathematics" value="${escHtml(data.name||'')}"></div>
    <div><label>Credits</label>
      <input type="number" placeholder="3" min="1" max="10" value="${data.credits||3}"></div>
    <div class="grade-col"><label>${inputType==='grade'?'Grade':'Marks / %'}</label>
      <input type="text" placeholder="${inputType==='grade'?'e.g. A+':'e.g. 85'}"
             value="${escHtml(data.grade||'')}" list="grade-suggestions"></div>
    <button class="remove-btn" onclick="removeSubject('${id}')">×</button>`;
  document.getElementById('subjects-container')?.appendChild(div);
}

function removeSubject(id) {
  document.getElementById(id)?.remove();
  subjects = subjects.filter(s => s !== id);
}

function clearSGPA() {
  const c = document.getElementById('subjects-container'); if (c) c.innerHTML = '';
  subjects = []; subjectCount = 0;
  const r = document.getElementById('sgpa-result'); if (r) r.style.display = 'none';
  const b = document.getElementById('sgpa-breakdown');
  if (b) b.innerHTML = '<p class="text-muted text-center" style="padding:24px 0">Add subjects and calculate SGPA to see breakdown.</p>';
  for (let i = 0; i < 4; i++) addSubject();
}

function calculateSGPA() {
  const system = document.getElementById('gradingSystem')?.value || '10';
  const rows   = document.querySelectorAll('#subjects-container .subject-row');
  if (!rows.length) { showToast('⚠️ Please add at least one subject'); return; }

  let totalCredits = 0, weightedSum = 0;
  const breakdown = [];
  rows.forEach(row => {
    const inp     = row.querySelectorAll('input');
    const name    = inp[0]?.value.trim() || 'Subject';
    const credits = parseFloat(inp[1]?.value) || 0;
    const gi      = inp[2]?.value.trim() || '';
    const eff     = system === 'percentage' ? '10' : system;
    const points  = inputType === 'grade' ? gradeToPoints(gi, eff) : marksToPoints(gi, eff);
    totalCredits += credits; weightedSum += credits * points;
    breakdown.push({ name, credits, gi, points });
  });

  if (totalCredits === 0) { showToast('⚠️ Please enter subject credits'); return; }
  const sgpa = weightedSum / totalCredits;
  const eff  = system === 'percentage' ? '10' : system;
  const gl   = getGradeLabel(sgpa, eff);
  const pct  = system === '10' ? Math.max(0,(sgpa-0.75)*10).toFixed(2) : sgpa.toFixed(2);

  const resultEl = document.getElementById('sgpa-result');
  if (resultEl) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="result-box">
        <div class="result-label">Your SGPA</div>
        <div class="result-value">${sgpa.toFixed(2)}</div>
        <div style="font-size:18px;font-weight:700;color:${gl.color};margin:8px 0">${gl.label}</div>
        <div class="result-grid">
          <div class="result-stat"><div class="result-stat-val">${totalCredits}</div><div class="result-stat-lbl">Total Credits</div></div>
          <div class="result-stat"><div class="result-stat-val">${system==='10'?pct+'%':sgpa.toFixed(2)}</div><div class="result-stat-lbl">${system==='10'?'Percentage':'Score'}</div></div>
          <div class="result-stat"><div class="result-stat-val">${breakdown.length}</div><div class="result-stat-lbl">Subjects</div></div>
        </div>
      </div>`;
  }

  const bd = document.getElementById('sgpa-breakdown');
  if (bd) {
    let html = `<table class="grade-table"><thead><tr><th>#</th><th>Subject</th><th>Credits</th><th>Grade/Marks</th><th>Grade Points</th><th>Weighted</th></tr></thead><tbody>`;
    breakdown.forEach((s, i) => {
      const g = getGradeLabel(s.points, eff);
      html += `<tr><td>${i+1}</td><td><strong>${escHtml(s.name)}</strong></td><td>${s.credits}</td>
               <td>${escHtml(s.gi)}</td>
               <td><span class="gpa-pill" style="background:${g.color}22;color:${g.color}">${s.points}</span></td>
               <td>${(s.credits*s.points).toFixed(2)}</td></tr>`;
    });
    html += `<tr style="font-weight:700"><td colspan="2">Total</td><td>${totalCredits}</td><td>—</td><td>—</td><td>${weightedSum.toFixed(2)}</td></tr></tbody></table>`;
    bd.innerHTML = html;
  }
  showToast('✅ SGPA: ' + sgpa.toFixed(2));
}

// ─────────────────────────────────────────────────────────────────────────────
// CGPA CALCULATOR — SUBJECT-WISE  ★ (completely rewritten)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Switch input type for CGPA independently of SGPA
 */
function setCGPAInputType(type) {
  cgpaInputType = type;
  document.getElementById('cgpa-pill-grade')?.classList.toggle('active', type === 'grade');
  document.getElementById('cgpa-pill-marks')?.classList.toggle('active', type === 'marks');
  document.querySelectorAll('#cgpa-subjects-container .cgpa-grade-col').forEach(el => {
    const lbl = el.querySelector('label'), inp = el.querySelector('input');
    if (lbl) lbl.textContent = type === 'grade' ? 'Grade' : 'Marks / %';
    if (inp) inp.placeholder = type === 'grade' ? 'e.g. A+' : 'e.g. 85';
  });
}

/** Init CGPA page with a Semester 1 block and 5 subjects */
function initCGPAPage() {
  cgpaSubjects = []; cgpaSubjectCount = 0; cgpaSemBlock = 0;
  addCGPASemesterBlock(); // adds Semester 1 header + 5 subject rows
}

/**
 * Add a labelled semester block (header + N empty subject rows)
 */
function addCGPASemesterBlock(n = 5) {
  cgpaSemBlock++;
  const container = document.getElementById('cgpa-subjects-container');
  if (!container) return;

  // Semester divider header
  const header = document.createElement('div');
  header.className = 'cgpa-sem-header';
  header.style.cssText = 'display:flex;align-items:center;gap:10px;margin:16px 0 8px;';
  header.innerHTML = `
    <input type="text" value="Semester ${cgpaSemBlock}" placeholder="Semester ${cgpaSemBlock}"
           style="max-width:160px;font-weight:600;font-size:13px;padding:6px 10px;border-radius:6px;border:1.5px solid var(--border);background:var(--surface2);color:var(--text)">
    <div style="flex:1;height:1px;background:var(--border)"></div>
    <button class="remove-btn" style="width:28px;height:28px;font-size:13px" title="Remove semester"
            onclick="removeCGPASemBlock(this)">×</button>`;
  container.appendChild(header);

  for (let i = 0; i < n; i++) addCGPASubject();
}

/** Remove entire semester block (header + all its subjects until next header) */
function removeCGPASemBlock(btn) {
  const header = btn.closest('.cgpa-sem-header');
  if (!header) return;
  // Remove all following subject rows until next header or end
  let next = header.nextElementSibling;
  while (next && !next.classList.contains('cgpa-sem-header')) {
    const nxt2 = next.nextElementSibling;
    const id   = next.id;
    if (id) cgpaSubjects = cgpaSubjects.filter(s => s !== id);
    next.remove();
    next = nxt2;
  }
  header.remove();
}

/**
 * Add a single subject row to the CGPA container
 */
function addCGPASubject(data = {}) {
  cgpaSubjectCount++;
  const id  = 'cgpa-sub-' + cgpaSubjectCount;
  cgpaSubjects.push(id);
  const div = document.createElement('div');
  div.className = 'subject-row';
  div.id = id;
  // 5-col layout: name | code | credits | grade | remove
  div.style.gridTemplateColumns = '2fr 1fr 70px 90px 36px';
  div.innerHTML = `
    <div><label>Subject Name</label>
      <input type="text" placeholder="e.g. Engineering Maths" value="${escHtml(data.name||'')}"></div>
    <div><label>Code</label>
      <input type="text" placeholder="MA401" value="${escHtml(data.code||'')}"></div>
    <div><label>Credits</label>
      <input type="number" placeholder="4" min="1" max="10" value="${data.credits||''}"></div>
    <div class="cgpa-grade-col"><label>${cgpaInputType==='grade'?'Grade':'Marks/%'}</label>
      <input type="text" placeholder="${cgpaInputType==='grade'?'A+':'85'}"
             value="${escHtml(data.grade||'')}" list="grade-suggestions"></div>
    <button class="remove-btn" onclick="removeCGPASubject('${id}')">×</button>`;
  document.getElementById('cgpa-subjects-container')?.appendChild(div);
}

function removeCGPASubject(id) {
  document.getElementById(id)?.remove();
  cgpaSubjects = cgpaSubjects.filter(s => s !== id);
}

function clearCGPA() {
  const c = document.getElementById('cgpa-subjects-container'); if (c) c.innerHTML = '';
  cgpaSubjects = []; cgpaSubjectCount = 0; cgpaSemBlock = 0;
  const r = document.getElementById('cgpa-result'); if (r) r.style.display = 'none';
  const t = document.getElementById('cgpa-table-wrap');
  if (t) t.innerHTML = '<p class="text-muted text-center" style="padding:24px 0">Add subjects and calculate CGPA to see breakdown.</p>';
  initCGPAPage();
}

/**
 * Calculate CGPA subject-wise:
 * Reads every .subject-row inside #cgpa-subjects-container,
 * groups by nearest preceding .cgpa-sem-header for display,
 * computes CGPA = Σ(credit × gradePoint) / Σ(credits)
 */
function calculateCGPA() {
  const system  = document.getElementById('cgpa-grading-system')?.value || '10';
  const eff     = system === 'percentage' ? '10' : system;
  const container = document.getElementById('cgpa-subjects-container');
  if (!container) return;

  // Walk through all children, tagging each subject row with its semester
  const allRows   = container.querySelectorAll('.subject-row');
  if (!allRows.length) { showToast('⚠️ Please add at least one subject'); return; }

  // Build semester-grouped structure
  const semGroups = []; // [{ semName, subjects: [{name,code,credits,gi,points}] }]
  let   currentGroup = null;

  // Map subject row IDs to their semester label by walking the DOM in order
  Array.from(container.children).forEach(child => {
    if (child.classList.contains('cgpa-sem-header')) {
      const labelInput = child.querySelector('input[type="text"]');
      currentGroup = { semName: labelInput?.value || 'Semester', subjects: [] };
      semGroups.push(currentGroup);
    } else if (child.classList.contains('subject-row')) {
      if (!currentGroup) {
        // Subject added without a header (no semester blocks used)
        currentGroup = { semName: 'All Subjects', subjects: [] };
        semGroups.push(currentGroup);
      }
      const inp     = child.querySelectorAll('input');
      const name    = inp[0]?.value.trim() || 'Subject';
      const code    = inp[1]?.value.trim() || '';
      const credits = parseFloat(inp[2]?.value);
      const gi      = inp[3]?.value.trim() || '';
      if (!isNaN(credits) && credits > 0 && gi !== '') {
        const points = cgpaInputType === 'grade' ? gradeToPoints(gi, eff) : marksToPoints(gi, eff);
        currentGroup.subjects.push({ name, code, credits, gi, points });
      }
    }
  });

  // Flatten all valid subjects
  const allSubjects = semGroups.flatMap(g => g.subjects);
  if (!allSubjects.length) {
    showToast('⚠️ Please fill in credits and grades for at least one subject');
    return;
  }

  const totalCredits = allSubjects.reduce((s, r) => s + r.credits, 0);
  const weightedSum  = allSubjects.reduce((s, r) => s + r.credits * r.points, 0);
  if (totalCredits === 0) { showToast('⚠️ Total credits cannot be zero'); return; }

  const cgpa = weightedSum / totalCredits;
  const pct  = system === '10' ? Math.max(0, (cgpa - 0.75) * 10).toFixed(2) : cgpa.toFixed(2);
  const gl   = getGradeLabel(cgpa, eff);

  // ── Result card ──────────────────────────────────────────────────────────
  const resultEl = document.getElementById('cgpa-result');
  if (resultEl) {
    resultEl.style.display = 'block';
    resultEl.innerHTML = `
      <div class="result-box">
        <div class="result-label">Your CGPA</div>
        <div class="result-value">${cgpa.toFixed(2)}</div>
        <div style="font-size:18px;font-weight:700;color:${gl.color};margin:8px 0">${gl.label} Grade</div>
        <div class="result-grid">
          <div class="result-stat"><div class="result-stat-val">${allSubjects.length}</div><div class="result-stat-lbl">Subjects</div></div>
          <div class="result-stat"><div class="result-stat-val">${system==='10'?pct+'%':cgpa.toFixed(2)}</div><div class="result-stat-lbl">${system==='10'?'Percentage (AU)':'Score'}</div></div>
          <div class="result-stat"><div class="result-stat-val">${totalCredits}</div><div class="result-stat-lbl">Total Credits</div></div>
        </div>
        <div class="btn-group" style="justify-content:center;margin-top:16px">
          <button class="btn btn-secondary btn-sm" onclick="exportPDF('cgpa')">📄 Export PDF</button>
          <button class="btn btn-secondary btn-sm" onclick="exportReportText('cgpa','${cgpa.toFixed(2)}','${pct}%')">📋 Copy Summary</button>
        </div>
      </div>`;
  }

  // ── Subject-wise breakdown table grouped by semester ─────────────────────
  const tableWrap = document.getElementById('cgpa-table-wrap');
  if (tableWrap) {
    let html = '';
    // Summary stats per semester
    const semSummaries = [];

    semGroups.filter(g => g.subjects.length > 0).forEach(group => {
      const gC = group.subjects.reduce((s,r) => s + r.credits, 0);
      const gW = group.subjects.reduce((s,r) => s + r.credits * r.points, 0);
      const gSGPA = gW / gC;
      semSummaries.push({ name: group.semName, sgpa: gSGPA, credits: gC });

      html += `
        <div style="margin-bottom:6px;margin-top:16px;font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--blue);letter-spacing:.5px;text-transform:uppercase">
          ${escHtml(group.semName)} &nbsp;·&nbsp; SGPA: ${gSGPA.toFixed(2)} &nbsp;·&nbsp; Credits: ${gC}
        </div>
        <table class="grade-table" style="margin-bottom:4px">
          <thead><tr><th>Subject</th><th>Code</th><th>Credits</th><th>Grade/Marks</th><th>Grade Points</th><th>Weighted</th></tr></thead>
          <tbody>`;
      group.subjects.forEach(s => {
        const g = getGradeLabel(s.points, eff);
        html += `<tr>
          <td><strong>${escHtml(s.name)}</strong></td>
          <td>${escHtml(s.code)}</td>
          <td>${s.credits}</td>
          <td>${escHtml(s.gi)}</td>
          <td><span class="gpa-pill" style="background:${g.color}22;color:${g.color}">${s.points}</span></td>
          <td>${(s.credits*s.points).toFixed(2)}</td>
        </tr>`;
      });
      html += `<tr style="font-weight:700;background:var(--surface2)">
        <td colspan="2">Semester Total</td><td>${gC}</td><td>—</td><td>—</td><td>${gW.toFixed(2)}</td>
      </tr></tbody></table>`;
    });

    // Cumulative summary table
    if (semSummaries.length > 1) {
      html += `
        <div style="margin-top:20px;margin-bottom:6px;font-family:var(--font-display);font-size:13px;font-weight:700;color:var(--indigo);letter-spacing:.5px;text-transform:uppercase">
          Cumulative Summary
        </div>
        <table class="grade-table">
          <thead><tr><th>Semester</th><th>SGPA</th><th>Credits</th><th>Running CGPA</th><th>Grade</th></tr></thead>
          <tbody>`;
      let rW = 0, rC = 0;
      semSummaries.forEach(s => {
        rW += s.sgpa * s.credits; rC += s.credits;
        const rc = (rW / rC).toFixed(2);
        const g  = getGradeLabel(s.sgpa, eff);
        html += `<tr>
          <td>${escHtml(s.name)}</td>
          <td><strong>${s.sgpa.toFixed(2)}</strong></td>
          <td>${s.credits}</td>
          <td><strong>${rc}</strong></td>
          <td><span class="gpa-pill" style="background:${g.color}22;color:${g.color}">${g.label}</span></td>
        </tr>`;
      });
      html += `<tr style="font-weight:700;background:var(--surface2)">
        <td>OVERALL CGPA</td><td>${cgpa.toFixed(2)}</td>
        <td>${totalCredits}</td><td>${cgpa.toFixed(2)}</td>
        <td><span class="gpa-pill" style="background:${gl.color}22;color:${gl.color}">${gl.label}</span></td>
      </tr></tbody></table>`;
    }

    tableWrap.innerHTML = html || '<p class="text-muted text-center" style="padding:24px 0">No valid data to display.</p>';
  }

  showToast(`✅ CGPA: ${cgpa.toFixed(2)}  |  ${pct}% (${allSubjects.length} subjects)`);
}

// ─────────────────────────────────────────────────────────────────────────────
// GPA ↔ PERCENTAGE CONVERTER
// ─────────────────────────────────────────────────────────────────────────────
function setConverterTab(tab) {
  const all = ['cgpa-pct','pct-cgpa','sgpa-pct'];
  all.forEach(t => document.getElementById('tab-'+t)?.classList.toggle('active', t===tab));
  document.querySelectorAll('#converter-tabs .tab-btn').forEach((b,i) => b.classList.toggle('active', all[i]===tab));
  // Clear stale results on tab switch
  ['conv-result','pct-conv-result','sgpa-conv-result'].forEach(id => {
    const el = document.getElementById(id);
    if (el) { el.style.display = 'none'; el.innerHTML = ''; }
  });
}

function selectFormula(el) {
  el.closest('div').querySelectorAll('.formula-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  activeFormula = el.dataset.formula;
  const INFO = {
    anna:'(CGPA − 0.75) × 10  →  e.g. CGPA 8.5 = 77.5%',
    jntu:'CGPA × 10  →  e.g. CGPA 8.5 = 85%',
    vtu:'(CGPA − 0.75) × 10  →  e.g. CGPA 8.5 = 77.5%',
    du:'(CGPA − 0.5) × 10  →  e.g. CGPA 8.5 = 80%',
    mumbai:'CGPA × 9.5  →  e.g. CGPA 8.5 = 80.75%',
    custom:'Percentage = (CGPA × Multiplier) − Subtract',
    'anna-r':'CGPA = (% / 10) + 0.75','jntu-r':'CGPA = % / 10',
    'vtu-r':'CGPA = (% / 10) + 0.75','custom-r':'CGPA = % ÷ Multiplier',
  };
  const infoEl = document.getElementById('conv-formula-info');
  if (infoEl) infoEl.innerHTML = 'ℹ️ ' + (INFO[activeFormula] || '');
  const cb = document.getElementById('custom-formula-input');
  if (cb) cb.style.display = activeFormula === 'custom' ? 'block' : 'none';
}

function applyFormula(cgpa, formula) {
  switch (formula) {
    case 'anna': case 'vtu': return (cgpa-0.75)*10;
    case 'jntu': return cgpa*10;
    case 'du':   return (cgpa-0.5)*10;
    case 'mumbai': return cgpa*9.5;
    case 'custom': {
      const m = parseFloat(document.getElementById('custom-mult')?.value)||9.5;
      const s = parseFloat(document.getElementById('custom-sub')?.value)||0;
      return cgpa*m-s;
    }
    default: return cgpa*9.5;
  }
}

function convertGPA() {
  const raw = document.getElementById('conv-cgpa')?.value;
  const cgpa = parseFloat(raw);
  if (raw===''||raw===null||isNaN(cgpa)||cgpa<0||cgpa>10) { showToast('⚠️ Enter a valid CGPA (0–10)'); return; }
  const pct = applyFormula(cgpa, activeFormula);
  const gl  = getGradeLabel(cgpa,'10');
  const el  = document.getElementById('conv-result'); if (!el) return;
  el.style.display = 'block';
  el.innerHTML = `<div class="result-box">
    <div class="result-label">Percentage Equivalent</div>
    <div class="result-value" style="color:var(--emerald)">${Math.max(0,pct).toFixed(2)}%</div>
    <div style="margin-top:12px"><span class="gpa-pill" style="background:${gl.color}22;color:${gl.color};padding:6px 16px;font-size:14px">CGPA ${cgpa} → ${gl.label} Grade</span></div>
    <div class="result-grid" style="margin-top:12px">
      <div class="result-stat"><div class="result-stat-val">${cgpa}</div><div class="result-stat-lbl">CGPA</div></div>
      <div class="result-stat"><div class="result-stat-val">${Math.max(0,pct).toFixed(2)}%</div><div class="result-stat-lbl">Percentage</div></div>
      <div class="result-stat"><div class="result-stat-val">${gl.label}</div><div class="result-stat-lbl">Grade</div></div>
    </div></div>`;
}

function convertPct() {
  const raw = document.getElementById('conv-pct')?.value;
  const pct = parseFloat(raw);
  if (raw===''||isNaN(pct)||pct<0||pct>100) { showToast('⚠️ Enter a valid percentage (0–100)'); return; }
  const formula = document.querySelector('#tab-pct-cgpa .formula-chip.active')?.dataset.formula||'anna-r';
  let cgpa;
  if (formula==='anna-r'||formula==='vtu-r') cgpa = pct/10+0.75;
  else if (formula==='jntu-r') cgpa = pct/10;
  else if (formula==='custom-r') cgpa = pct/(parseFloat(document.getElementById('custom-mult')?.value)||9.5);
  else cgpa = pct/9.5;
  cgpa = Math.min(10, Math.max(0, cgpa));
  const gl = getGradeLabel(cgpa,'10');
  const el = document.getElementById('pct-conv-result'); if (!el) return;
  el.style.display='block';
  el.innerHTML=`<div class="result-box">
    <div class="result-label">CGPA Equivalent</div>
    <div class="result-value">${cgpa.toFixed(2)}</div>
    <div class="result-grid" style="margin-top:12px">
      <div class="result-stat"><div class="result-stat-val">${pct}%</div><div class="result-stat-lbl">Percentage</div></div>
      <div class="result-stat"><div class="result-stat-val">${cgpa.toFixed(2)}</div><div class="result-stat-lbl">CGPA</div></div>
      <div class="result-stat"><div class="result-stat-val">${gl.label}</div><div class="result-stat-lbl">Grade</div></div>
    </div></div>`;
}

function convertSGPA() {
  const sgpa = parseFloat(document.getElementById('conv-sgpa')?.value);
  if (isNaN(sgpa)||sgpa<0||sgpa>10) { showToast('⚠️ Enter a valid SGPA'); return; }
  const univ = document.getElementById('sgpa-univ')?.value||'anna';
  const pct  = (univ==='anna'||univ==='vtu') ? (sgpa-0.75)*10 : sgpa*10;
  const el   = document.getElementById('sgpa-conv-result'); if (!el) return;
  el.style.display='block';
  el.innerHTML=`<div class="result-box">
    <div class="result-label">Percentage</div>
    <div class="result-value" style="color:var(--emerald)">${Math.max(0,pct).toFixed(2)}%</div></div>`;
}

function switchGradeRef(btn, tab) {
  ['g10','g4'].forEach(id => document.getElementById(id)?.classList.remove('active'));
  document.getElementById(tab)?.classList.add('active');
  btn.closest('.card')?.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// ─────────────────────────────────────────────────────────────────────────────
// PERFORMANCE DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function addDashSem() {
  dashCount++;
  const div = document.createElement('div');
  div.className = 'sem-row';
  div.id = 'dash-sem-' + dashCount;
  div.innerHTML = `
    <div><label>Semester ${dashCount}</label><input type="text" value="Sem ${dashCount}"></div>
    <div><label>SGPA</label><input type="number" step="0.01" min="0" max="10" placeholder="8.5"></div>
    <div><label>Credits</label><input type="number" value="24" min="1" max="50"></div>
    <button class="remove-btn" onclick="this.parentElement.remove()">×</button>`;
  document.getElementById('dash-sems-container')?.appendChild(div);
}

function clearDashboard() {
  const c = document.getElementById('dash-sems-container'); if (c) c.innerHTML = '';
  dashCount = 0;
  document.getElementById('dashboard-results')?.style && (document.getElementById('dashboard-results').style.display = 'none');
  if (gpaChartInstance) { gpaChartInstance.destroy(); gpaChartInstance = null; }
  if (barChartInstance) { barChartInstance.destroy(); barChartInstance = null; }
  for (let i = 0; i < 6; i++) addDashSem();
}

function renderDashboard() {
  const rows = document.querySelectorAll('#dash-sems-container .sem-row');
  const labels=[], sgpas=[], creditArr=[];
  let totalW=0, totalC=0;
  rows.forEach(row => {
    const inp  = row.querySelectorAll('input');
    const name = inp[0]?.value||'Sem';
    const sgpa = parseFloat(inp[1]?.value);
    const cr   = parseFloat(inp[2]?.value)||24;
    if (!isNaN(sgpa)&&sgpa>0) { labels.push(name); sgpas.push(sgpa); creditArr.push(cr); totalW+=sgpa*cr; totalC+=cr; }
  });
  if (!labels.length) { showToast('⚠️ Enter at least one SGPA'); return; }

  const cgpa  = totalW/totalC;
  const pct   = Math.max(0,(cgpa-0.75)*10).toFixed(2);
  const dashC = document.getElementById('dash-cgpa'); if (dashC) dashC.textContent = cgpa.toFixed(2);
  const dashP = document.getElementById('dash-pct');  if (dashP) dashP.textContent = pct+'%';
  const res   = document.getElementById('dashboard-results'); if (res) res.style.display='block';

  const runCGPAs=[]; let rW=0,rC=0;
  sgpas.forEach((s,i)=>{ rW+=s*creditArr[i]; rC+=creditArr[i]; runCGPAs.push(rW/rC); });

  const isDark    = document.body.classList.contains('dark');
  const gridColor = isDark?'rgba(255,255,255,.08)':'rgba(0,0,0,.07)';
  const fontColor = isDark?'#94a3b8':'#64748b';
  if (typeof Chart!=='undefined') Chart.defaults.color = fontColor;

  if (gpaChartInstance) { gpaChartInstance.destroy(); }
  if (barChartInstance) { barChartInstance.destroy(); }

  const gc = document.getElementById('gpaChart');
  if (gc && typeof Chart!=='undefined') {
    gc.height = 90;
    gpaChartInstance = new Chart(gc, {
      type:'line',
      data:{ labels, datasets:[
        { label:'SGPA', data:sgpas, borderColor:'#1a56db', backgroundColor:'rgba(26,86,219,.12)', tension:.4, fill:true, pointBackgroundColor:'#1a56db', pointRadius:5 },
        { label:'Running CGPA', data:runCGPAs, borderColor:'#7c3aed', backgroundColor:'transparent', borderDash:[6,3], tension:.4, pointRadius:4 }
      ]},
      options:{ responsive:true, plugins:{legend:{position:'top'}}, scales:{y:{min:0,max:10,grid:{color:gridColor}},x:{grid:{color:gridColor}}} }
    });
  }

  const bc = document.getElementById('barChart');
  if (bc && typeof Chart!=='undefined') {
    bc.height = 90;
    const colors = sgpas.map(s => s>=8?'rgba(16,185,129,.8)':s>=6?'rgba(26,86,219,.8)':'rgba(245,158,11,.8)');
    barChartInstance = new Chart(bc, {
      type:'bar',
      data:{ labels, datasets:[{ label:'SGPA', data:sgpas, backgroundColor:colors, borderRadius:6, borderSkipped:false }] },
      options:{ responsive:true, plugins:{legend:{display:false}}, scales:{y:{min:0,max:10,grid:{color:gridColor}},x:{grid:{color:gridColor}}} }
    });
  }
  showToast('📊 Dashboard generated!');
}

// ─────────────────────────────────────────────────────────────────────────────
// ATTENDANCE CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
function calcAttendance() {
  const total    = parseFloat(document.getElementById('att-total')?.value);
  const attended = parseFloat(document.getElementById('att-attended')?.value);
  const required = parseFloat(document.getElementById('att-required')?.value)||75;
  const upcoming = parseFloat(document.getElementById('att-upcoming')?.value)||0;
  const el = document.getElementById('att-result');
  if (!el || isNaN(total) || isNaN(attended) || total <= 0) return;

  const current   = (attended/total)*100;
  const isOK      = current>=required;
  const canMiss   = isOK  ? Math.floor((attended-(required/100)*total)/(1-required/100)) : 0;
  const needAtt   = !isOK ? Math.ceil(((required/100)*total-attended)/(1-required/100)) : 0;
  const futureAtt = (total+upcoming)>0 ? ((attended+upcoming)/(total+upcoming)*100) : 0;
  const sc = isOK?'var(--emerald)':'var(--rose)';

  el.style.display='block';
  el.innerHTML=`
    <div class="result-box" style="border-color:${sc}">
      <div class="result-label">Current Attendance</div>
      <div class="result-value" style="color:${sc}">${current.toFixed(1)}%</div>
      <div style="font-size:14px;font-weight:600;margin:8px 0;color:${sc}">${isOK?'✅ Attendance OK':'⚠️ Below Required'}</div>
      <div class="progress-bar-wrap">
        <div class="progress-label"><span>0%</span><span>Required: ${required}%</span><span>100%</span></div>
        <div class="progress-track"><div class="progress-fill" style="width:${Math.min(current,100)}%;background:${sc}"></div></div>
      </div>
      <div class="result-grid">
        <div class="result-stat"><div class="result-stat-val">${isOK?canMiss:0}</div><div class="result-stat-lbl">Classes you can skip</div></div>
        <div class="result-stat"><div class="result-stat-val">${!isOK?needAtt:0}</div><div class="result-stat-lbl">Classes to attend</div></div>
        <div class="result-stat"><div class="result-stat-val">${upcoming>0?futureAtt.toFixed(1)+'%':'—'}</div><div class="result-stat-lbl">If attend all upcoming</div></div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXAM PERCENTAGE CALCULATOR
// ─────────────────────────────────────────────────────────────────────────────
function addExamSubject() {
  examCount++;
  const div = document.createElement('div');
  div.className = 'subject-row';
  div.innerHTML = `
    <div><label>Subject</label><input type="text" placeholder="Subject ${examCount}"></div>
    <div><label>Marks Got</label><input type="number" placeholder="75" min="0" oninput="calcExam()"></div>
    <div><label>Max Marks</label><input type="number" placeholder="100" min="1" value="100" oninput="calcExam()"></div>
    <button class="remove-btn" onclick="this.parentElement.remove();calcExam()">×</button>`;
  document.getElementById('exam-subjects')?.appendChild(div);
}

function clearExam() {
  const c = document.getElementById('exam-subjects'); if (c) c.innerHTML='';
  examCount=0;
  const r=document.getElementById('exam-result'); if(r) r.style.display='none';
  for(let i=0;i<5;i++) addExamSubject();
}

function calcExam() {
  const rows = document.querySelectorAll('#exam-subjects .subject-row');
  let totalMarks=0, totalMax=0;
  const breakdown=[];
  rows.forEach(row=>{
    const inp  = row.querySelectorAll('input');
    const name = inp[0]?.value||'Subject';
    const marks= parseFloat(inp[1]?.value)||0;
    const max  = parseFloat(inp[2]?.value)||100;
    totalMarks+=marks; totalMax+=max;
    breakdown.push({name,marks,max,pct:(marks/max*100).toFixed(1)});
  });
  const el = document.getElementById('exam-result');
  if (!el||totalMax===0) return;
  const overall=(totalMarks/totalMax*100).toFixed(2);
  el.style.display='block';
  let html=`<div class="result-box">
    <div class="result-label">Overall Percentage</div>
    <div class="result-value">${overall}%</div>
    <div class="result-grid" style="margin-top:12px">
      <div class="result-stat"><div class="result-stat-val">${totalMarks}</div><div class="result-stat-lbl">Marks Obtained</div></div>
      <div class="result-stat"><div class="result-stat-val">${totalMax}</div><div class="result-stat-lbl">Total Marks</div></div>
      <div class="result-stat"><div class="result-stat-val">${breakdown.filter(s=>parseFloat(s.pct)>=40).length}/${breakdown.length}</div><div class="result-stat-lbl">Passed</div></div>
    </div></div>
  <table class="grade-table" style="margin-top:12px"><thead><tr><th>Subject</th><th>Marks</th><th>Max</th><th>Percentage</th></tr></thead><tbody>`;
  breakdown.forEach(s=>{
    const c=parseFloat(s.pct)>=75?'var(--emerald)':parseFloat(s.pct)>=40?'var(--blue)':'var(--rose)';
    html+=`<tr><td>${escHtml(s.name)}</td><td>${s.marks}</td><td>${s.max}</td><td><span class="gpa-pill" style="background:${c}22;color:${c}">${s.pct}%</span></td></tr>`;
  });
  html+='</tbody></table>';
  el.innerHTML=html;
}

// ─────────────────────────────────────────────────────────────────────────────
// SALARY CALCULATORS
// ─────────────────────────────────────────────────────────────────────────────
function showSalaryTab(tab) {
  ['inhand','ctc','tax'].forEach(t=>{
    document.getElementById('sal-'+t)?.classList.toggle('active',t===tab);
    document.getElementById('sal-tab-'+t)?.classList.toggle('active',t===tab);
  });
}

function fmt(n) { return '₹'+Math.round(n).toLocaleString('en-IN'); }

function resultRow(lbl,val,highlight=false,green=false) {
  return `<div class="calc-result-row ${highlight?'highlight':''}">
    <span class="lbl">${lbl}</span>
    <span class="val" style="${green?'color:var(--emerald)':''}">${val}</span></div>`;
}

function calcInhand() {
  const monthly=parseFloat(document.getElementById('monthly-ctc')?.value)||0;
  if(!monthly) return;
  const ae=document.getElementById('annual-ctc'); if(ae) ae.value='';
  computeInhand(monthly);
}
function calcInhandAnnual() {
  const annual=parseFloat(document.getElementById('annual-ctc')?.value)||0;
  if(!annual) return;
  const me=document.getElementById('monthly-ctc'); if(me) me.value='';
  computeInhand(annual/12);
}
function computeInhand(monthly) {
  const pfPct  =parseFloat(document.getElementById('pf-pct')?.value)||12;
  const profTax=parseFloat(document.getElementById('prof-tax')?.value)||200;
  const basic=monthly*0.5, hra=monthly*0.2, special=monthly-basic-hra;
  const epf=basic*pfPct/100, inHand=monthly-epf-profTax;
  const el=document.getElementById('inhand-result'), rowsEl=document.getElementById('inhand-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML=
    resultRow('Basic Salary',fmt(basic))+resultRow('HRA',fmt(hra))+resultRow('Special Allowance',fmt(special))+
    resultRow('Gross Salary',fmt(monthly))+'<div class="divider"></div>'+
    resultRow('EPF Deduction','− '+fmt(epf))+resultRow('Professional Tax','− '+fmt(profTax))+
    resultRow('In-Hand (Monthly)',fmt(inHand),true,true)+resultRow('In-Hand (Annual)',fmt(inHand*12),false,true);
}

function calcCTC() {
  const ctc=parseFloat(document.getElementById('ctc-annual')?.value)||0; if(!ctc) return;
  const isMetro=document.getElementById('city-type')?.value==='metro';
  const basic=ctc*0.4, hraPct=isMetro?0.5:0.4, hra=basic*hraPct;
  const pf=basic*0.12*2, gratuity=basic*0.0481, medical=15000, lta=basic*0.1;
  const special=Math.max(0,ctc-basic-hra-pf/2-gratuity-medical-lta);
  const gross=ctc-pf/2-gratuity, inHand=(gross-pf/2-2400)/12;
  const el=document.getElementById('ctc-result'), rowsEl=document.getElementById('ctc-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML='<div class="card-title" style="margin-bottom:12px">Annual CTC Breakup</div>'+
    resultRow('Basic Salary',fmt(basic)+'/yr')+resultRow('HRA ('+(hraPct*100)+'%)',fmt(hra)+'/yr')+
    resultRow('Special Allowance',fmt(special)+'/yr')+resultRow('LTA',fmt(lta)+'/yr')+
    resultRow('Medical Allowance',fmt(medical)+'/yr')+resultRow('Employee PF (12%)',fmt(pf/2)+'/yr')+
    resultRow('Employer PF (12%)',fmt(pf/2)+'/yr')+resultRow('Gratuity',fmt(gratuity)+'/yr')+
    '<div class="divider"></div>'+resultRow('Gross Annual',fmt(gross))+
    resultRow('Approx In-Hand (Monthly)',fmt(inHand),true,true);
}

function calcTax() {
  const income=parseFloat(document.getElementById('tax-income')?.value)||0; if(!income) return;
  const regime=document.getElementById('tax-regime')?.value||'new';
  let taxable,tax;
  if(regime==='new'){
    taxable=Math.max(0,income-75000);
    if(taxable<=300000)tax=0;
    else if(taxable<=700000)tax=(taxable-300000)*0.05;
    else if(taxable<=1000000)tax=20000+(taxable-700000)*0.10;
    else if(taxable<=1200000)tax=50000+(taxable-1000000)*0.15;
    else if(taxable<=1500000)tax=80000+(taxable-1200000)*0.20;
    else tax=140000+(taxable-1500000)*0.30;
    if(taxable<=700000)tax=0;
  }else{
    taxable=Math.max(0,income-50000-150000);
    if(taxable<=250000)tax=0;
    else if(taxable<=500000)tax=(taxable-250000)*0.05;
    else if(taxable<=1000000)tax=12500+(taxable-500000)*0.20;
    else tax=112500+(taxable-1000000)*0.30;
    if(income<=500000)tax=0;
  }
  const cess=tax*0.04, totalTax=tax+cess, monthly=(income-totalTax)/12;
  const el=document.getElementById('tax-result'), rowsEl=document.getElementById('tax-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML=
    resultRow('Gross Income',fmt(income))+
    resultRow('Standard Deduction','− ₹'+(regime==='new'?'75,000':'50,000'))+
    resultRow('Taxable Income',fmt(taxable))+'<div class="divider"></div>'+
    resultRow('Income Tax',fmt(tax))+resultRow('Education Cess (4%)',fmt(cess))+
    resultRow('Total Tax Payable',fmt(totalTax))+
    resultRow('Effective Tax Rate',((totalTax/income)*100).toFixed(2)+'%')+
    resultRow('Net Annual Take-Home',fmt(income-totalTax),true,true)+
    resultRow('Net Monthly Take-Home',fmt(monthly),false,true);
}

// ─────────────────────────────────────────────────────────────────────────────
// BANKING CALCULATORS
// ─────────────────────────────────────────────────────────────────────────────
function showBankingTab(tab) {
  ['emi','sip','fd','rd','loan','interest'].forEach(t=>{
    document.getElementById('bank-'+t)?.classList.toggle('active',t===tab);
    document.getElementById('bank-tab-'+t)?.classList.toggle('active',t===tab);
  });
}

function calcEMI() {
  const P=parseFloat(document.getElementById('emi-loan')?.value)||0;
  const R=(parseFloat(document.getElementById('emi-rate')?.value)||0)/1200;
  const N=parseFloat(document.getElementById('emi-tenure')?.value)||0;
  if(!P||!R||!N) return;
  const emi=(P*R*Math.pow(1+R,N))/(Math.pow(1+R,N)-1);
  const total=emi*N, interest=total-P;
  const el=document.getElementById('emi-result'), rowsEl=document.getElementById('emi-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML=resultRow('Monthly EMI',fmt(emi),true,true)+resultRow('Principal Amount',fmt(P))+resultRow('Total Interest',fmt(interest))+resultRow('Total Payment',fmt(total));
}

function calcSIP() {
  const M=parseFloat(document.getElementById('sip-amount')?.value)||0;
  const R=(parseFloat(document.getElementById('sip-rate')?.value)||0)/100/12;
  const N=(parseFloat(document.getElementById('sip-years')?.value)||0)*12;
  if(!M||!R||!N) return;
  const maturity=M*((Math.pow(1+R,N)-1)/R)*(1+R);
  const invested=M*N, gains=maturity-invested;
  const el=document.getElementById('sip-result'), rowsEl=document.getElementById('sip-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML=resultRow('Maturity Value',fmt(maturity),true,true)+resultRow('Total Invested',fmt(invested))+resultRow('Wealth Gained',fmt(gains),false,true)+resultRow('Returns',((gains/invested)*100).toFixed(1)+'%');
}

function calcFD() {
  const P=parseFloat(document.getElementById('fd-principal')?.value)||0;
  const r=(parseFloat(document.getElementById('fd-rate')?.value)||0)/100;
  const n=parseFloat(document.getElementById('fd-compound')?.value)||1;
  const t=parseFloat(document.getElementById('fd-years')?.value)||0;
  if(!P||!r||!t) return;
  const A=P*Math.pow(1+r/n,n*t);
  const el=document.getElementById('fd-result'), rowsEl=document.getElementById('fd-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML=resultRow('Maturity Amount',fmt(A),true,true)+resultRow('Principal',fmt(P))+resultRow('Interest Earned',fmt(A-P),false,true);
}

function calcRD() {
  const M=parseFloat(document.getElementById('rd-amount')?.value)||0;
  const r=(parseFloat(document.getElementById('rd-rate')?.value)||0)/100/4;
  const months=parseFloat(document.getElementById('rd-months')?.value)||0;
  if(!M||!r||!months) return;
  const n=months/3; let maturity=0;
  for(let i=1;i<=n;i++) maturity+=M*3*Math.pow(1+r,n-i+1);
  const invested=M*months;
  const el=document.getElementById('rd-result'), rowsEl=document.getElementById('rd-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML=resultRow('Maturity Amount',fmt(maturity),true,true)+resultRow('Total Deposited',fmt(invested))+resultRow('Interest Earned',fmt(maturity-invested),false,true);
}

function calcLoan() {
  const salary=parseFloat(document.getElementById('loan-salary')?.value)||0;
  const rate=(parseFloat(document.getElementById('loan-rate')?.value)||8.5)/100/12;
  const years=parseFloat(document.getElementById('loan-years')?.value)||20;
  const existing=parseFloat(document.getElementById('loan-existing')?.value)||0;
  if(!salary) return;
  const maxEMI=Math.max(0,salary*0.5-existing), N=years*12;
  const eligible=maxEMI*(Math.pow(1+rate,N)-1)/(rate*Math.pow(1+rate,N));
  const el=document.getElementById('loan-result'), rowsEl=document.getElementById('loan-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML=resultRow('Max Eligible Loan',fmt(eligible),true,true)+resultRow('Max Affordable EMI',fmt(maxEMI))+resultRow('Tenure',years+' years')+resultRow('(50% salary rule applied)','');
}

function calcInterest() {
  const P=parseFloat(document.getElementById('int-principal')?.value)||0;
  const r=(parseFloat(document.getElementById('int-rate')?.value)||0)/100;
  const t=parseFloat(document.getElementById('int-years')?.value)||0;
  const type=document.getElementById('int-type')?.value||'simple';
  if(!P||!r||!t) return;
  let interest,total;
  if(type==='simple'){interest=P*r*t;total=P+interest;}
  else{total=P*Math.pow(1+r,t);interest=total-P;}
  const el=document.getElementById('int-result'), rowsEl=document.getElementById('int-rows');
  if(!el||!rowsEl) return;
  el.style.display='block';
  rowsEl.innerHTML=resultRow('Total Amount',fmt(total),true,true)+resultRow('Principal',fmt(P))+resultRow('Interest Earned',fmt(interest),false,true);
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function exportPDF(type) {
  showToast('🖨️ Opening print dialog – Save as PDF');
  setTimeout(()=>window.print(), 300);
}

function exportReportText(type, gpa, pct) {
  const text = `AcadScore Report\n================\nType: ${type.toUpperCase()}\n${type.toUpperCase()}: ${gpa}\nPercentage: ${pct}\nDate: ${new Date().toLocaleDateString('en-IN')}\nhttps://acadscoreapp.com`;
  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(()=>showToast('📋 Summary copied to clipboard!'));
  } else {
    const ta=document.createElement('textarea'); ta.value=text;
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
    showToast('📋 Copied!');
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GRADE AUTOCOMPLETE DATALIST
// ─────────────────────────────────────────────────────────────────────────────
function ensureGradeDatalist() {
  if (document.getElementById('grade-suggestions')) return;
  const dl = document.createElement('datalist'); dl.id='grade-suggestions';
  ['O','A+','A','B+','B','C','D','F','RA','S','E','AB'].forEach(g=>{
    const o=document.createElement('option'); o.value=g; dl.appendChild(o);
  });
  document.body.appendChild(dl);
}

// ─────────────────────────────────────────────────────────────────────────────
// INIT  — single DOMContentLoaded, no duplicates
// ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  ensureGradeDatalist();

  // Show home page (lazy-init other pages on first visit)
  showPage('home');

  // Keyboard shortcut: Alt+D → toggle dark
  document.addEventListener('keydown', e => { if (e.altKey && e.key==='d') toggleDark(); });
});
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const page = btn.dataset.page;
        showPage(page);
    });
});

async function sendMessage() {
    const name    = document.getElementById("contactName").value.trim();
    const email   = document.getElementById("contactEmail").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    if (!name || !email || !message) {
        alert("Please fill all fields");
        return;
    }

    try {
        const response = await fetch('https://acdscore-platform.onrender.com/api/contact', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, message }),
        });

        const result = await response.json();
        if (result.success) {
            alert('✅ Message sent successfully!');
            document.getElementById("contactName").value    = "";
            document.getElementById("contactEmail").value   = "";
            document.getElementById("contactMessage").value = "";
        } else {
            alert('❌ Failed to send message: ' + (result.message || 'Unknown error'));
        }
    } catch (err) {
        alert('❌ Network error. Please check your connection and try again.');
        console.error('Contact form error:', err);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("sendBtn");
    if (btn) btn.addEventListener("click", sendMessage);
});