# Dependency review

Reviewed on 2026-10-09. The original local lockfile is now included, and CI uses `npm ci --ignore-scripts`. The complete dependency graph is checked with npm's advisory service; package counts include transitive dependents and are not counts of independent vulnerabilities.

## Targeted changes

- `source-map-js` is overridden to 1.2.2, the patched version for [indexed source-map denial of service](https://github.com/advisories/GHSA-68fv-2mgg-jv7q).
- Expo Router 57 consumes CommonJS `query-string@7`, whose decoder was vulnerable to [malformed-input decoding denial of service](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr). The official patched decoder 0.5.0 is adapted only at the module export boundary and scoped to query-string. The vendored directory retains its MIT license, upstream reference, source checksum, and exact adaptation. Regression checks cover route queries, Unicode, and malformed input through the consuming package.

## Remaining limits

The advisory service still identifies Expo/React Native build-tool chains depending on `braces`, `node-forge`, and an older `uuid`. The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) and [node-forge advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) list no patched release at the review date. The [uuid advisory](https://github.com/advisories/GHSA-w5hq-g745-h8pq) affects v3/v5/v6 API buffer handling; the older package is pulled in by xcode tooling. A native SDK/toolchain upgrade needs its own compatibility validation. No forced downgrade or untested major SDK upgrade was applied.

The hosted portfolio artifact is static files served from `dist-demo`; it does not run Metro, the Expo development server, native build tooling, or a backend. This limits exposure to build-tool findings, but is not a general dependency-security clearance. Use trusted source and inputs when building; do not expose development tooling as the public demo.

The standalone preview binds to loopback only. The demo export blocks connection APIs with a content policy and disables the backend client independently. The policy permits inline script/styles needed by Expo's generated output; it is an isolation control, not a claim of full XSS protection.

The final npm audit reports 26 affected packages (19 high and 7 moderate), propagated from the three remaining advisory families above. npm also warns about an optional native worklets peer mismatch and deprecated uuid/eslint versions. Passing browser checks do not establish native SDK compatibility.
