# noisemaker-for-hydra: compatibility report

## 1. Source and authority revisions

Daily review: 2026-09-25 (vendor sync audit). Current inspected source: [`2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9).
Full rendered parity remains **unverified**. No release approval or new closure follows from this review.
Current upstream discovery: `2f47612c29045c1b91af94887a8ff20106e980ef` (release tag `v1.0.182`). Published Noisemaker authority: `1.0.182`, source `2f47612c29045c1b91af94887a8ff20106e980ef`, 210 effect IDs (counted from `shaders/effects/manifest.json` at that commit).
The job's declared range start `fca611fd8f91424661d4e531d39313d24ea21134` predates the previous sync (`9d3474df`, commit 88a05e1) and was superseded by a force-push; the audited shader range is `13a8a0491dcf9aeb8eb2db5518682f58a6a0ec0e..2f47612c29045c1b91af94887a8ff20106e980ef`. Its `shaders/` delta contains three commits: `a021a283` (GAP-004 authorable mipmaps/persistent/3D-filter texture policies), `62eb56fa` (WebGL2 full mip-chain allocation, cached WebGPU mip bind groups), and `2f47612c` (fix double-creation of global surfaces on allocation change). The diffstat touches `shaders/src/runtime/{backends/webgl2.js,backends/webgpu.js,compiler.js,effect-validator.js,pipeline.js}`, `shaders/tests/test_mip_controls.js`, upstream docs, and `scripts/run-js-tests.js`; `shaders/effects/` is unchanged, so the effect catalog (210 IDs) has no additions, removals, or parameter-contract changes to port. No `src/engine/` module changed. This port consumes the published engine from the rolling `/1` CDN (`src/lib/noisemaker-runtime.mjs:1`), so runtime behavior arrives through the published `1.0.182` core without tree changes; the unpinned CDN URL remains an open GAP-001/GAP-003 risk. The port-facing surface added by the range is the texture-policy effect-definition validation diagnostics (`filter`/`mipmaps`/`persistent`), covered by the three `repl-v2` tests introduced in commit 2b60ce97; pipeline and backend changes are engine-internal. Acceptance scope: this is a ports-sync (tearoff) delivery — its criteria are the audited upstream range, the port-side tests, and the local suite pass at the delivered commits; GAP-001, the WebGPU GAP-004, and GAP-006 (missing rendered CI gate) pre-date this delivery and remain open without closure from the sync. Record provenance: implementation/test commit `2b60ce97`; record-only commits `22a90ac7d1e4dbd7d2794fd6d71c8f7d6c0394f4`, `bd749991ec0d0d2cbd20d3203dde05993206c28a`, `1bc5fc2a4526c7d732bc21e1293e3d43582b4c08` (published tip) and this commit. The delivered tip received its own applicable checks: a pristine clone of `1bc5fc2a` with `npm ci` ran `node --test test/*.test.mjs` 68 pass / 0 fail and `CHROME=/usr/bin/chromium node scripts/test.mjs` 7 browser checks PASS / 0 fail; this repo declares no CI checks and no deployments and contains no workflow, so zero Actions runs exist and count as absent, not success (GAP-006 open). Earlier verification at the test commit 2b60ce97: `node --test test/*.test.mjs` 68 pass, 0 fail; `CHROME=/usr/bin/chromium node scripts/test.mjs` 7 browser checks PASS, 0 fail. Audit provenance: upstream range inspected in a local reference checkout of noisefactorllc/noisemaker (regular-file copy; `git log --stat 13a8a049..2f47612c -- shaders/`); the texture-policy diagnostic strings in the tests are copied verbatim from `shaders/src/runtime/effect-validator.js` lines 729-750 at `2f47612c`.
The observations below retain their original source and authority identities. They do not qualify later updates.

### Earlier source observations

Daily review: 2026-09-25. Inspected source: [`8c5dafd3cb5232297001e058b6b1dd2a05a215c9`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/8c5dafd3cb5232297001e058b6b1dd2a05a215c9).

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

Current tests and qualification limits are in [section 3](#3-parity-coverage).
The matrix below retains the earlier measured scope. A historical verified row is not a current-source or full-platform certification.

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

### Rendered parity gate, 2026-09-26

A complete rendered gate now exists in the tree: `scripts/parity-gate.mjs` drives headless Chromium over the DevTools protocol through `test/parity-gate/authority.html` (raw published Noisemaker engine, pinned immutable CDN identity, default `CanvasRenderer` wiring) and `test/parity-gate/port.html` (the tracked companion bundle `public/_engine/hydra-synth.js` through the fork's `src/lib/noisemaker-runtime.mjs` wiring), rendering every case in `test/fixtures/parity-cases.json`. The case matrix is generated from the upstream effect definitions at the pinned commit `2f47612c29045c1b91af94887a8ff20106e980ef` by `scripts/generate-parity-cases.mjs`; fixture SHA-256 `5b43d8a2243ad55f0b4e668909a1ce0d27ca86f4423ea47ebf8d37fd15202a06`. Each of the 210 effect IDs carries two programs — a defaults program and a varied program (varied parameters, define-backed kwargs, explicit surface bindings via a `noise()` feeder, chains via `noise()`/`noise3d()`) — rendered at 32×24 (defaults at times 0, 0.37, 0.74; varied at 0, 0.37) and at 24×18 (defaults at time 0). The full denominator is 210 cases × 6 comparisons = 1260. The driver verifies the pinned identities before executing any case: engine bundle `e1a10dc9aa7c739b416ec546304326ad6f457eb3dc5d0ca2a601cee56b9d7f50`, manifest `05c4d7b7744837ae90a3bb4c89e5403ff09448a74d9d7e824abb3d719ad3314e`, companion `5f04f7a43509cf6bb9629ee278b03314d55f734a06b8fd00ead37fa48a881ded`. Comparison is exact-equality first; the legacy ±2 numerical contract is reported separately (zero cases fell into it).

Result of the executed run: 1254 of 1260 comparisons executed and exact; 0 tolerance-level, 0 failed; 6 missing — all frames of `filter/octaveWarp`, authority side only. `filter/oilPaint` passed on retry. The port rendered every `filter/octaveWarp` frame; the pinned authority engine fails on the second render of the program under SwiftShader with `ERR_SHADER_COMPILE` and an empty ANGLE info log (raw log: `console.error [GLSL compile error] null`), reproduced in eight fresh-chromium slice attempts and isolated by probes (first render succeeds, second render fails, at any time value). The failures and missing case are preserved in `parity-evidence/slice-068.json` and the merged `parity-evidence/parity-gate-report.json`; the gate exits nonzero and `pass=false`. GAP-001 therefore remains open: its acceptance requires executing every case without missing comparisons, and the 6 missing frames are a pinned-authority engine limitation of this environment that no port-side change can remove.

Literal execution: `CHROME=/usr/bin/chromium GATE_BATCH=1 GATE_SLICE_ATTEMPTS=2 node scripts/parity-gate.mjs parity-evidence` (final merged run; earlier attempts used `GATE_SLICE_ATTEMPTS=3` and `=8`), exit 1. Chromium 154.0.8037.57 (Debian GNU/Linux 12), SwiftShader WebGL2 (`WebGL 2.0 (OpenGL ES 3.0 Chromium)` / `WebKit WebGL`), Node v26.5.1, linux-x64. One fresh Chromium per case (batch 1) with a shared warm HTTP cache; each launch command is logged verbatim in `parity-evidence/gate-run.log`. Identity note recorded by the gate: the rolling `/1` core (`31b766091125742665bee4c5c8392048eaaa786748cc9570b1c94460029fbded`) no longer matches the pinned `1.0.182` bundle — upstream has published a newer engine under `/1` since the fixture was minted; the gate gates on the pinned identity and records the drift as informational.

| Gate | Expected | Executed | Strict passes | Failures | Skips | Missing or unverified |
|---|---|---|---|---|---|---|
| Rendered parity gate (this section) | 1260 | 1254 | 1254 | 0 | 0 | 6 (filter/octaveWarp authority frames) |
| Unit tests | 39 | 39 | not a render gate | 0 | 0 | Render coverage does not follow. |
| Existing browser cases | 7 | 7 | not a render gate | 0 | 0 | Pixels were not compared. |
| Independent published-reference probes | 2 | 2 | 2 | 0 | 0 | All broader cases remain unverified. |
| Hydra solid WebGPU probe | 1 | 1 | 0 | 1 | 0 | Other WebGPU cases remain unverified. |
| Complete current-authority effects | 210 effect IDs | 210 | 209 effect IDs exact | 0 | 0 | octaveWarp authority frames missing. |
| Parameter, define, input, temporal matrix | 1260 (2 programs, 3 sizes/times per case) | 1254 | 1254 | 0 | 0 | 6 missing as above. |

The 6 missing comparisons are retained in the denominator; no case was skipped, no tolerance applied, and no fixture or gate criterion was relaxed to reach the summary.

### Installed developer workflow checks, 2026-09-26 (GAP-002)

Scope of this qualification round: the browser editor, its in-app guidance, saved-work controls, invalid-input diagnostics and recovery, URL restoration and removal, and component resource cleanup. No rendered pixels were compared; the rendered parity gate above remains the authority for output correctness.

Supported platforms defined by this record (dependency of GAP-002): the developer workflow is supported on Chromium-based desktop browsers with WebGL2 — verified here on Chromium 154.0.8037.57, Debian GNU/Linux 12 (bookworm), linux-x64, Node v26.5.1, npm 11.17.0 (retained prior evidence: Chrome 153.0.8010.53, macOS 26.5 arm64). Firefox, Safari, Windows, Android, and other versions remain unmeasured and are not claimed.

Implementation changes in this round: the in-app help (`src/stores/text-elements.js`) now describes Polymorphic DSL (search directive, `.write(oN)`, `render(oN)`, Ctrl+Shift+Enter, URL-preserved programs) and no longer claims camera/screen/stream/audio inputs, external JS libraries, or cross-browser streaming, which this fork does not provide (`getUserMedia`/`mediaDevices` are absent from `dist/assets/index-aecb58b8.js` and `public/_engine/hydra-synth.js`). The editor placeholder (`src/views/cm6-editor/editor.js`, unused by the active CodeMirror 5 editor) was corrected from `osc().out()` to a search-directive example.

Checks executed (raw output and exit codes in `workflow-evidence/`):

| Command | Expected | Executed | Pass | Fail | Exit |
|---|---|---|---|---|---|
| `node --test test/*.test.mjs` | 79 tests | 79 | 79 | 0 | 0 (`workflow-evidence/unit.log`) |
| `CHROME=/usr/bin/chromium PORT=5197 node scripts/test.mjs` | 11 browser checks | 11 | 11 | 0 | 0 (`workflow-evidence/browser.log`) |
| `node node_modules/vite/bin/vite.js build` | 28 tracked dist files | 28 | tracked, count unchanged | 0 | 0 |

The browser denominator is now 11 cases: the original seven DOM/compiler cases retained unchanged plus four new ones — README noise example (`search hydra\nnoise(scale: 5).write(o0)\n\nrender(o0)`), README chained points example (`search hydra, points, render` with `pointsEmit/flow/pointsRender`), invalid-effect diagnostic case (`bogusEffect()` must surface `Unknown effect` with `log-error` in the console element), a 640×480 resized-window case, and the original seven retained unchanged. These cover, through public URL controls: documented examples, invalid input, URL restoration (encoded and default), and the defined resize dimension. Recovery is covered by `repl.eval` unit test 'repl.eval recovers after a failed compilation' (failed compile, then a corrected program compiles cleanly through the same public path); prior rendered recovery evidence (corrected solid producing opaque red) is retained in section 3 history. Saved-work input removal and URL restoration are covered by `test/developer-workflow.test.mjs` (gallery `saveLocally` writes the program into the URL, `clear()` removes the `code` parameter and nulls the sketch, and a `?code=` URL decodes back to the exact program). Resource cleanup is covered by the extended lifecycle source checks (`test/no-legacy-runtime.test.mjs`: renderer stop/dispose, capture-track stop, patch-bay destroy, `window.hydraSynth` release) and by the retained prior probe evidence that renderer disposal stops execution and clears its pipeline.

Remaining limits: external media, audio/MIDI hardware, browser upgrades, and non-listed browsers or operating systems remain unverified; no pixels were compared; the parity gate's 6 missing authority frames are unchanged.

CI boundary (2026-09-26): a source-bound workflow (`.github/workflows/tests.yml`) now runs the unit/compiler suite, the distribution build, and the 11-case headless browser suite on every push to main and pull request. It does not execute the rendered parity gate, so it does not enforce rendered parity; GAP-006 remains open and GAP-001's 6 missing authority frames are unchanged. The local raw evidence in `workflow-evidence/` was regenerated for the CI-workflow candidate (scripts/test.mjs now launches vite through `node node_modules/vite/bin/vite.js`, keeping the no-symbolic-links install contract intact).

### Daily review, 2026-09-25

48 unit tests and seven browser editor checks pass. The browser checks do not compare pixels. The retained WebGPU failure and two bounded WebGL2 comparisons remain relevant, but do not qualify all current authority inputs or the Hydra API. GAP-001, GAP-004, and the missing rendered CI gate remain open. [Raw evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/hydra-browser-tests.json).

The current full case denominator remains incomplete. Missing parameters, hosts, external inputs, and stateful sequences remain qualification gaps. No skip or tolerated difference counts as exact parity.

### Earlier measurements

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

Review CI boundary: No workflow run exists at the inspected source SHA. A passing export dispatch does not qualify rendered parity. Current complete-render enforcement remains an open verification requirement. [Exact-source responses and workflows](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/noisemaker-for-hydra-remote-evidence.json).

The current-source browser probe independently reproduces ERR_NO_WGSL_SOURCE for Hydra solid after switching to WGSL. [Probe](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/hydra-wgsl-current.json).

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

Next bounded check: At an immutable engine revision, run the same Hydra program in WebGL2 and WebGPU and retain output or ERR_NO_WGSL_SOURCE. Require equal useful output before closing GAP-004. Then enumerate the expected Hydra API, Noisemaker effects, and parameter cases. Exercise keyboard controls and error recovery separately.
See the stable entries in [completion gaps](COMPLETION_GAPS.md).

The stable [gap register](COMPLETION_GAPS.md#4-known-gaps) defines each action, dependency, and acceptance check.

1. Resolve source and authority identities. Inventory every rendered case for GAP-001.
2. Resolve the missing WGSL shader behavior for GAP-004. Preserve the failing case.
3. Establish full exact-source CI enforcement for GAP-006 through the implementation job.
4. Test external inputs and supported platforms. Correct help and accessible controls for GAP-002 and GAP-005.
5. Check notices, dependency decisions, served provenance, upgrades, and removal for GAP-003.

Full parity requires zero skipped or missing cases. Scheduled audits do not enforce pre-push parity.
All eligible ports retain equal rotation priority. C++ remains excluded. No implementation or parity checkpoint changed.

## 6. History

2026-09-25 daily review at `8c5dafd3cb5232297001e058b6b1dd2a05a215c9`: source freshness and bounded evidence reviewed. Open qualification limits retained. [Retained review evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/hydra-browser-tests.json). No new closure claimed.

| Date | Source | Result | Change |
|---|---|---|---|
| 2026-09-24, initialization | `2691007f48acc5342c6a10478373094fff6fd697` | Full qualification unverified | 36 unit tests. Browser and rendered coverage unexecuted. |
| 2026-09-24, selected audit | `d75412d12e27d8a338f635ed6a05e0e5c5b2d57e` | Bounded WebGL verified. WebGPU Hydra failed. Full current parity unverified. | 39 unit tests, seven browser checks, two exact rendered comparisons, installation, UI recovery, served output, and artifact reproduction. |

[Initial compatibility report](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/ea7795f20b4fcb157f6acabbe02935612babc32a/docs/COMPATIBILITY.md).
Run ID: `audit-20260924-090235`. No gap closed. Publication does not approve a release.
## 6. Vendor sync audit evidence (2026-09-25, noisemaker 13a8a0491dcf..2f47612c2904)

Commands executed against a local reference checkout of noisefactorllc/noisemaker at `2f47612c29045c1b91af94887a8ff20106e980ef` (release tag `v1.0.182`):

- `git log --oneline 13a8a0491dcf..2f47612c -- shaders/` ->
  - `2f47612c` fix(shaders): stop double-creating global surfaces on allocation change
  - `62eb56fa` fix(shaders): allocate the WebGL2 mip chain and cache WebGPU mip bind groups
  - `a021a283` feat(shaders): authorable mipmaps/persistent/3D filter texture policies (GAP-004)
- `git log --oneline 13a8a0491dcf..2f47612c -- shaders/effects/` -> empty output (no effect-catalog commits; the 210-ID catalog at `shaders/effects/manifest.json` is unchanged from the previously synced `9d3474df` authority).
- `git diff --stat 9d3474df..2f47612c -- shaders/` -> 6 files changed, 988 insertions, 45 deletions: `src/runtime/backends/webgl2.js` (+121), `src/runtime/backends/webgpu.js` (+283), `src/runtime/compiler.js` (+17), `src/runtime/effect-validator.js` (+27), `src/runtime/pipeline.js` (+119), `tests/test_mip_controls.js` (+466). No `src/engine/` module and no effect definition changed, so this CDN-consuming port needs no tree change beyond tests and records; the WebGL2/WebGPU backend constructs in the range were cross-checked against the port runtime (`src/lib/noisemaker-runtime.mjs`) which only consumes the published engine and requires `CanvasRenderer` + manifest APIs that are unchanged in the range.
- The texture-policy validator strings quoted by the three `repl-v2` tests are copied verbatim from `shaders/src/runtime/effect-validator.js` lines 729-750 at `2f47612c` (`"filter" is only supported on 3D texture specs ("textures3d")`, `unknown filter ... (expected 'nearest' or 'linear')`, `"mipmaps" is only supported on 2D texture specs ("textures")`, `"persistent" is only supported on 2D texture specs ("textures")`, `"mipmaps" must be a boolean`, `"persistent" must be a boolean`).

Suite executions bound to delivered commits (local, no CI declared for this delivery):
- `2b60ce97` (test additions): `node --test test/*.test.mjs` 68 pass / 0 fail; `CHROME=/usr/bin/chromium node scripts/test.mjs` 7 PASS / 0 fail.
- `1bc5fc2a4526c7d732bc21e1293e3d43582b4c08` (published tip): pristine `git clone` + `npm ci`, same commands -> 68 pass / 0 fail and 7 PASS / 0 fail.
- The current record commit received the same pre-commit local execution -> 68 pass / 0 fail and 7 PASS / 0 fail.
