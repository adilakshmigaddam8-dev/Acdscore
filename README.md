# AcadScore Backend API

Production-ready Node.js + Express + MongoDB backend for the AcadScore platform.

---

## Quick Start

```bash
cd backend
npm install
cp .env.example .env       # fill in your values
node scripts/seedAdmin.js  # create first admin
npm run dev                # start with nodemon
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key for access tokens |
| `JWT_EXPIRE` | Token expiry (e.g., `7d`) |
| `JWT_REFRESH_SECRET` | Secret key for refresh tokens |
| `JWT_REFRESH_EXPIRE` | Refresh token expiry (e.g., `30d`) |
| `EMAIL_USER` | Gmail address for OTP emails |
| `EMAIL_PASSWORD` | Gmail App Password |
| `CLIENT_URL` | Frontend URL for CORS |

---

## API Reference

### Auth – `/api/auth`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/register` | ❌ | Register new user |
| POST | `/login` | ❌ | Login, returns JWT |
| GET | `/profile` | ✅ | Get logged-in user profile |
| POST | `/refresh-token` | ❌ | Refresh JWT using refresh token |
| POST | `/logout` | ✅ | Logout (invalidates refresh token) |
| POST | `/forgot-password` | ❌ | Send OTP to email |
| POST | `/reset-password` | ❌ | Reset password with OTP |

### Academic Records – `/api/academic` (all protected)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/create` | Create semester record |
| GET | `/all` | Get all records + CGPA |
| GET | `/:id` | Get single record |
| PUT | `/update/:id` | Update record |
| DELETE | `/delete/:id` | Delete record |

### Calculators – `/api/calculator` (public)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/sgpa` | Calculate SGPA from subjects |
| POST | `/cgpa` | Calculate CGPA from semesters |
| POST | `/cgpa-to-percentage` | Convert CGPA → Percentage |
| POST | `/percentage-to-cgpa` | Convert Percentage → CGPA |
| POST | `/attendance` | Calculate attendance % |
| GET | `/history` | 🔒 User's calculation history |

#### CGPA/Percentage formula options
`standard` · `anna_university` · `jntu` · `vtu` · `mumbai`

### Finance – `/api/finance` (public)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/emi` | EMI calculator |
| POST | `/sip` | SIP maturity calculator |
| POST | `/fd` | Fixed Deposit calculator |
| POST | `/rd` | Recurring Deposit calculator |
| POST | `/salary` | CTC → In-hand salary (India) |

### Reports – `/api/reports` (protected)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/generate` | Download academic PDF report |

### Admin – `/api/admin` (admin only)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/dashboard` | Stats: users, calculations, visitors |
| GET | `/users` | List all users (paginated) |
| DELETE | `/users/:id` | Delete user |
| GET | `/calculations` | All calculations log |

### Analytics – `/api/analytics`

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/track` | ❌ | Track pageview/event |
| GET | `/overview` | 🛡️ Admin | Analytics overview |

---

## Request / Response Examples

### SGPA
```json
POST /api/calculator/sgpa
{
  "subjects": [
    { "credit": 4, "gradePoint": 9 },
    { "credit": 3, "gradePoint": 8 },
    { "credit": 4, "gradePoint": 7.5 }
  ]
}

→ { "success": true, "sgpa": 8.27, "totalCredits": 11 }
```

### EMI
```json
POST /api/finance/emi
{ "loanAmount": 500000, "annualInterestRate": 8.5, "tenureMonths": 60 }

→ { "success": true, "emi": 10230, "totalInterest": 113800, "totalPayment": 613800 }
```

### Salary
```json
POST /api/finance/salary
{ "annualCTC": 1200000 }

→ {
    "success": true,
    "annualCTC": 1200000,
    "monthlyGross": 100000,
    "basicSalary": 50000,
    "employeePF": 1800,
    "estimatedAnnualTax": 0,
    "monthlyInHand": 98000
  }
```

---

## Security

- **JWT** access + refresh token auth
- **bcrypt** password hashing (cost factor 12)
- **Helmet** security headers
- **express-mongo-sanitize** against NoSQL injection
- **hpp** HTTP parameter pollution protection
- **Rate limiting**: 200 req/15min general, 20 req/15min on auth
- **CORS** restricted to allowed origins

---

## Deployment

### Render / Railway
1. Connect your GitHub repo
2. Set all environment variables
3. Build command: `npm install`
4. Start command: `npm start`

### VPS (PM2)
```bash
npm install -g pm2
pm2 start server.js --name acadscore-api
pm2 save && pm2 startup
```

---

## Project Structure

```
backend/
├── config/         # DB connection
├── controllers/    # Route handlers
├── middleware/     # Auth, error, validation
├── models/         # Mongoose schemas
├── routes/         # Express routers
├── scripts/        # Seed & setup scripts
├── services/       # Business logic (calculators)
├── utils/          # JWT, email, logger
├── logs/           # Winston log files
├── .env.example
├── package.json
└── server.js
```
