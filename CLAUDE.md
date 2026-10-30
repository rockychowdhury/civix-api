# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

The following npm scripts are available for common development tasks:

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server with auto-reload (`tsx watch src/server.ts`) |
| `npm run build` | Build the TypeScript project (`tsup`) |
| `npm run start` | Start the production server (`node dist/server.js`) |
| `npm test` | **No tests defined** — see note below |
| `npm run format:check` | Check code formatting with Biome |
| `npm run format:fix` | Auto-format code with Biome |
| `npm run lint:check` | Lint code with Biome |
| `npm run lint:fix` | Auto-fix lint issues with Biome |
| `npm run seed` | Run database seeding script |

**Testing**: Currently no test files exist in the `src/` directory. The `npm test` script echoes an error and exits. If tests are added, update this accordingly.

## Architecture & Structure

This is a **Node.js/Express API backend** for Civix, a civic issue management platform. Key architectural patterns:

### Module-based structure (`src/module/`)
Each feature area is self-contained with its own routes, controllers, services, and validation:

- `auth` — Authentication routes and middleware
- `roles` — Role management
- `permissions` — Permission management
- `categories` — Issue categorization
- `municipalities` — Geographic/administrative divisions
- `zones` — Sub-divisions within municipalities
- `wards` — Electoral/ administrative wards
- `locations` — Point-level location tracking
- `service-requests` — Citizen-reported issues (entry point)
- `civic-issues` — Dedup'd/consolidated civic issues
- `work-orders` — Internal work order creation and tracking
- `assignments` — Technician/team assignment
- `resolutions` — Resolution tracking
- `feedback` — Citizen feedback collection
- `attachments` — File uploads (Cloudinary)
- `notifications` — Email/notification system
- `staff` — Staff/user management
- `teams` — Team organization
- `sla-policy` — Service Level Agreement policies
- `department` — Department routing

### Key directories

- `src/app.ts` — Express app configuration (middleware, routes, error handling)
- `src/config/index.ts` — Environment variable configuration via dotenv
- `src/middleware/` — Global error handler, auth validation, rate limiting
- `src/lib/` — Prisma client, Cloudinary integration, Google auth, utilities
- `src/utils/` — Pagination, response helpers, email service, JWT, seed data
- `prisma/schema/` — Modular Prisma schema and migrations
- `src/utils/seed/` — Database seeding scripts

### Data flow (core business logic)

```
ServiceRequest (raw citizen report)
  → dedup check → CivicIssue (single operational record)
  → auto-route by category + ward → Department queue
  → SLA timers start → WorkOrder + technician assignment
  → field updates → resolution → verification → citizen feedback
```

### Environment variables (refer to `.env.example`)

Critical env vars referenced in `src/config/index.ts`:

- `DATABASE_URL` — PostgreSQL connection
- `REDIS_*` — Redis connection for sessions/rate limiting
- `CLOUDINARY_*` — Cloudinary asset storage
- `JWT_*` — JWT access/refresh secrets and expiration
- `SMTP_*` — Email sending configuration
- `BCRYPT_SALT_ROUNDS` — Password hashing cost
- `NODE_ENV` — Development/production mode

### Docker

Build and run via Docker (as documented in README):

```bash
docker build -t civix-api .
docker run -p 5000:5000 --env-file .env civix-api
```

## Code Standards

- **Format**: Biome (`npm run format:check` / `npm run format:fix`)
- **Lint**: Biome (`npm run lint:check` / `npm run lint:fix`)
- **Type safety**: Zod validation on every input (`src/module/*/validation.ts`)
- **Error handling**: Global error handler in `src/middleware/globalErrorHandler.ts`
- **Database**: Prisma ORM with PostgreSQL; migrations in `prisma/migrations/`