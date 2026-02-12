# FAIRFIX.AI Backend

Node.js/Express API with PostgreSQL and Prisma for **FAIRFIX.AI** — customer app, shop owner dashboard, and mechanic expert dashboard (OBD scans, expert calls, parts orders, repair jobs, towing, case state machine).

**Production-ready with compliance features:** JWT authentication, RBAC, consent management, data export/deletion, VIN hashing, phone masking, audit logging, rate limiting, and data retention policies (CCPA/PIPEDA/GDPR compliant).

## Tech stack

- **Runtime:** Node.js (>=18)
- **Framework:** Express
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** JWT (jsonwebtoken)
- **Security:** bcryptjs, express-rate-limit
- **Documentation:** Swagger/OpenAPI (swagger-ui-express, swagger-jsdoc)
- **Compliance:** crypto-js (VIN hashing), node-cron (retention jobs)

## Roles

| Role | Description |
|------|-------------|
| **Customer** | Scan vehicle (OBD), talk to Monica AI, book expert calls, order parts (DIY or to shop), find/book shops, request towing |
| **Shop owner** | Run a repair shop; job queue (intake → approval → vehicle arrival → parts workflow → completion), payments, disputes |
| **Mechanic expert** | Remote video/audio calls with customers for advice; availability, call queue, earnings |

## Project structure

```
backend/
├── app.js                    # Express app (middleware, routes)
├── server.js                 # HTTP server entry
├── prisma/
│   └── schema.prisma         # Full schema (User, Vehicle, Case, Shop, Expert, etc.)
├── src/
│   ├── config/
│   │   ├── database.js       # Prisma client
│   │   └── index.js
│   ├── controllers/          # Request handlers
│   │   ├── userController.js
│   │   ├── vehicleController.js
│   │   ├── subscriptionController.js
│   │   ├── shopController.js
│   │   ├── caseController.js
│   │   ├── expertController.js
│   │   ├── scanController.js
│   │   ├── repairController.js
│   │   ├── alertController.js
│   │   ├── orderController.js
│   │   ├── expertCallController.js
│   │   ├── towingController.js
│   │   └── termsController.js
│   ├── routes/               # API routes (mounted under /api)
│   │   ├── index.js
│   │   ├── userRoutes.js
│   │   ├── vehicleRoutes.js
│   │   ├── subscriptionRoutes.js
│   │   ├── shopRoutes.js
│   │   ├── caseRoutes.js
│   │   ├── expertRoutes.js
│   │   ├── scanRoutes.js
│   │   ├── repairRoutes.js
│   │   ├── alertRoutes.js
│   │   ├── orderRoutes.js
│   │   ├── expertCallRoutes.js
│   │   ├── towingRoutes.js
│   │   └── termsRoutes.js
│   ├── middleware/
│   │   ├── auth.js           # JWT authentication middleware
│   │   ├── rbac.js            # Role-based access control
│   │   ├── audit.js           # Audit logging middleware
│   │   ├── rateLimit.js       # Rate limiting middleware
│   │   ├── errorHandler.js
│   │   ├── validation.js
│   │   └── index.js
│   ├── controllers/
│   │   ├── consentController.js    # Consent management
│   │   ├── dataRequestController.js # Data export/delete
│   │   └── ...
│   ├── utils/
│   │   ├── compliance.js      # VIN hashing, phone masking
│   │   ├── jwt.js             # JWT token generation/verification
│   │   └── auth.js             # Password hashing
│   ├── jobs/
│   │   └── retention.js       # Data retention/purge jobs
│   └── config/
│       └── swagger.js         # Swagger/OpenAPI configuration
│   └── models/
│       └── index.js          # Re-exports Prisma
├── package.json
└── .env.example
```

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your PostgreSQL connection string (e.g. `postgresql://user:pass@localhost:5432/fairfix`)
   - Set `JWT_SECRET` and `JWT_REFRESH_SECRET` (strong random strings for production)
   - Optional: `JWT_EXPIRES_IN` (default: 7d), `JWT_REFRESH_EXPIRES_IN` (default: 30d)

