# AGENTS.md

## What This Project Does
A NestJS REST API for task management supporting CRUD operations on tasks, projects, and users. Tasks support filtering by status, priority, assignee, project, and due date. Includes email notifications via a dedicated email module.

## Tech Stack
- **Framework:** NestJS 10 (TypeScript)
- **Database:** PostgreSQL via Prisma ORM
- **Caching:** `@nestjs/cache-manager`
- **Runtime:** Node.js, `ts-node` for seeds/scripts
- **Testing:** Jest (unit), Jest e2e config at `test/jest-e2e.json`
- **Containerization:** Docker Compose for local DB

## Directory Structure

src/
  app.module.ts          # Root module, imports all feature modules
  main.ts                # Entry point, bootstraps NestJS app on :3000
  prisma/                # PrismaService (singleton DB client)
  tasks/                 # Tasks feature: controller, service, DTOs
  projects/              # Projects feature: controller, service, module
  users/                 # Users feature: controller, service, module
  email/                 # Email notification service and module
prisma/
  seed.ts                # DB seed script (ts-node)
test/
  tasks.e2e-spec.ts      # E2E tests for tasks endpoints
  jest-e2e.json          # Jest config for e2e suite


## Commands
bash
npm run build          # Compile TypeScript via nest build
npm run start:dev      # Dev server with watch mode (:3000)
npm test               # Unit tests (Jest)
npm run test:e2e       # E2E tests
npm run test:cov       # Coverage report
npm run prisma:migrate # Run DB migrations (requires Docker up)
npm run prisma:generate # Regenerate Prisma client
npm run seed           # Seed database


## Key Patterns
- **Module pattern:** Every feature has its own `*.module.ts` that declares its controller and service — always register new modules in `app.module.ts`.
- **DTOs:** Input validation lives in `src/tasks/dto/` — use class-validator decorators; follow `create-task.dto.ts` and `update-task.dto.ts` as templates.
- **PrismaService:** Injected via `PrismaModule` — never instantiate Prisma directly; always inject `PrismaService`.
- **Filtering:** Query params handled via `task-filter.dto.ts` pattern — use DTOs for all query param shapes.
- **Email:** Side-effect notifications go through `EmailService` — do not call external services from controllers directly.

## Important File Locations
- DB schema: `prisma/schema.prisma` (not in tree but implied by migrate/generate scripts)
- Environment config: NestJS `@nestjs/config` — expect `.env` for `DATABASE_URL` etc.
- Route definitions: controllers in `src/*/**.controller.ts`
- E2E entry: `test/tasks.e2e-spec.ts`
