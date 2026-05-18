'use strict';

/**
 * scripts/audit-dependencies.js
 *
 * Runs `npm outdated` and `npm audit` against the project, parses their JSON
 * output, writes a structured Markdown report to DEPENDENCY_AUDIT.md, and
 * prints a summary to stdout.
 *
 * Usage:
 *   node scripts/audit-dependencies.js
 *   npm run audit:deps
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REPORT_PATH = path.join(process.cwd(), 'DEPENDENCY_AUDIT.md');
const SEVERITY_ORDER = ['critical', 'high', 'moderate', 'low', 'info'];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Run a shell command and return its stdout as a string.
 * npm outdated/audit intentionally exit with a non-zero code when they find
 * something, so we always read from error.stdout on failure too.
 *
 * @param {string} cmd
 * @returns {string}
 */
function runCommand(cmd) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (err) {
    // npm outdated exits 1 when packages are outdated.
    // npm audit exits 1 when vulnerabilities are found.
    if (err.stdout) return err.stdout;
    return '';
  }
}

/**
 * Safely parse JSON; returns null on failure.
 *
 * @param {string} text
 * @returns {object|null}
 */
function tryParseJson(text) {
  if (!text || !text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch (_) {
    return null;
  }
}

/**
 * Repeat a character n times.
 *
 * @param {string} char
 * @param {number} n
 * @returns {string}
 */
function repeat(char, n) {
  return char.repeat(Math.max(0, n));
}

// ---------------------------------------------------------------------------
// Data collection
// ---------------------------------------------------------------------------

/**
 * @typedef {{
 *   name: string,
 *   current: string,
 *   wanted: string,
 *   latest: string,
 *   location: string,
 *   isMajorUpdate: boolean
 * }} OutdatedPackage
 */

/**
 * @typedef {{
 *   name: string,
 *   severity: string,
 *   via: string[],
 *   effects: string[],
 *   range: string,
 *   fixAvailable: boolean|{name:string,version:string}
 * }} Vulnerability
 */

/**
 * @typedef {{
 *   outdated: OutdatedPackage[],
 *   vulnerabilities: Vulnerability[],
 *   summary: {
 *     totalOutdated: number,
 *     critical: number,
 *     high: number,
 *     moderate: number,
 *     low: number,
 *     info: number
 *   }
 * }} AuditResults
 */

/**
 * Run `npm outdated --json` and return a list of outdated package descriptors.
 *
 * @returns {OutdatedPackage[]}
 */
function collectOutdated() {
  console.log('📦  Checking for outdated packages…');

  const raw = runCommand('npm outdated --json');
  const data = tryParseJson(raw);

  if (!data || typeof data !== 'object') {
    console.log('    No outdated package data returned.');
    return [];
  }

  return Object.entries(data).map(([name, info]) => {
    const currentMajor = parseInt((info.current || '0').split('.')[0], 10);
    const latestMajor = parseInt((info.latest || '0').split('.')[0], 10);
    return {
      name,
      current: info.current || 'unknown',
      wanted: info.wanted || 'unknown',
      latest: info.latest || 'unknown',
      location: info.location || '.',
      isMajorUpdate: latestMajor > currentMajor,
    };
  });
}

/**
 * Run `npm audit --json` and return vulnerability descriptors plus per-severity
 * counts.
 *
 * @returns {{ vulnerabilities: Vulnerability[], counts: Record<string,number> }}
 */
function collectVulnerabilities() {
  console.log('🛡️   Checking for security vulnerabilities…');

  const raw = runCommand('npm audit --json');
  const data = tryParseJson(raw);

  const counts = { critical: 0, high: 0, moderate: 0, low: 0, info: 0 };

  if (!data || typeof data !== 'object') {
    console.log('    No audit data returned.');
    return { vulnerabilities: [], counts };
  }

  // npm v7+ audit format uses `vulnerabilities`; v6 uses `advisories`
  const vulnMap = data.vulnerabilities || data.advisories || {};

  const vulnerabilities = Object.entries(vulnMap).map(([name, vuln]) => {
    const severity = (vuln.severity || 'info').toLowerCase();
    if (severity in counts) counts[severity]++;

    // Normalise the `via` field: it can be an array of strings or objects
    const via = (vuln.via || []).map((v) =>
      typeof v === 'string' ? v : v.title || v.name || JSON.stringify(v),
    );

    // Normalise effects (downstream dependents)
    const effects = Array.isArray(vuln.effects) ? vuln.effects : [];

    return {
      name,
      severity,
      via,
      effects,
      range: vuln.range || 'N/A',
      fixAvailable: vuln.fixAvailable !== undefined ? vuln.fixAvailable : false,
    };
  });

  // Sort by severity (most severe first)
  vulnerabilities.sort(
    (a, b) =>
      SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
  );

  return { vulnerabilities, counts };
}

// ---------------------------------------------------------------------------
// Report builder
// ---------------------------------------------------------------------------

/**
 * Format a `fixAvailable` value as human-readable text.
 *
 * @param {boolean|{name:string,version:string}} fix
 * @returns {string}
 */
function formatFix(fix) {
  if (fix === true) return 'Yes';
  if (!fix) return 'No';
  if (typeof fix === 'object' && fix.name) {
    return `${fix.name}@${fix.version || '?'}`;
  }
  return String(fix);
}

/**
 * Escape pipe characters inside Markdown table cells.
 *
 * @param {string} text
 * @returns {string}
 */
function mdCell(text) {
  return String(text).replace(/\|/g, '\\|');
}

/**
 * Build the full Markdown audit report.
 *
 * @param {AuditResults} results
 * @returns {string}
 */
function buildMarkdownReport(results) {
  const { outdated, vulnerabilities, summary } = results;
  const totalVulns =
    summary.critical + summary.high + summary.moderate + summary.low + summary.info;
  const generatedAt = new Date().toISOString();

  const lines = [];

  // ── Header ──────────────────────────────────────────────────────────────
  lines.push('# Dependency Security Audit Report', '');
  lines.push(`**Generated:** ${generatedAt}  `);
  lines.push(`**Project:** task-management-api`, '');

  // ── Executive Summary ────────────────────────────────────────────────────
  lines.push('## Executive Summary', '');
  lines.push('| Metric | Count |');
  lines.push('|--------|-------|');
  lines.push(`| Outdated packages | ${summary.totalOutdated} |`);
  lines.push(`| Total vulnerabilities | ${totalVulns} |`);
  lines.push(`| — Critical | ${summary.critical} |`);
  lines.push(`| — High | ${summary.high} |`);
  lines.push(`| — Moderate | ${summary.moderate} |`);
  lines.push(`| — Low | ${summary.low} |`);
  lines.push(`| — Info | ${summary.info} |`);
  lines.push('');

  // Status badge line
  const hasCriticalOrHigh = summary.critical > 0 || summary.high > 0;
  if (hasCriticalOrHigh) {
    lines.push(
      '> ⚠️  **Action required:** critical or high severity vulnerabilities detected.',
      '',
    );
  } else if (totalVulns === 0 && summary.totalOutdated === 0) {
    lines.push('> ✅ All packages are up-to-date with no known vulnerabilities.', '');
  } else {
    lines.push('> ℹ️  No critical/high vulnerabilities. Review outdated packages when convenient.', '');
  }

  // ── Outdated Packages ────────────────────────────────────────────────────
  lines.push('## Outdated Packages', '');

  if (outdated.length === 0) {
    lines.push('✅ All packages are at their latest versions.', '');
  } else {
    lines.push(
      '| Package | Current | Wanted | Latest | Major Bump? | Location |',
    );
    lines.push(
      '|---------|---------|--------|--------|:-----------:|----------|',
    );
    for (const pkg of outdated) {
      lines.push(
        `| ${mdCell(pkg.name)} | ${mdCell(pkg.current)} | ${mdCell(pkg.wanted)} | ${mdCell(pkg.latest)} | ${pkg.isMajorUpdate ? '⚠️ Yes' : 'No'} | ${mdCell(pkg.location)} |`,
      );
    }
    lines.push('');
  }

  // ── Security Vulnerabilities ─────────────────────────────────────────────
  lines.push('## Security Vulnerabilities', '');

  if (vulnerabilities.length === 0) {
    lines.push('✅ No known vulnerabilities found.', '');
  } else {
    lines.push(
      '| Package | Severity | Fix Available | Affected Range | Via |',
    );
    lines.push(
      '|---------|:--------:|:-------------:|----------------|-----|',
    );
    for (const vuln of vulnerabilities) {
      const severityEmoji =
        vuln.severity === 'critical'
          ? '🔴 CRITICAL'
          : vuln.severity === 'high'
            ? '🟠 HIGH'
            : vuln.severity === 'moderate'
              ? '🟡 MODERATE'
              : vuln.severity === 'low'
                ? '🟢 LOW'
                : 'ℹ️ INFO';

      lines.push(
        `| ${mdCell(vuln.name)} | ${severityEmoji} | ${mdCell(formatFix(vuln.fixAvailable))} | ${mdCell(vuln.range)} | ${mdCell(vuln.via.join(', '))} |`,
      );
    }
    lines.push('');

    // Detail blocks for critical / high
    const urgentVulns = vulnerabilities.filter(
      (v) => v.severity === 'critical' || v.severity === 'high',
    );
    if (urgentVulns.length > 0) {
      lines.push('### Urgent Vulnerability Details', '');
      for (const vuln of urgentVulns) {
        lines.push(`#### \`${vuln.name}\``);
        lines.push(`- **Severity:** ${vuln.severity.toUpperCase()}`);
        lines.push(`- **Affected range:** \`${vuln.range}\``);
        lines.push(`- **Via:** ${vuln.via.join(', ')}`);
        if (vuln.effects.length > 0) {
          lines.push(`- **Affects downstream:** ${vuln.effects.join(', ')}`);
        }
        lines.push(`- **Fix available:** ${formatFix(vuln.fixAvailable)}`);
        lines.push('');
      }
    }
  }

  // ── Recommendations ──────────────────────────────────────────────────────
  lines.push('## Recommendations', '');

  if (hasCriticalOrHigh) {
    lines.push('### 🚨 Immediate Action Required', '');
    lines.push(
      'Critical and/or high severity vulnerabilities were detected.',
      'Run the following command to apply automatic fixes:',
      '',
    );
    lines.push('```bash');
    lines.push('npm audit fix');
    lines.push('```', '');
    lines.push(
      'If breaking changes are acceptable (or after reviewing them), you may also try:',
      '',
    );
    lines.push('```bash');
    lines.push('npm audit fix --force');
    lines.push('```', '');
    lines.push(
      '> ⚠️  `--force` may install semver-major updates. Test thoroughly after running.',
      '',
    );
  }

  if (outdated.length > 0) {
    lines.push('### 📦 Package Update Strategy', '');

    const majorUpdates = outdated.filter((p) => p.isMajorUpdate);
    const minorUpdates = outdated.filter((p) => !p.isMajorUpdate);

    if (minorUpdates.length > 0) {
      lines.push('**Non-breaking updates** (patch / minor — safe to apply):');
      lines.push('');
      lines.push('```bash');
      lines.push('npm update');
      lines.push('```', '');
    }

    if (majorUpdates.length > 0) {
      lines.push(
        '**Major version updates** — review changelogs before upgrading:',
        '',
      );
      lines.push(
        '| Package | Current | Latest | Changelog |',
      );
      lines.push('|---------|---------|--------|-----------|');
      for (const pkg of majorUpdates) {
        const changelogUrl = `https://www.npmjs.com/package/${pkg.name}?activeTab=versions`;
        lines.push(
          `| ${mdCell(pkg.name)} | ${mdCell(pkg.current)} | ${mdCell(pkg.latest)} | [npm](${changelogUrl}) |`,
        );
      }
      lines.push('');
      lines.push('To upgrade a specific package:');
      lines.push('');
      lines.push('```bash');
      lines.push('npm install <package>@latest');
      lines.push('```', '');
    }
  }

  lines.push('### 🔄 Ongoing Maintenance', '');
  lines.push(
    '- Re-run `npm run audit:deps` regularly (recommended: before each release).',
    '- Consider integrating this script into your CI pipeline to block builds on',
    '  critical/high vulnerabilities.',
    '- Subscribe to security advisories for packages you depend on.',
    '',
  );

  // ── Footer ───────────────────────────────────────────────────────────────
  lines.push('---');
  lines.push(
    `*Report generated by \`scripts/audit-dependencies.js\` at ${generatedAt}*`,
  );

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Console summary
// ---------------------------------------------------------------------------

/**
 * Print a formatted summary table to stdout.
 *
 * @param {AuditResults} results
 */
function printSummary(results) {
  const { summary } = results;
  const totalVulns =
    summary.critical + summary.high + summary.moderate + summary.low + summary.info;
  const divider = repeat('─', 56);

  console.log('');
  console.log(repeat('═', 56));
  console.log('  DEPENDENCY AUDIT SUMMARY');
  console.log(repeat('═', 56));
  console.log(`  Outdated packages  : ${summary.totalOutdated}`);
  console.log(`  Vulnerabilities    : ${totalVulns}`);
  console.log(divider);
  console.log(`    Critical         : ${summary.critical}`);
  console.log(`    High             : ${summary.high}`);
  console.log(`    Moderate         : ${summary.moderate}`);
  console.log(`    Low              : ${summary.low}`);
  console.log(`    Info             : ${summary.info}`);
  console.log(repeat('═', 56));
  console.log(`  Report saved to    : DEPENDENCY_AUDIT.md`);
  console.log(repeat('═', 56));
  console.log('');
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Orchestrate the full audit: collect data, build report, write file.
 */
function runAudit() {
  console.log('🔍  Starting dependency audit…');
  console.log('');

  // Collect data
  const outdated = collectOutdated();
  const { vulnerabilities, counts } = collectVulnerabilities();

  /** @type {AuditResults} */
  const results = {
    outdated,
    vulnerabilities,
    summary: {
      totalOutdated: outdated.length,
      critical: counts.critical,
      high: counts.high,
      moderate: counts.moderate,
      low: counts.low,
      info: counts.info,
    },
  };

  // Generate report
  console.log('📄  Generating audit report…');
  const markdown = buildMarkdownReport(results);

  try {
    fs.writeFileSync(REPORT_PATH, markdown, 'utf8');
  } catch (err) {
    console.error(`❌  Failed to write report: ${err.message}`);
    process.exit(1);
  }

  // Print summary
  printSummary(results);
  console.log('✅  Audit completed successfully.');

  // Exit with a non-zero code if critical or high vulnerabilities were found
  // so CI pipelines can fail the build.
  if (results.summary.critical > 0 || results.summary.high > 0) {
    process.exit(1);
  }
}

runAudit();
