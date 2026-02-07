# FAIRFIX.AI Backend

Node.js/Express API with PostgreSQL and Prisma for **FAIRFIX.AI** — customer app, shop owner dashboard, and mechanic expert dashboard (OBD scans, expert calls, parts orders, repair jobs, towing, case state machine).

## Tech stack

- **Runtime:** Node.js (>=18)
- **Framework:** Express
- **Database:** PostgreSQL
- **ORM:** Prisma

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
│   │   ├── auth.js           # x-user-id / apiKey for current user
│   │   ├── errorHandler.js
│   │   └── index.js
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

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/health` | - | Health check |
| GET | `/terms` | - | Platform terms (stub) |
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

## License

ISC
