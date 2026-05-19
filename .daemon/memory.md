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
- Build engine fallback to direct mode works reliably, but initial file selection returned 0 matches — future cycles should pre-validate file paths or use broader search patterns to avoid empty reads before the build loop
- No CI checks were configured on the repo, allowing approval despite missing test files — cycles should flag repos without CI/test infrastructure earlier and recommend adding them before dependency updates
**2026-05-18 — Goal Suggestions (Cycle #4385):**
- Set up Dependabot or Renovate to automate dependency updates—manual audits should trigger automation, not replace it
- Before updating dependencies, identify which are critical vs. optional to risk-prioritize updates
- Add a `npm audit` check to CI/CD pipeline to catch new vulnerabilities before merge
- Consider adding a security.md file documenting vulnerability disclosure and response procedures
- Start test coverage improvements with high-risk API endpoints (auth, data mutation) before low-risk ones
- Dependabot configuration should explicitly enable major version updates and security-focused settings; the current npm-only setup with only patch/minor grouping misses critical security patches in major version ranges and lacks coverage for other package managers that may exist in the repository
- Team references in Dependabot reviewers field ('maintainers') should be validated against actual GitHub team configurations before merge to prevent PRs from failing to route to correct reviewers
**2026-05-19 — Goal Suggestions (Cycle #4390):**
- Consider setting up automatic merging for patch-level Dependabot PRs to reduce manual review burden
- Add a bug triage meeting cadence (weekly?) to systematically work through Linear issues before they pile up
- Create a test coverage dashboard to visualize progress toward coverage targets and identify gaps
- Document which API endpoints are 'critical' for coverage purposes—not all endpoints need 100% coverage
- Consider adding a SECURITY.md file with the incident response runbook for transparency with users