3. **Database**
   ```bash
   npm run db:generate   # Generate Prisma client
   npm run db:push       # Sync schema to DB (dev), or db:migrate for migrations
   ```

4. **Run**
   ```bash
   npm start       # Production
   npm run dev     # Development (with --watch)
   ```

Server runs at `http://localhost:3000` (or `PORT` from env).

## API (M1 – read endpoints)

Base URL: `http://localhost:3000/api`

**Auth (M1):** For “current user” endpoints, send **`x-user-id: <userCuid>`** in the request header. Optional: `x-api-key` or `?apiKey=` as user id. If `REQUIRE_AUTH=true` in env, requests without user id or api key return 401.

### Authentication Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | - | Register new user |
| POST | `/auth/login` | - | Login (returns JWT tokens) |
| POST | `/auth/refresh` | - | Refresh access token |
| GET | `/auth/me` | required | Current user profile |

### Core Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | - | Health check |
| GET | `/terms` | - | Platform terms |
| GET | `/users/me` | required | Current user profile |
| GET | `/vehicles` | required | Current user's vehicles |
| GET | `/vehicles/:id` | required | One vehicle |
| GET | `/vehicles/:vehicleId/scans` | required | Scans for vehicle |
| GET | `/vehicles/:vehicleId/scans/latest` | required | Latest scan |
| GET | `/subscriptions` | required | Current user's subscriptions |
| GET | `/subscriptions/:id` | required | One subscription |
| GET | `/shops` | - | List shops (`?near=lat,lng` or `?search=`) |
| GET | `/shops/:id` | - | One shop |
| GET | `/shops/:id/reviews` | - | Shop reviews |
| GET | `/cases` | required | Current user's cases (`?status=`) |
| GET | `/cases/:id` | required | One case |
| GET | `/experts` | - | List experts (`?status=ACTIVE`) |
| GET | `/experts/:id` | - | One expert |
| GET | `/scans/:id` | required | One scan (if user owns vehicle) |
| GET | `/repairs` | required | Current user's repairs (`?status=`) |
| GET | `/repairs/:id` | required | One repair |
| GET | `/alerts` | required | Current user's alerts |
| GET | `/orders` | required | Current user's orders (`?status=`) |
| GET | `/orders/:id` | required | One order |
| GET | `/expert-calls` | required | Current user's expert calls |
| GET | `/expert-calls/:id` | required | One expert call |
| GET | `/towing/history` | required | Current user's towing requests (`?status=`) |
| GET | `/towing/:id` | required | One towing request |

### Privacy & Compliance Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/consent` | required | Grant/withdraw consent |
| GET | `/consent/history` | required | Get consent history |
| POST | `/data-requests` | required | Request data export or deletion |
| GET | `/data-requests` | required | List data requests |
| GET | `/data-requests/:id` | required | Get data request status |

### Admin Endpoints (Admin Role Required)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/admin/audit-logs` | admin | Get audit logs |
| GET | `/admin/users` | admin | Get all users |
| GET | `/admin/users/:id` | admin | Get user by ID |
| GET | `/admin/disputes` | admin | Get all disputes |
| GET | `/admin/disputes/:id` | admin | Get dispute by ID |
| GET | `/admin/support-tickets` | admin | Get all support tickets |
| GET | `/admin/support-tickets/:id` | admin | Get support ticket by ID |
| GET | `/admin/stats` | admin | Get system statistics |

## Security & Compliance Features

### Authentication & Authorization
- **JWT Authentication:** Secure token-based authentication with access and refresh tokens
- **RBAC (Role-Based Access Control):** Middleware to enforce role-based permissions (customer, shop_owner, expert, admin)
- **Refresh Token Management:** Refresh tokens stored in database with revocation support

