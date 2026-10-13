# Civix API - Civic Issue Management Backend

Backend for Civix, a civic platform where residents report street-level problems and track resolution. It routes each report to the right department, enforces deadlines, and tracks the fix to verification.

**Live API:** `https://civix-api.vercel.app/api/v1` | **Client repo:** [civix-client](https://github.com/rockychowdhury/civix-client)

## Why this exists

City complaints usually fail after filing. They go to the wrong department, sit with no deadline, and duplicates create repeat field visits. Civix closes that loop with one trackable issue per problem.

## What it does (business workflow)

- Groups duplicate citizen reports into one civic issue that gains priority as more neighbors report it, giving crews a single job.
- Routes issues by category and ward with SLA deadlines, pushing overdue ones to an escalated queue for managers.
- Keeps the report-to-resolve pipeline in Postgres transactions with status history, so public tracking never goes stale.

## Tech

Node.js, Express, TypeScript, PostgreSQL, Prisma, Redis, Zod, Cloudinary, Nodemailer, node-cron

- Prisma + Postgres for transactional issue, work order, and SLA models
- Redis for session/rate-limit support, Cloudinary for issue photo uploads
- Zod validation on every input, cron-based SLA breach checks and escalation

## Core flows

```
ServiceRequest (raw citizen report)
  -> dedup check -> CivicIssue (single operational record)
  -> auto-route by category + ward -> Department queue
  -> SLA timers start -> WorkOrder + technician assignment
  -> field updates -> resolution -> verification -> citizen feedback
```

Key endpoints: `POST /service-requests`, `GET /civic-issues`, `POST /work-orders`, `POST /assignments`, `GET /municipalities/:id/overview`

## Run locally

```bash
git clone https://github.com/rockychowdhury/civix-api.git
cd civix-api
npm install
cp .env.example .env
# set DATABASE_URL, REDIS_*, CLOUDINARY_*, JWT_*
npx prisma migrate dev
npm run seed
npm run dev
```

API runs on `http://localhost:5000`.

## Structure

```
src/
  module/        # service-requests, civic-issues, work-orders, assignments, sla-policy, staff, teams
  middleware/    # auth, validate, error handler
  utils/seed/    # geography, roles, SLA policies
prisma/
  schema/        # modular models and migrations
```

## Author

Rocky Chowdhury, Backend Developer, Dhaka, Bangladesh
Portfolio: https://rockychowdhury.vercel.app | LinkedIn: https://linkedin.com/in/rockychowdhury1
