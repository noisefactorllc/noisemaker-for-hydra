# noisemaker-for-hydra: compatibility report

## 1. Source and authority revisions

Observation date: 2026-09-24. Current and tested source: [`d75412d12e27d8a338f635ed6a05e0e5c5b2d57e`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e).
Published engine: `1.0.176`, authority `c9ee8a049b2b63cd300da67c01ee40baf29dc288`.
Current upstream: `823bbff1d17061d231cb0c7f5bf4527b3344abab`. Its changed behavior remains unverified.
The rolling `/1` core matches the immutable published core. The manifest contains 210 effects.
The current upstream tree also contains 210 effect definitions. Counts do not prove behavioral equivalence.
[Authority evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/authority-tag.json). [Inventory](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/coverage-inventory.json).

Freshness: browser evidence covers the reviewed port and published engine. Full qualification against current upstream remains **stale** and **unverified**.
The engine URL remains mutable. The embedded companion extension lacks an immutable revision declaration.
Tracked file hashes identify the exact extension bytes. [Source hashes](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/source-hashes.json).
The source archive declares version `1.5.3`. No GitHub release was returned.
The served demo records source `626f37c21170927e7c24429ca2c8f31cf38905ec`, which differs from this audit.
[Deployment metadata](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/deployment-meta.data). Audit completion and document publication do not establish parity or release readiness.

## 2. Host and distribution matrix

| Dimension | Status | Measured scope or limit |
|---|---|---|
| Unit and compiler checks | verified | 39 unit tests and seven browser DOM checks passed. |
| Isolated installation | verified | npm 11.19.1, Node 26.10.0, macOS 26.5 arm64. Lifecycle scripts and binary links were disabled. |
| Literal README installation | unverified | The audit used safety flags. It did not execute the unmodified `npm install` command. |
| Built distribution | verified | Isolated build matches all 28 tracked distribution files. Only dist was served on loopback. |
| First useful result | verified | README Hydra noise produced non-flat output in Chrome 153.0.8010.53 with WebGL2. |
| Parameters and keyboard evaluation | verified | Control+Shift+Enter evaluated scale 5 and scale 8. Their pixel hashes differ. |
| Errors and recovery | verified | Invalid effect showed a name and source location. Corrected solid produced 768 opaque red pixels. |
| Saved sketch restoration | verified | Reload restored the tested URL program without a shown error. |
| Two rendered comparisons | verified | Core noise and noise-to-blur matched the immutable published reference at 32×24 and time zero. |
| WebGPU Hydra solid | failed | WGSL compile reports `ERR_NO_WGSL_SOURCE` for `node_0_solid`. |
| Ordinary Hydra JavaScript | failed | Official `osc().out()` syntax requires replacement with the fork's documented DSL. |
| Toolbar accessibility | failed | Six controls are hidden from accessibility tools and have no keyboard focus or role. |
| Renderer disposal | verified | The bounded probe stopped rendering and cleared the pipeline. Long-term GPU accounting remains unverified. |
| Served demo output | verified | Two shown o1 samples at 480×320 were non-flat and different. This verifies the older served artifact only. |
| Supported browsers and operating systems | unverified | Other Chrome versions, Firefox, Safari, Windows, and Linux were not tested. |
| External media, audio/MIDI, temporal cases | unverified | No complete host integration or current-authority matrix exists. |
| Upgrade and removal | unverified | Server cleanup and isolated consumer removal do not establish saved-sketch upgrade compatibility. |
| Release readiness | blocked | Missing full parity, failed WebGPU case, notices, dependency review, and absent CI gate remain open. |

