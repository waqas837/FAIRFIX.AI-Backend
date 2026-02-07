# Agency Vehicle Inspection API

Node.js/Express backend with PostgreSQL and Prisma for an agency vehicle inspection app.

## Structure

```
backend/
├── app.js                 # Express app (middleware, routes)
├── server.js              # HTTP server entry point
├── prisma/
│   └── schema.prisma      # PostgreSQL schema (Agency, Vehicle, Inspection)
├── src/
│   ├── config/            # DB connection, env
│   │   ├── database.js    # Prisma client singleton
│   │   └── index.js
│   ├── models/            # Data layer (re-exports Prisma)
│   │   └── index.js
│   ├── controllers/       # Request logic
│   │   ├── agencyController.js
│   │   ├── vehicleController.js
│   │   └── inspectionController.js
│   ├── routes/            # API endpoints
│   │   ├── index.js       # Mounts /agencies, /vehicles, /inspections
│   │   ├── agencyRoutes.js
│   │   ├── vehicleRoutes.js
│   │   └── inspectionRoutes.js
│   └── middleware/        # Auth, validation, error handling
│       ├── auth.js
│       ├── validation.js
│       ├── errorHandler.js
│       └── index.js
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
   - Set `DATABASE_URL` to your PostgreSQL connection string

3. **Database**
   ```bash
   npm run db:generate   # Generate Prisma client
   npm run db:migrate    # Run migrations (or db:push for dev)
   ```

4. **Run**
   ```bash
   npm start       # Production
   npm run dev     # Development (with --watch)
   ```

## API

Base URL: `http://localhost:3000/api`

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/agencies` | List agencies |
| GET | `/agencies/:id` | Get agency |
| POST | `/agencies` | Create agency |
| PATCH | `/agencies/:id` | Update agency |
| DELETE | `/agencies/:id` | Delete agency |
| GET | `/vehicles` | List vehicles (`?agencyId=`) |
| GET | `/vehicles/:id` | Get vehicle |
| POST | `/vehicles` | Create vehicle |
| PATCH | `/vehicles/:id` | Update vehicle |
| DELETE | `/vehicles/:id` | Delete vehicle |
| GET | `/inspections` | List inspections (`?vehicleId=`, `?status=`) |
| GET | `/inspections/:id` | Get inspection |
| POST | `/inspections` | Create inspection |
| PATCH | `/inspections/:id` | Update inspection |
| DELETE | `/inspections/:id` | Delete inspection |

## Naming

- **Files**: camelCase for multi-word (`agencyController.js`, `errorHandler.js`), single word as-is (`auth.js`)
- **Folders**: lowercase (`config`, `models`, `controllers`, `routes`, `middleware`)
- **Exports**: singular names for routers and controllers
