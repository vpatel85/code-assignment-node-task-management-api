# Project Memory

## Stack
- NestJS 10 + TypeScript + Prisma ORM on PostgreSQL; Docker Compose manages local DB; Jest for unit and e2e testing.
- Email notifications handled by a dedicated `EmailModule`/`EmailService` — not a third-party SDK yet, likely a stub or nodemailer wrapper.

## Gotchas
- Prisma client must be regenerated (`npm run prisma:generate`) after any schema change before the app or tests will compile correctly.
- Seed script uses `ts-node` directly — ensure `ts-node` is available and `tsconfig.json` paths are correct if adding new seed imports.
- E2E tests have a separate Jest config (`test/jest-e2e.json`) — running `npm test` alone will NOT execute e2e specs.
- `app.module.ts` is the single registration point for all feature modules — forgetting to add a new module here is a common integration failure.

## History
- First cycle: bootstrap complete.
