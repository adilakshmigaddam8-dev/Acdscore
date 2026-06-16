# 🎓 AcadScore Backend API

<div align="center">

### Empowering Students with Smart Academic & Financial Intelligence

A production-grade **Node.js, Express, and MongoDB** backend powering the **AcadScore Platform** — a modern ecosystem of academic calculators, financial tools, performance analytics, secure authentication, and reporting services designed for students, educators, and professionals.

Built with scalability, security, and performance in mind.

![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![Express](https://img.shields.io/badge/Express.js-Framework-black)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-green)
![JWT](https://img.shields.io/badge/JWT-Authentication-blue)
![License](https://img.shields.io/badge/License-MIT-orange)

</div>

---

## 🚀 About AcadScore

AcadScore is a comprehensive educational and financial analytics platform that helps users:

* Calculate **SGPA, CGPA, GPA conversions, and percentages**
* Track academic performance across semesters
* Generate professional academic reports
* Manage secure user accounts with JWT authentication
* Access salary, EMI, SIP, FD, and RD calculators
* Analyze learning progress through dashboards and insights
* Store and retrieve academic records securely

Whether you're a student monitoring your GPA, a graduate preparing for placements, or a professional evaluating financial goals, AcadScore provides the tools needed to make informed decisions.

---

## ✨ Core Features

### 🎓 Academic Tools

* SGPA Calculator
* CGPA Calculator
* CGPA → Percentage Converter
* Percentage → CGPA Converter
* Attendance Calculator
* Academic Record Management
* Performance Analytics

### 💰 Financial Tools

* EMI Calculator
* SIP Calculator
* Fixed Deposit Calculator
* Recurring Deposit Calculator
* Salary & In-Hand Income Calculator

### 🔐 Authentication & Security

* User Registration & Login
* JWT Access & Refresh Tokens
* OTP-Based Password Recovery
* Password Encryption with bcrypt
* Role-Based Authorization

### 📊 Analytics & Reporting

* User Activity Tracking
* Academic PDF Report Generation
* Admin Dashboard Insights
* Calculation History Monitoring

### ⚙️ Enterprise-Ready Infrastructure

* RESTful API Architecture
* MongoDB Atlas Integration
* Centralized Error Handling
* Request Validation
* Rate Limiting
* Security Middleware
* Production Deployment Ready

---

# 🚀 Quick Start

```bash
cd backend
npm install
cp .env.example .env
node scripts/seedAdmin.js
npm run dev
```

Backend runs at:

```bash
http://localhost:5000
```

---

# 🌐 API Modules

## 🔐 Authentication

`/api/auth`

Secure authentication system with JWT access and refresh tokens.

### Features

* Register
* Login
* Logout
* Refresh Tokens
* Forgot Password
* OTP Verification
* Password Reset

---

## 🎓 Academic Management

`/api/academic`

Manage semester records and academic history.

### Features

* Create Records
* Update Records
* Delete Records
* Calculate CGPA
* View Academic Progress

---

## 📚 Academic Calculators

`/api/calculator`

Powerful GPA and percentage calculation services.

Supported formulas:

* Standard
* Anna University
* JNTU
* VTU
* Mumbai University

---

## 💰 Finance Calculators

`/api/finance`

Financial planning tools for students and professionals.

### Includes

* EMI Calculator
* SIP Calculator
* Fixed Deposit Calculator
* Recurring Deposit Calculator
* Salary Calculator

---

## 📄 Reports

`/api/reports`

Generate downloadable academic reports in PDF format.

---

## 🛡️ Admin Dashboard

`/api/admin`

Administrative controls for platform management.

### Capabilities

* User Management
* Analytics Overview
* Calculation Logs
* Platform Statistics

---

## 📈 Analytics

`/api/analytics`

Track user engagement and application usage patterns.

---

# 🔒 Security Architecture

AcadScore follows modern backend security practices:

* JWT Authentication
* Refresh Token Rotation
* bcrypt Password Hashing
* Helmet Security Headers
* Rate Limiting Protection
* MongoDB Injection Prevention
* HPP Protection
* Secure CORS Policies
* Environment Variable Isolation

---

# 📊 Technology Stack

| Layer          | Technology             |
| -------------- | ---------------------- |
| Runtime        | Node.js                |
| Framework      | Express.js             |
| Database       | MongoDB Atlas          |
| Authentication | JWT                    |
| Encryption     | bcrypt                 |
| Email Service  | Nodemailer             |
| Logging        | Winston                |
| Development    | Nodemon                |
| Deployment     | Render / Railway / VPS |

---

# 📁 Project Structure

```text
backend/
├── config/
├── controllers/
├── middleware/
├── models/
├── routes/
├── services/
├── scripts/
├── utils/
├── logs/
├── .env.example
├── package.json
└── server.js
```

---

# ☁️ Deployment

### Render

```bash
Build Command:
npm install

Start Command:
npm start
```

### Railway

```bash
npm install
npm start
```

### VPS + PM2

```bash
npm install -g pm2

pm2 start server.js --name acadscore-api

pm2 save
pm2 startup
```

---

# 🎯 Vision

AcadScore aims to become a complete digital companion for students by combining academic performance tracking, financial planning, analytics, and intelligent reporting into a single platform.

Our mission is simple:

> Help students understand their progress, plan their future, and achieve their goals through accurate data, modern technology, and intuitive tools.

---

## ⭐ Support the Project

If you find AcadScore useful:

⭐ Star the repository
🍴 Fork the project
🐛 Report issues
🚀 Contribute improvements

Together, let's build smarter tools for education and career success.
