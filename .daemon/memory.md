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
- npm audit CI checks pass silently when no CI is configured on the repo—future cycles should verify CI infrastructure exists and is reporting before marking security checks as complete
- The build succeeded despite "no test files found for changed files" warning—future cycles should treat missing tests for security-critical changes (like audit workflows) as a blocker, not just a note
**2026-05-19 — Goal Suggestions (Cycle #4391):**
- Consider adding Dependabot auto-merge configuration for patch-level updates only—this reduces manual PR review burden while maintaining safety
- Test coverage should be measured and reported in CI before accepting PRs; recommend integrating codecov or similar to track progress toward 80% threshold
- The 'triage and fix bugs' goal is vague—establish a clear Linear label system (e.g., 'bug-critical', 'bug-minor') and assign SLAs to each tier
- API contract enforcement via OpenAPI is valuable; consider generating docs from spec rather than writing manually to keep spec/code in sync
- Build log shows "No test files found for changed files — tests should be added" but delivery note claims tests were added; future cycles should verify test files actually exist in the repo before marking complete, as approval gate may pass without CI infrastructure to catch missing artifacts.
- Search pattern `\.service\.spec\.ts` returned 0 matches initially, indicating test files may not follow standard naming convention or directory structure; future cycles should confirm Jest test file patterns and locations during file selection phase to avoid blind edits.
**2026-05-19 — Goal Suggestions (Cycle #4393):**
- **URGENT**: Address the failed/skipped dependency bump tasks—determine why they're failing and establish a dependency review process with clear decision criteria (auto-merge patch/minor, manual review major)
- Split test coverage work into phases: (1) Unit tests for all services (TasksService is still pending), (2) Integration tests for controllers, (3) E2E tests for critical workflows
- Consider adding a GitHub Action that auto-merges safe Dependabot PRs (patch versions with passing CI) to reduce manual review burden
- Add input validation and error handling unit tests—these are critical for API reliability and often overlooked
- Document the Linear triage workflow before accumulating too many issues (create issue templates, severity labels, assignment rules)

