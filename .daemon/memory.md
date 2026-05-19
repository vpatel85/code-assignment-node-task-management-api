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
- Swagger setup requires only 3 files touched (main.ts + 2 DTOs minimum) — controller annotations can be added incrementally; prioritize DTO decorators first since they define the schema contract that Swagger depends on
- Build cycles without CI checks will auto-approve even when test files are missing — add a pre-flight validation step that flags repos lacking test infrastructure before proceeding to review stage
**2026-05-19 — Goal Suggestions (Cycle #4395):**
- Consider adding a pre-commit hook that runs `npm run typecheck` and lint before allowing commits—catch TypeScript errors early
- Add a CI step that generates the OpenAPI spec and diffs it against a committed version to catch unintended API contract changes
- Create a simple script to auto-merge Dependabot PRs for patch updates only (^0.0.x) after npm audit passes, reserve minor/major for manual review
- TasksService tests are now the single biggest blocker—prioritize completing all CRUD + filter test cases before moving to integration tests
- Consider adding response interceptor tests to ensure all API responses conform to the OpenAPI schema
- When adding validation decorators (e.g., `@IsNotEmpty`), verify that `forbidNonWhitelisted: true` won't break existing API consumers by checking integration points; consider making it opt-in per endpoint or documenting as a breaking change clearly before deployment.
- E2E tests weren't added despite the build system flagging "No test files found for changed files" — establish a rule that validation-affecting changes (especially DTO modifications) must include corresponding e2e test cases to prevent silent regressions in request handling.
**2026-05-19 — Goal Suggestions (Cycle #4396):**
- Audit all existing DTOs to ensure they have complete @IsNotEmpty, @IsString, @IsNumber, etc. decorators—PR #7 added the infrastructure but coverage may be incomplete
- Create a test pattern/helper for 'invalid DTO rejection tests' to ensure every endpoint properly rejects bad input—this could catch validation gaps early
- Consider adding a 'schema validation' step to integration tests that compares actual response structure against the OpenAPI spec (use a tool like json-schema-validator)
- Prioritize the TasksService unit tests immediately—it's the last service blocking integration tests, which in turn block API contract validation
- Set a 48-hour SLA for Dependabot PRs with auto-merge for patch versions only; minor versions require review (reduce toil of manual merges)
- GitHub Actions workflow creation succeeded, but the build log explicitly noted "No test files found for changed files — tests should be added" and CI checks still showed as absent post-merge; future cycles should verify that workflows are actually *triggered* by repo events and that test suites exist before marking CI automation as complete.
- File selection returned 0 matches when searching `.github` before the create operation; future cycles should use broader search patterns (e.g., `github` or `workflows`) or skip the selection step entirely for new directory structures to avoid wasted polling rounds.
**2026-05-19 — Goal Suggestions (Cycle #4397):**
- 🚨 URGENT: The test.yml workflow is likely failing (given the recent failed/skipped task history). Inspect CI logs immediately and fix before merging any feature branches—you need a green CI gate before adding coverage thresholds.
- Consider adding a 'Troubleshooting CI' section to your runbook documenting common test.yml failures (e.g., missing test setup, database connection issues, missing env vars).
- Once TasksService unit tests pass locally, run them against the CI workflow to validate the test.yml configuration works end-to-end before enabling coverage enforcement.
- Suggest splitting the 'Dependabot review' blocker into two items: (1) manual review of existing PRs + (2) enable auto-merge rules for patch/minor updates with 48h review SLA.
- TasksService test suite creation requires mocking PrismaService and EmailService dependencies; ensure mock implementations cover all service methods called (e.g., sendTaskAssignmentNotification) to avoid runtime failures during test execution
- Build log showed "No test files found for changed files" warning but PR was still approved — future cycles should enforce that unit test files must exist and pass locally before opening PRs, not rely on missing CI to catch gaps
**2026-05-19 — Goal Suggestions (Cycle #4398):**
- After PR #9 merges, immediately run the full test.yml to identify any flaky tests or environment issues before moving to integration tests
- Consider adding a 'test-only' CircleCI/GitHub Actions job that runs just the TasksService tests on every commit to catch regressions early
- For DTO validation, create a shared validation pipe (e.g., ValidateDtoPipe) and apply it globally to all controllers to enforce contracts consistently
- Add a 'Contract Tests' section to CI that validates OpenAPI spec against actual HTTP responses — this will catch drift early
- Consider establishing a dependency update policy: auto-merge Dependabot PRs for patch versions with passing tests, require manual review for minor/major versions
- When TaskStatus enum values are referenced in tests, verify they exist in the Prisma schema first—use `prisma generate` before running `tsc --noEmit` to ensure @prisma/client exports match the schema definition, avoiding TS2339 errors on missing enum properties.
- Test files created by build loops should be validated against the actual enum definitions in the codebase before commit; add a pre-commit check that scans spec files for enum references and cross-validates them against schema.prisma to catch mismatches early.
**2026-05-19 — Goal Suggestions (Cycle #4399):**
- Before scaling test coverage further, invest in a test utilities package with mock factories and enum helpers — this prevents the enum reference bug from recurring
- Add a lint rule (eslint-plugin-no-hardcoded-strings or custom) to catch magic strings in tests that should reference enums/constants
- Document where TaskStatus enum should be sourced from — likely needs to be a shared constant exported from a domain module, not duplicated in tests
- Consider adding a pre-test validation step that verifies all enums referenced in test files actually exist in the source code (could catch this in CI)
- Prioritize test reliability audit (PR #9 + #10) before enforcing coverage thresholds — flaky tests will undermine CI/CD confidence
- When `npm audit` fails due to transitive dev dependencies, use `npm audit --audit-level=moderate` or add exceptions via `.npmrc` / `npm audit --json` filtering rather than `--omit=dev`, which removes security coverage for production code and creates false negatives in CI.
- Before opening a PR, verify the repo has CI checks enabled and test files in place—this cycle's lack of CI infrastructure allowed a broken audit fix to be "approved," masking that the solution removed dev dependency scanning entirely instead of resolving the actual vulnerability.
**2026-05-19 — Goal Suggestions (Cycle #4400):**
- Consider implementing the shared constants/enums file BEFORE fixing the TaskStatus enum bug in PR #10 — this way the fix becomes a model for how all domain enums should be referenced across the codebase
- Add a pre-commit hook that validates enum imports in test files during the constants work — catch the pattern early before it lands in CI
- Create a test fixture/factory for TaskStatus and other key enums (TaskPriority, UserRole if exists) as part of the test utilities library — makes it harder to accidentally hardcode values
- Consider documenting a 'Contract-First Testing' approach: tests reference domain enums from shared constants, OpenAPI spec is generated from DTOs, and actual handler responses are validated against the spec — this creates a feedback loop that prevents drift
- When spec files don't exist in repo, search patterns return 0 matches silently — validate file existence before attempting reads, or use broader glob patterns (e.g., `**/*.service.spec.ts`) to catch missing test infrastructure earlier in the build loop
- Spec file creation without corresponding test execution (log: "No test files found for changed files — tests should be added") indicates missing Jest configuration or test runner setup — flag repos missing active test infrastructure before approving changes to service layer code