[Browser observations](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/browser-probe.json). [Host observations](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/host-probe-wgsl.json).
The official [Hydra guide](https://hydra.ojack.xyz/docs/docs/learning/getting-started/) documents JavaScript and keyboard workflows.
The page is dated 2025-06-10 and was accessed on 2026-09-24. The fork supports its stated DSL demonstration contract.
In-app help still describes ordinary JavaScript Hydra. It does not establish compatibility with those examples.

## 3. Parity coverage

| Gate | Expected | Executed | Strict passes | Failures | Skips | Missing or unverified |
|---|---|---|---|---|---|---|
| Unit tests | 39 | 39 | not a render gate | 0 | 0 | Render coverage does not follow. |
| Existing browser cases | 7 | 7 | not a render gate | 0 | 0 | Pixels were not compared. |
| Independent published-reference probes | 2 | 2 | 2 | 0 | 0 | All broader cases remain unverified. |
| Hydra solid WebGPU probe | 1 | 1 | 0 | 1 | 0 | Other WebGPU cases remain unverified. |
| Complete current-authority effects | 210 effect IDs | not measured | not measured | not measured | not measured | 210 IDs lack qualification. |
| Parameter, define, input, temporal matrix | not measured | not measured | not measured | not measured | not measured | Inventory absent. |

Exact comparisons: `core-noise`, `core-chain`. Each contains 3,072 RGBA8 channels at 32×24 and normalized time zero.
Both have zero unequal channels and maximum absolute error zero. No tolerance was applied.
Failed case: `hydra/solid:webgpu`. The compiler reports missing WGSL source.
[Every missing effect ID](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/coverage-inventory.json) remains in the denominator. There is no complete rendered suite to execute.
Two default probes do not qualify the effect catalog, Hydra mappings, external inputs, or stateful behavior.
The two early measurement attempts remain retained. Their errors do not count as product failures or successful comparisons.
No fixtures, goldens, tolerances, or exclusions changed. No case was skipped to obtain a passing summary.

## 4. Evidence

| Literal command | Exit | Raw evidence |
|---|---|---|
| `npm run build` | 0 | [Build](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/build.json) |
| `node --test test/*.test.mjs` | 0 | [Unit tests](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/unit.json) |
| `PORT=5197 node scripts/test.mjs` | 0 | [Browser checks](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/browser.json) |
| `npm ci --bin-links=false --ignore-scripts` | 0 | [Installation](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/install.json) |
| `node node_modules/vite/bin/vite.js build` | 0 | [Consumer build](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/consumer-build.json) |
| `node browser-probe.cjs` | 0 | [Rendered comparisons and UI](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/browser-probe.json) |
| `node host-probe-wgsl.cjs` | 0 | [Completed probe with failed WGSL case](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/host-probe-wgsl.json) |
| `npm audit --omit=dev --json` | 1 | [16 production dependency advisories](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/production-audit.json) |

Probe commands run from the linked evidence directory. Build and unit commands run from the reviewed checkout or identified consumer.
Chrome version: 153.0.8010.53. WebGL renderer label: `WebKit WebGL`.
Core SHA-256: `2460ed60f8002c893f4f6c99a119be5d4ab1fafa6055cb94d95f887ff12a2952`.
Manifest SHA-256: `05c4d7b7744837ae90a3bb4c89e5403ff09448a74d9d7e824abb3d719ad3314e`.
[Source hashes](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/source-hashes.json). [Artifact reproduction](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/distribution-reproduction.json).
[Exact-source Actions](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/remote-ci.json) returned zero runs. The source tree contains no workflow.
The push activates an existing notification webhook. These documentation edits do not deploy or release the editor.
[Publication result](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/result.json) records the pushed commit and remote verification.

## 5. Open compatibility limits

The stable [gap register](COMPLETION_GAPS.md#4-known-gaps) defines each action, dependency, and acceptance check.

1. Resolve source and authority identities. Inventory every rendered case for GAP-001.
2. Resolve the missing WGSL shader behavior for GAP-004. Preserve the failing case.
3. Establish full exact-source CI enforcement for GAP-006 through the implementation job.
4. Test external inputs and supported platforms. Correct help and accessible controls for GAP-002 and GAP-005.
5. Check notices, dependency decisions, served provenance, upgrades, and removal for GAP-003.

Full parity requires zero skipped or missing cases. Scheduled audits do not enforce pre-push parity.
All eligible ports retain equal rotation priority. C++ remains excluded. No implementation or parity checkpoint changed.

## 6. History

| Date | Source | Result | Change |
|---|---|---|---|
| 2026-09-24, initialization | `2691007f48acc5342c6a10478373094fff6fd697` | Full qualification unverified | 36 unit tests. Browser and rendered coverage unexecuted. |
| 2026-09-24, selected audit | `d75412d12e27d8a338f635ed6a05e0e5c5b2d57e` | Bounded WebGL verified. WebGPU Hydra failed. Full current parity unverified. | 39 unit tests, seven browser checks, two exact rendered comparisons, installation, UI recovery, served output, and artifact reproduction. |

[Initial compatibility report](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/ea7795f20b4fcb157f6acabbe02935612babc32a/docs/COMPATIBILITY.md).
Run ID: `audit-20260924-090235`. No gap closed. Publication does not approve a release.
