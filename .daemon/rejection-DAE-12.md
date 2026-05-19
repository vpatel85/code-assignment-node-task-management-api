# Rejection Notice: DAE-12 — Task Activity Logging Feature

**Status:** REJECTED — Out-of-scope for autonomous agent  
**Issue:** DAE-12  
**Feature Request:** Task activity/audit log (record who changed what on a task, and when)  
**Date:** 2026-05-19  
**Reviewed by:** Autonomous Agent (Daemon)

---

## 1. Current Goal Constraints

The active operating goal for this agent cycle (as defined in `.daemon/goal.md`) is:

> *Hardening the API with comprehensive input validation, error handling, and test coverage across all endpoints (tasks, projects, users). Focus on improving service-layer unit tests, ensuring all DTOs have proper class-validator decorators, and verifying that the email notification service is correctly triggered on task creation and status changes.*

This goal explicitly scopes work to:
- Input **validation** hardening (DTOs, class-validator decorators)
- **Error handling** improvements
- **Test coverage** for existing service methods and endpoints
- Email notification verification

**Net-new features** — functionality that does not currently exist in the codebase — are outside the operating contract for this agent cycle. The task activity logging feature is a net-new feature and is therefore rejected.

---

## 2. Technical Scope Analysis

Implementing a task activity log would require changes across **8–12 files** and an estimated **500–1,000+ lines** of new or modified code. The breakdown is:

### 2.1 Database Schema Changes (Prisma)
- **`prisma/schema.prisma`** — Add a new `TaskActivityLog` model (or equivalent) with fields such as `id`, `taskId`, `actorId`, `action` (enum), `fieldChanged`, `oldValue`, `newValue`, `createdAt`.
- New enum `TaskActivityAction` (e.g., `CREATED`, `STATUS_CHANGED`, `ASSIGNEE_CHANGED`, `PRIORITY_CHANGED`, `DELETED`, etc.).
- Add relation back-reference on the existing `Task` model (`activityLogs TaskActivityLog[]`).
- Requires `npm run prisma:migrate` to generate and apply a new migration, followed by `npm run prisma:generate` to regenerate the Prisma client — both of which carry schema-migration risk on the tasks write path.

### 2.2 New Feature Module (NestJS)
- **`src/activity/activity.module.ts`** — New NestJS module declaration; must be registered in `src/app.module.ts`.
- **`src/activity/activity.service.ts`** — Service with methods to write log entries (e.g., `logCreate`, `logUpdate`, `logDelete`) and read them back (e.g., `findByTaskId`).
- **`src/activity/activity.controller.ts`** — REST endpoint(s) such as `GET /tasks/:id/activity`.
- **`src/activity/dto/activity-log.dto.ts`** — Response DTO for log entries.
- **`src/activity/activity.service.spec.ts`** — Unit tests for the new service.

### 2.3 Changes to Existing Service (Tasks Write Path)
- **`src/tasks/tasks.service.ts`** — All four write methods (`create`, `update`, `remove`, plus any future bulk operations) must be augmented to capture before/after state and call into the activity service.  
  - `create`: capture full initial state for `CREATED` log.  
  - `update`: diff `existingTask` fields vs `updateTaskDto` for fine-grained field-level logging.  
  - `remove`: capture final state for `DELETED` log.
- This change touches the hottest code path in the service; any regression here affects all task mutations.

### 2.4 Actor Identity / Request Context
- Activity logs are only meaningful if they record *who* made the change. The current codebase has no authenticated user context (no auth guards, no `request.user`).  
- Capturing actor identity would require either passing `actorId` as a parameter through the service layer or implementing a NestJS `REQUEST`-scoped service / `AsyncLocalStorage` context — both are non-trivial design decisions.

### 2.5 Aggregate Estimate

| Area | Files Affected | Estimated LoC |
|---|---|---|
| Prisma schema + migration | 1 schema + 1 migration SQL | ~30–60 |
| New activity module | 4–5 new files | ~200–350 |
| `tasks.service.ts` changes | 1 existing file | ~80–150 |
| `app.module.ts` registration | 1 existing file | ~3–5 |
| Unit + integration tests | 2–3 new/modified spec files | ~200–400 |
| **Total** | **~10–12 files** | **~513–965 LoC** |

---

## 3. Design Decisions Requiring Human Architect Input

The following architectural questions cannot be resolved autonomously under the current operating contract and must be decided by a human engineer or architect before implementation begins:

### 3.1 Log Capture Strategy
Three main approaches exist; each has significant trade-offs:

| Strategy | Pros | Cons |
|---|---|---|
| **Service hooks** (call `ActivityService` from `TasksService`) | Simple, explicit, testable | Tight coupling; callers must remember to log; risk of missing a write path |
| **Prisma middleware** (`this.$use(...)` in `PrismaService`) | Centralized, cannot be forgotten | Intercepts all models unless filtered; harder to inject request context; Prisma middleware is being deprecated in favour of Prisma extensions in newer versions |
| **Database triggers** (PostgreSQL `AFTER INSERT/UPDATE/DELETE`) | Guaranteed, zero application-level overhead | Cannot capture application-level context (actor ID, source); harder to maintain alongside Prisma migrations; out-of-band from the ORM |

