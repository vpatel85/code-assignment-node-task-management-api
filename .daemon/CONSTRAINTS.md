# CONSTRAINTS.md

## Language & Framework
- TypeScript only — no plain `.js` files in `src/` or `test/`
- NestJS 10.x patterns only — do not downgrade or mix Express raw handlers
- Node.js LTS assumed; do not use experimental APIs

## Forbidden Patterns
- **Never use `require()`** — always use ES module `import`
- **Never instantiate `PrismaClient` directly** — always inject `PrismaService`
- **Never put business logic in controllers** — controllers delegate to services only
- **Never access `process.env` directly** — use NestJS `ConfigService` from `@nestjs/config`
- Do not use `any` type unless absolutely unavoidable; prefer explicit types or generics
- Do not use `console.log` for application logging — use NestJS `Logger`

## Testing Requirements
- Every new service method must have a corresponding unit test
- E2E tests live in `test/` and use `test/jest-e2e.json` config
- Run unit tests with `npm test` before submitting; all tests must pass
- Do not delete or skip existing tests

## Dependency Policy
- Do not add new `dependencies` or `devDependencies` without explicit justification in the PR description
- Prefer packages already present in `package.json` before introducing new ones

## Off-Limits / Special Care
- `src/prisma/prisma.service.ts` — modify only for lifecycle/connection concerns
- `prisma/seed.ts` — changes must keep seed data consistent and non-breaking
- `src/app.module.ts` — must be updated when adding new feature modules, but keep it clean
- `docker-compose.yml` — do not change DB credentials or ports without flagging it

## Naming Conventions
- Files: `kebab-case.type.ts` (e.g., `task-filter.dto.ts`, `tasks.service.ts`)
- Classes: PascalCase; decorators must match NestJS conventions (`@Injectable`, `@Controller`, etc.)
- DTOs: suffix with `.dto.ts`; enums use SCREAMING_SNAKE_CASE matching Prisma schema

## Integration Rules
- **New modules MUST be imported and registered in `app.module.ts`** — do not create orphaned modules
- **Before creating a new file, search the codebase for existing files with similar purpose** — extend existing files instead of duplicating
