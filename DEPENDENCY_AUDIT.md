# Dependency Security Audit Report

**Generated:** 2025-01-01T00:00:00.000Z  
**Project:** task-management-api

> This file is the **baseline audit report** committed alongside the audit
> script.  Run `npm run audit:deps` at any time to regenerate it with live data.

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Outdated packages | — |
| Total vulnerabilities | — |
| — Critical | — |
| — High | — |
| — Moderate | — |
| — Low | — |
| — Info | — |

> ℹ️  The table above shows placeholders. Run `npm run audit:deps` to populate
> this report with current findings.

---

## Audited Dependency Inventory

The table below lists every declared dependency and devDependency with the
version range recorded in `package.json` at the time this baseline was
committed.

### Production Dependencies

| Package | Declared Range | Notes |
|---------|---------------|-------|
| `@nestjs/cache-manager` | `^2.1.0` | NestJS cache integration |
| `@nestjs/common` | `^10.0.0` | Core NestJS decorators & utilities |
| `@nestjs/config` | `^3.0.0` | Environment configuration module |
| `@nestjs/core` | `^10.0.0` | NestJS runtime core |
| `@nestjs/platform-express` | `^10.0.0` | Express HTTP adapter |
| `@prisma/client` | `^5.7.0` | Prisma ORM runtime client |
| `cache-manager` | `^5.2.3` | Generic cache abstraction layer |
| `cache-manager-redis-yet` | `^5.1.5` | Redis store for cache-manager v5 |
| `class-transformer` | `^0.5.1` | Serialisation / deserialisation helpers |
| `class-validator` | `^0.14.0` | Decorator-based input validation |
| `reflect-metadata` | `^0.1.13` | Metadata reflection (required by NestJS) |
| `rxjs` | `^7.8.1` | Reactive Extensions for JavaScript |

### Development Dependencies

| Package | Declared Range | Notes |
|---------|---------------|-------|
| `@nestjs/cli` | `^10.0.0` | NestJS project scaffolding CLI |
| `@nestjs/schematics` | `^10.0.0` | NestJS code-generation schematics |
| `@nestjs/testing` | `^10.0.0` | Unit / integration test utilities |
| `@types/express` | `^4.17.17` | TypeScript typings for Express |
| `@types/jest` | `^29.5.2` | TypeScript typings for Jest |
| `@types/node` | `^20.3.1` | TypeScript typings for Node.js |
| `@types/supertest` | `^2.0.12` | TypeScript typings for Supertest |
| `@typescript-eslint/eslint-plugin` | `^6.0.0` | TypeScript ESLint rules |
| `@typescript-eslint/parser` | `^6.0.0` | TypeScript ESLint parser |
| `eslint` | `^8.42.0` | JavaScript/TypeScript linter |
| `eslint-config-prettier` | `^9.0.0` | Disables ESLint rules that conflict with Prettier |
| `eslint-plugin-prettier` | `^5.0.0` | Runs Prettier as an ESLint rule |
| `jest` | `^29.5.0` | Test runner |
| `prettier` | `^3.0.0` | Opinionated code formatter |
| `prisma` | `^5.7.0` | Prisma CLI (migrations, schema generation) |
| `source-map-support` | `^0.5.21` | Source map support for Node.js stack traces |
| `supertest` | `^6.3.3` | HTTP integration testing library |
| `ts-jest` | `^29.1.0` | Jest TypeScript transformer |
| `ts-loader` | `^9.4.3` | TypeScript loader for webpack |
| `ts-node` | `^10.9.1` | TypeScript execution engine for Node.js |
| `tsconfig-paths` | `^4.2.0` | TypeScript path alias resolution at runtime |
| `typescript` | `^5.1.3` | TypeScript compiler |

---

## Outdated Packages

> Run `npm run audit:deps` to populate this section with live data.

---

## Security Vulnerabilities

> Run `npm run audit:deps` to populate this section with live data.

---

## Recommendations

### 🔄 Ongoing Maintenance

- Run `npm run audit:deps` before every release to capture the current state.
- Integrate the script into CI to block merges on critical/high findings:

  ```yaml
  # Example GitHub Actions step
  - name: Dependency audit
    run: npm run audit:deps
  ```

- Keep patch and minor updates applied continuously via `npm update`.
- Review changelogs carefully before applying **major version** updates —
  particularly for `@nestjs/*`, `prisma`, `rxjs`, and `typescript`, which carry
  significant breaking-change risk between majors.
- Subscribe to [GitHub Security Advisories](https://github.com/advisories) and
  the npm security feed for packages this project depends on.

### 📦 Applying Updates

| Scenario | Command |
|----------|---------|
| Apply all non-breaking updates | `npm update` |
| Fix vulnerabilities automatically | `npm audit fix` |
| Fix vulnerabilities (allow breaking) | `npm audit fix --force` |
| Upgrade a single package to latest | `npm install <pkg>@latest` |

> ⚠️  Always run the full test suite (`npm test && npm run test:e2e`) after
> any dependency update.

### 🔐 Security Contacts

If you discover a vulnerability in a dependency, report it via the package's
official channel or via the [npm security contact](https://www.npmjs.com/advisories).

---

*Baseline report committed with `scripts/audit-dependencies.js`. Regenerate at
any time with `npm run audit:deps`.*
