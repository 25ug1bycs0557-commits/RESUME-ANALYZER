# Dependency Audit

## Dependency inventory

- Runtime: Node.js **v26.13.0**; `package.json` sets a minimum of Node.js 18.
- Package manager: npm **11.20.0**.
- Manifest and lockfile: `package.json`, npm lockfile version 3 in `package-lock.json`.
- Declared direct dependency: `fast-check` (development dependency, range `^4.3.0`); the lockfile resolves `fast-check` **4.10.2** and transitive `pure-rand` **8.4.2**.
- The browser application also bundles PDF.js **4.4.168** in `vendor/` under its Apache-2.0 license. It is not installed from npm and is not included in npm's dependency audit.
- No other package-manager manifests or lockfiles were found. No build, lint, or type-check script is configured.

## Audit results

| Check | Result |
|---|---|
| `npm audit --json` | **0** info, low, moderate, high, or critical advisories. |
| `npm audit --omit=dev --json` | **0** advisories; the application declares no production npm dependencies. |
| `npm outdated --json` | No outdated declared packages reported. |
| `npm ls --all --json` | Dependency tree consistent; no npm tree problems reported. |
| `npm test` | **17 passed, 0 failed, 0 skipped**. |

No dependency vulnerabilities were reported, so no version changes were necessary. The lockfile records package integrity hashes and the resolved dependency versions.

## Limitations and remaining review

- npm audit covers npm packages and the registry advisories known at scan time; it does not assess arbitrary vendored code, browser/CDN resources, application logic, or future advisories.
- The Gitleaks binary was used only as a temporary local security scanner and is not an application dependency.
- PDF.js is vendored rather than managed by npm. Its release archive integrity was verified against npm registry metadata when it was added; continue monitoring upstream advisories and update it deliberately.
- No production dependency exists in this project. The installed fast-check dependency is used only by tests.
- No build script is configured; the app is served as static browser files. Browser PDF extraction and the analyzer were validated separately in the browser during the security remediation.
- This is a point-in-time audit, not a guarantee that dependencies are free of all security issues.