The choice between these approaches materially affects `prisma/prisma.service.ts`, the migration strategy, and the test architecture — all of which require deliberate human sign-off.

### 3.2 Granularity of Field-Level Diffing
- Should every changed field be a separate log row (fine-grained, queryable) or should a full JSON diff blob be stored per update (simpler, but less queryable)?
- Fine-grained logging requires a structured diff of `UpdateTaskDto` vs the fetched `existingTask` before each update — this is domain logic that warrants human review for correctness and completeness.

### 3.3 Actor Identity & Auth Context
- The current `TasksService` has no concept of the requesting user's identity. Introducing `actorId` either requires threading a user ID through every service call (breaking all existing call signatures) or implementing a request-scoped context strategy.
- This is an API contract change and a cross-cutting architectural concern that must be designed at the system level.

### 3.4 Retention & Pagination
- Unbounded activity log growth is a production concern. Retention policy (TTL, archival, max-rows-per-task) must be defined before schema design is finalised.
- Pagination of the `GET /tasks/:id/activity` endpoint requires a decision on offset vs cursor-based pagination — consistent with any pagination strategy being applied elsewhere in the API.

---

## 4. Risk Assessment

### 4.1 Regression Risk on Tasks Write Path: **HIGH**
- Every task mutation (`create`, `update`, `remove`) must be modified.
- Any bug introduced into these methods (e.g., an unhandled exception in the activity write logic that is not properly isolated) could cause task operations to fail silently or throw 500 errors.
- The current write path already carries email notification side-effects (`EmailService.sendTaskAssignmentNotification`); adding a second side-effect increases the surface area for failures.

### 4.2 Schema Migration Risk: **MEDIUM–HIGH**
- Adding a new model and a foreign key constraint on the `Task` table requires a migration.
- If the migration is applied against a database with existing rows, the new `taskId` FK constraint must be nullable or default-safe, otherwise the migration will fail on non-empty databases.

### 4.3 Test Maintenance Burden: **MEDIUM**
- All existing `tasks.service.spec.ts` mocks would need to be updated to account for the new `ActivityService` dependency injection.
- The current test suite (`src/tasks/tasks.service.spec.ts`) is already a work-in-progress target under the current goal; introducing a new dependency before tests are stable adds noise and could mask pre-existing test failures.

### 4.4 Scope Creep Risk: **HIGH**
- Once activity logging exists, product pressure to surface it in the UI, add filtering/search on log entries, add actor details, and add export functionality is predictable. Without a clear scope boundary in the initial design doc, this feature has a high likelihood of expanding beyond its initial estimate.

---

## 5. Recommendation

**Route DAE-12 to the product backlog.** Do not implement this feature under the current autonomous agent operating contract.

### Required Prerequisites Before Implementation

1. **Technical Design Document** authored by a human engineer covering:
   - Log capture strategy (service hooks vs Prisma middleware vs DB triggers) with rationale
   - Actor identity/auth context strategy
   - Field-level diff granularity and storage format
   - Retention and pagination policy
   - API contract for `GET /tasks/:id/activity`

2. **Auth Foundation** — If actor identity is a requirement (and it should be for a meaningful audit log), a basic authentication mechanism (JWT guard, session, or at minimum a trusted `X-Actor-Id` header for internal use) must be in place first.

3. **Stable Test Baseline** — The current unit test suite for `TasksService` should be completed and passing before the tasks write path is modified. This ensures a regression baseline exists.

4. **Dedicated Sprint / Story Points** — Given the 8–12 file scope and 500–1,000+ LoC estimate, this should be sized as a medium-to-large story and scheduled in a dedicated sprint, not folded into a hardening cycle.

### Suggested Backlog Entry

```
Title: [Feature] Task Activity / Audit Log (DAE-12)
Priority: Medium
Labels: feature, database-schema-change, breaking-change-risk, needs-design-doc
Blocked by:
  - Auth/actor identity foundation
  - Technical design document (architecture decision on capture strategy)
  - TasksService unit test suite stabilisation
Estimate: L (5–8 story points)
```

---

## 6. Current Goal Reference

The current goal is scoped exclusively to **validation, error handling, and test coverage** for existing endpoints. The relevant constraint text from `.daemon/goal.md`:

> *The next milestone is hardening the API with comprehensive input validation, error handling, and test coverage across all endpoints (tasks, projects, users). The agent should focus on improving service-layer unit tests, ensuring all DTOs have proper class-validator decorators, and verifying that the email notification service is correctly triggered on task creation and status changes.*

Net-new features such as DAE-12 fall outside this milestone. Implementing them autonomously without human design review would:
- Violate the "no business logic in controllers" and "no net-new features in hardening cycles" constraints
- Introduce migration risk on a production schema
- Require architectural decisions (auth context, capture strategy) that must be made by a human engineer
- Potentially destabilise the tasks write path that is actively being hardened and tested under the current goal

---

*This rejection was generated autonomously by the Daemon agent. For questions or to schedule this feature, contact the engineering team and reference DAE-12.*