### Privacy & Compliance (CCPA/PIPEDA/GDPR)
- **Consent Management:** Explicit consent logging for diagnostic data, call recording, AI monitoring, etc.
- **Data Export:** Users can request export of their personal data
- **Data Deletion:** Users can request deletion of their personal data (right to be forgotten)
- **VIN Hashing:** Vehicle Identification Numbers are hashed (SHA-256) before storage
- **Phone Masking:** Phone numbers are masked in API responses (shows only last 4 digits)
- **Audit Logging:** All sensitive actions are logged (login, data export, consent changes, etc.)
- **Data Retention:** Automated retention policies with scheduled purge jobs

### Security Best Practices
- **Rate Limiting:** 
  - General API: 100 requests per 15 minutes per IP
  - Auth endpoints: 5 requests per 15 minutes per IP
  - Data requests: 3 requests per hour per user
- **Request Validation:** Input validation on all write endpoints
- **Error Handling:** Standardized error responses

### Data Retention Policies
- **Diagnostic Scans:** 1 year
- **Expert Calls:** 2 years
- **Alerts:** 3 months
- **Disputes:** 3 years
- **Support Tickets:** 1 year
- **Audit Logs:** 7 years (compliance requirement)
- **Consent Logs:** 7 years (compliance requirement)

Retention purge jobs run daily at 2:00 AM automatically.

## Schema overview

- **User, Vehicle, Subscription** — Customer profile, vehicles, plans
- **Case** — Repair case (state machine: CASE_CREATED → … → POST_CONFIRMATION_COMPLETE); links to InstallWindow, DecisionLock, Shipment, Appointment, etc.
- **Shop, ShopDocument, ShopReview** — Shop owner and shop data
- **Expert, ExpertCall, TrainingVideo, ExpertTrainingCompletion** — Mechanic expert and calls
- **Order, OrderItem** — Parts orders (DIY or to shop)
- **TowingRequest** — Towing requests
- **DiagnosticScan, Repair, Alert** — Scans, repair history, alerts
- **Dispute, DisputeEvent** — Shop disputes
- **Transaction, Notification, ChangeRequest, SupportTicket** — Payments, notifications, support
- **ConsentLog** — Consent management (immutable log)
- **DataRequest** — Data export/delete requests
- **AuditLog** — Audit trail for sensitive actions
- **RefreshToken** — Refresh token storage and revocation

Case state machine, install window, decision lock, vendor commitments, shipment/custody/exceptions follow client requirements (no skipping states, backend gates).

## Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start server |
| `npm run dev` | Start with watch |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:migrate` | Run migrations |
| `npm run db:push` | Push schema to DB (dev) |
| `npm run db:studio` | Open Prisma Studio |
| `node scripts/create-admin.js [email] [password]` | Create or update admin user |
| `node scripts/seed-shops.js` | Seed 3 approved shops for testing Case flow (vehicle + shop selection) |

## Architecture Notes

### Authentication Flow
1. User registers/logs in → receives JWT access token and refresh token
2. Access token included in `Authorization: Bearer <token>` header for protected routes
3. Access token expires → use refresh token to get new access token
4. Refresh tokens stored in database for revocation support

### Compliance Implementation
- **VIN Hashing:** VINs are hashed using SHA-256 before storage. Plain VINs are never stored.
- **Phone Masking:** Phone numbers in API responses are automatically masked (e.g., `***-***-1234`).
- **Consent:** All consent changes are logged immutably with IP, user agent, and timestamp.
- **Data Requests:** Export/delete requests are queued and processed asynchronously.

### Rate Limiting
Rate limits are applied at the middleware level:
- Prevents brute force attacks on auth endpoints
- Protects against API abuse
- Different limits for different endpoint types

### Audit Logging
Sensitive actions are automatically logged:
- User login/logout
- Consent changes
- Data export/delete requests
- Admin actions
- Any action marked with `auditLog` middleware

## License

ISC
