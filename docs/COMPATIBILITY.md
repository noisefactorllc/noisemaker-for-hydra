# noisemaker-for-hydra: compatibility report

## 1. Source and authority revisions

Daily review: 2026-09-26 (vendor sync audit). Current inspected source: this record commit (record-only; implementation/test commit [`68d815d08fe10d70f528c729be7bc46d60d50ff0`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/68d815d08fe10d70f528c729be7bc46d60d50ff0)).
Full rendered parity remains **unverified**. No release approval or new closure follows from this review.
Current upstream discovery: `6a0af04d3c4f345ffab5e9f8e54e532216b4cdaa` (contained in release tag `v1.0.185`). Published Noisemaker authority: `1.0.185` (tag contains the audited range end; the pinned parity-gate authority remains the immutable `1.0.182` CDN identity), 210 effect IDs (counted from `shaders/effects/manifest.json`; unchanged in the audited delta).
The job's declared range start `fca611fd8f91424661d4e531d39313d24ea21134` is an ancestor of the previously audited end `2f47612c29045c1b91af94887a8ff20106e980ef`, so its shaders/ content was already covered by the audited `13a8a0491dcf..2f47612c` delta below; the incremental audited shader range is `2f47612c..6a0af04d3c4f`. Its `shaders/` delta contains four commits: `fa83eeab` (GAP-005 pass-field propagation onto expanded passes), `6113da00` (GAP-006 resource allocation-plan consumption behind texturePooling opt-in), `95743621` (viewport passes without clear treated as partially written for texture pooling), and `f83a427e` (structured `ShaderDiagnostic` diagnostic union normalizing backend shader/compiler failures). The diffstat touches `shaders/src/runtime/{backends/diagnostics.js (new, +185), backends/webgl2.js (±45), backends/webgpu.js (±103), expander.js (+12), pipeline.js (+279)}`, `shaders/tests/{test_backend_diagnostics.js (+338), test_pass_fields.js (+323), test_resource_pooling.js (+483)}`, upstream `package.json` (test-runner listing only), and upstream docs; `shaders/effects/` is unchanged, so the effect catalog (210 IDs) has no additions, removals, or parameter-contract changes to port. No port runtime module (`src/lib/`, `src/stores/`) changed. This port consumes the published engine from the rolling `/1` CDN (`src/lib/noisemaker-runtime.mjs:1`), so runtime behavior arrives through the published core without tree changes; the unpinned CDN URL remains an open GAP-001/GAP-003 risk. The port-facing surface added by the range is the structured `ShaderDiagnostic` union: upstream preserves the legacy observable surface (`code`, `detail`, `program`, `source` as enumerable own properties; `err.detail || err.message` consumer fallbacks), and this port's `formatError()` (`src/stores/repl-v2.js:1`) renders the diagnostic through `err.message`, so the user-visible error text is unchanged — covered by the two `repl-v2` tests added in commit `68d815d0`; pass-field propagation and allocation-plan pooling are engine-internal. Acceptance scope: this is a ports-sync (tearoff) delivery — its criteria are the audited upstream range, the port-side tests, and the local suite pass at the delivered commits; GAP-001, the WebGPU GAP-004, and GAP-006 (missing rendered CI gate) pre-date this delivery and remain open without closure from the sync. Record provenance: implementation/test commit `68d815d08fe10d70f528c729be7bc46d60d50ff0` and this record commit. Suite bound to the delivered commits (local, no CI declared for this delivery): `node --test test/*.test.mjs` 82 pass / 0 fail; `CHROME=/usr/bin/chromium PORT=5197 node scripts/test.mjs` 11 browser checks PASS / 0 fail; `node node_modules/vite/bin/vite.js build` exit 0 with a byte-identical `dist/` (no tracked dist change). Audit provenance: the declared range was audited in a fresh full clone of noisefactorllc/noisemaker (the prior reference checkout's object store is incomplete — blob `02edf77e1126` referenced by tree `2f47612c` is absent, so path-filtered logs and diffs in that copy under-report; the fresh clone resolves every object); the `ShaderDiagnostic` field contract quoted by the tests is copied from `shaders/src/runtime/backends/diagnostics.js` at `6a0af04d3c4f`.
The observations below retain their original source and authority identities. They do not qualify later updates.

### Earlier source observations

Daily review: 2026-09-25 (vendor sync audit). Inspected source: [`2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9). Current upstream discovery: `2f47612c29045c1b91af94887a8ff20106e980ef` (release tag `v1.0.182`). Published Noisemaker authority: `1.0.182`, source `2f47612c29045c1b91af94887a8ff20106e980ef`, 210 effect IDs (counted from `shaders/effects/manifest.json` at that commit).
The job's declared range start `fca611fd8f91424661d4e531d39313d24ea21134` predates the previous sync (`9d3474df`, commit 88a05e1) and was superseded by a force-push; the audited shader range is `13a8a0491dcf9aeb8eb2db5518682f58a6a0ec0e..2f47612c29045c1b91af94887a8ff20106e980ef`. Its `shaders/` delta contains three commits: `a021a283` (GAP-004 authorable mipmaps/persistent/3D-filter texture policies), `62eb56fa` (WebGL2 full mip-chain allocation, cached WebGPU mip bind groups), and `2f47612c` (fix double-creation of global surfaces on allocation change). The diffstat touches `shaders/src/runtime/{backends/webgl2.js,backends/webgpu.js,compiler.js,effect-validator.js,pipeline.js}`, `shaders/tests/test_mip_controls.js`, upstream docs, and `scripts/run-js-tests.js`; `shaders/effects/` is unchanged, so the effect catalog (210 IDs) has no additions, removals, or parameter-contract changes to port. No `src/engine/` module changed. This port consumes the published engine from the rolling `/1` CDN (`src/lib/noisemaker-runtime.mjs:1`), so runtime behavior arrives through the published `1.0.182` core without tree changes; the unpinned CDN URL remains an open GAP-001/GAP-003 risk. The port-facing surface added by the range is the texture-policy effect-definition validation diagnostics (`filter`/`mipmaps`/`persistent`), covered by the three `repl-v2` tests introduced in commit 2b60ce97; pipeline and backend changes are engine-internal. Acceptance scope: this is a ports-sync (tearoff) delivery — its criteria are the audited upstream range, the port-side tests, and the local suite pass at the delivered commits; GAP-001, the WebGPU GAP-004, and GAP-006 (missing rendered CI gate) pre-date this delivery and remain open without closure from the sync. Record provenance: implementation/test commit `2b60ce97`; record-only commits `22a90ac7d1e4dbd7d2794fd6d71c8f7d6c0394f4`, `bd749991ec0d0d2cbd20d3203dde05993206c28a`, `1bc5fc2a4526c7d732bc21e1293e3d43582b4c08` (published tip) and this commit. The delivered tip received its own applicable checks: a pristine clone of `1bc5fc2a` with `npm ci` ran `node --test test/*.test.mjs` 68 pass / 0 fail and `CHROME=/usr/bin/chromium node scripts/test.mjs` 7 browser checks PASS / 0 fail; this repo declares no CI checks and no deployments and contains no workflow, so zero Actions runs exist and count as absent, not success (GAP-006 open). Earlier verification at the test commit 2b60ce97: `node --test test/*.test.mjs` 68 pass, 0 fail; `CHROME=/usr/bin/chromium node scripts/test.mjs` 7 browser checks PASS, 0 fail. Audit provenance: upstream range inspected in a local reference checkout of noisefactorllc/noisemaker (regular-file copy; `git log --stat 13a8a049..2f47612c -- shaders/`); the texture-policy diagnostic strings in the tests are copied verbatim from `shaders/src/runtime/effect-validator.js` lines 729-750 at `2f47612c`.

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
| Built distribution | verified per recorded run; rebuild not deterministic | Isolated build matched all 28 tracked distribution files (2026-09-24) and all 30 tracked files after the notices addition (2026-09-26, SHA-256 diff exit 0) — each claim compares one isolated build whose emitted bundle happened to equal the tracked bundle bytes. Only dist was served on loopback. Newly recorded limit: ten consecutive isolated builds of the identical tree produced three distinct bundle hashes and chunk filenames (the tracked index-aecb58b8.js and two variants), so a fresh build reproduces the tracked 30-file set only in a fraction of runs; the 30/30 byte-exact reproduction is a recorded-run fact, not a deterministic property. Consumers must bind to the committed artifact bytes. |
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
| Artifact notices | verified | `dist/LICENSE` (repository AGPL-3.0 text) and `dist/THIRD-PARTY-NOTICES` are emitted from `public/` into every build (2026-09-26). `THIRD-PARTY-NOTICES` enumerates all 82 bundled npm packages with installed versions, licenses, and per-package copyright lines, plus the vendored files (p5.js local copy, Font Awesome, normalize.css, Skeleton, theme) and the third-party resources the page loads from other origins at runtime (p5.js 1.4.0 from cdnjs, Google Fonts, a cdn.glitch.com favicon). |
| Dependency advisories | assessed | `npm audit --omit=dev` reports 16 advisories (2 low, 6 moderate, 7 high, 1 critical); module-graph evidence (82 bundled packages) shows the bundled ones (`qs`, `socket.io-client` chain, `shortid`, `@babel/runtime`) are dormant behind the undefined `VITE_SERVER_URL` or unused code paths, and the rest are not bundled. Advisories are assessed, not eliminated (2026-09-26). |
| Upgrade and removal | verified (bounded) | Saved-sketch upgrade: the `?code=` scheme is unchanged since the previously served revision `626f37c`, verified by a unit test restoring a program encoded by that exact scheme including the legacy `show-code=false` parameter (2026-09-26). No published npm package or release channel exists; upgrade means replacing the served `dist`. Removal remains stop-the-server and delete-the-checkout. |
| Release readiness | blocked | Full parity and the failed WebGPU case (GAP-001, GAP-004) remain open; the audit-era external demo URL is undeclared; bundle rebuild nondeterminism is recorded; no CI gate exists (GAP-006). |

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

### Distribution and release checks, 2026-09-26 (GAP-003)

Scope of this qualification round: the tracked distribution artifact, its notices, the 16 production dependency advisories, served-byte binding, and installation/upgrade/removal. GAP-003 is not closed: its blockers GAP-001 and GAP-004 remain open, and full release qualification (including the non-deterministic bundle build recorded below) stays contingent.

Implementation changes in this round: the artifact now carries its required notices — `public/LICENSE` (a verbatim copy of the repository's GNU AGPL-3.0 `LICENSE`, preserving AGPL attribution) and `public/THIRD-PARTY-NOTICES` (attribution for the vendored p5.js 1.6.0 under LGPL-2.1 with its embedded notice, Font Awesome Free 5.2.0 with its per-file license statements, normalize.css 3.0.2, Skeleton V2.0.4, the Tomorrow Night Eighties theme, and the complete bundled npm dependency set — 82 packages identified from the bundler's module graph, listed with installed versions and licenses, with per-package copyright lines and permissive license texts, including the non-MIT qs 6.11.2 (BSD-3-Clause), hyperx (BSD-2-Clause), ieee754 (BSD-3-Clause), inherits/nanoassert/prettier-bytes (ISC), and nanoscheduler (Apache-2.0)). Vite emits both files into `dist/`, so the tracked distribution now contains 30 files (previously 28).

Distribution and installation checks executed (raw commands, output, and exit codes in local execution logs retained outside the tree, following the 2b60ce97 precedent; the summarized results below are the record):

| Command | Expected | Executed | Pass | Fail | Exit |
|---|---|---|---|---|---|
| `npm ci --bin-links=false --ignore-scripts` (isolated `git archive` tree of the candidate commit) | install | 1 | 1 | 0 | 0 |
| `node node_modules/vite/bin/vite.js build` (isolated) | 30 tracked dist files reproduced | 30 | 30 | 0 | 0 |
| SHA-256 diff of isolated build vs tracked `dist/` | 30/30 byte-identical | 30 | 30 | 0 | 0 |
| `npm audit --omit=dev --json` (isolated) | assessment of all advisories | 16 advisories (2 low, 6 moderate, 7 high, 1 critical) | assessed below | 0 unassessed | 1 (advisories present) |
| `node --test test/*.test.mjs` | 80 tests | 80 | 80 | 0 | 0 |
| `CHROME=/usr/bin/chromium PORT=5179 node scripts/test.mjs` | 11 browser checks | 11 | 11 | 0 | 0 |
| `npm install` (literal README command, no safety flags) | install | 1 | 1 | 0 | 0 |

Bundle determinism (newly recorded limit): ten consecutive isolated builds of the identical tree produced three distinct bundle hashes — `13ba4b5c…` (6 runs, the tracked bundle), `2f4bce39…` (3 runs), and `9bfff69e…` (1 run) — raw ten-run output retained in the local execution logs outside the tree. The differences are confined to esbuild minifier identifier assignment and declaration order inside the single emitted chunk (module-level equivalence was not proven beyond this token comparison; the compared variant had 110,901 vs 110,908 identifier tokens with 911 renamed identifiers and 284 short reorder blocks). The tracked `dist/` bytes are therefore bound by hash to this exact commit, but a rebuild is not guaranteed to be byte-identical; consumers must bind to the committed artifact bytes, not to a fresh build. The earlier 2026-09-24 claim that an isolated build reproduced all 28 files byte-exactly remains true for that recorded run; the determinism limit above was not previously recorded and now is, with the retained raw ten-run output matching the counts stated here (13ba4b5c x6, 2f4bce39 x3, 9bfff69e x1).

Dependency decisions (16 production advisories; authoritative bundling evidence from the bundler's module-graph input listing — the complete 82-package list with installed versions and licenses, raw output retained in the local execution logs outside the tree). Bundled advisories: `qs` 6.11.2 (BSD-3-Clause), `socket.io-client`/`engine.io-client`/`socket.io-parser`/`parseuri`, `shortid` (with `nanoid`), and `@babel/runtime` are all bundled (esbuild metafile) but dormant — their code paths execute only when `state.serverURL` is set from `VITE_SERVER_URL` (`src/stores/store.js:13`, patch-bay/gallery endpoints) or, for `@babel/runtime`, in generated-RegExp paths the bundled i18next usage does not exercise; the distributed build defines no `VITE_SERVER_URL`, so `serverURL` is `null`. Note that a plain-text grep of the minified bundle is not reliable bundling evidence (the minifier renames identifiers such as `parseuri`); the module-graph listing is authoritative. Not bundled: `i18next-http-backend` (import commented out, `src/stores/language-store.js:3`), `form-data` (only superagent's MIME-type string appears; its dependencies `hexoid`/`combined-stream` are absent from the module graph), `min-document`, `minimatch`, `brace-expansion`, `semver`, `formidable`, and `ws` — none reachable. Decision: no dependency is upgraded in this round (upgrade candidates such as shortid→nanoid and socket.io-client 2→4 change public APIs used by the vendored patch-bay code and would alter behavior without rendered qualification); the advisories are recorded as assessed with reachability evidence, and the dormant chains are re-assessable if a server-integrated build is ever produced.

Served-byte binding: the repository declares no external deployment — `git ls-remote origin` lists only `refs/heads/main` at `413d97acde311994fc9fc91b7b7706fbf186cd45` (no `gh-pages`, although `package.json` retains a `publish` script that would subtree-push `dist` to it), and `https://noisefactorllc.github.io/noisemaker-for-hydra/` returns HTTP 404. The only deployment this repository defines is serving the `dist` tree; that binding was verified by serving `dist/` on loopback with `http-server` and fetching every file: 30/30 HTTP 200, and the served SHA-256 set equals the tracked `dist` set exactly. The audit-era external demo (source `626f37c21170927e7c24429ca2c8f31cf38905ec`) remains an undocumented external deployment whose URL is not declared anywhere in this repository; binding its served bytes to source remains impossible from here and stays an open limit.

Saved-sketch upgrade qualification: the `?code=` URL scheme at the previously served revision `626f37c` is source-verified as `btoa(encodeURIComponent(source))` — the verbatim `git show` excerpt is retained in the local execution logs outside the tree, and those lines are identical in the current tree (`src/stores/gallery.js:159-164`; `git diff 626f37c..HEAD -- src/stores/gallery.js` touches neither line). A new unit test ('gallery restores a code parameter recorded from the scheme at revision 626f37c', `test/developer-workflow.test.mjs`) restores a fixed `code` parameter recorded under that scheme — committed as a literal so the test restores recorded bytes rather than re-running the current encoder — and also covers the legacy `show-code=false` parameter. The scheme identity is therefore source-inspection evidence plus a round-trip restore through the current decoder, not a test against bytes served by the external demo; the latter stays impossible while that deployment's URL is undeclared. Upgrade path: replace the served `dist` with the new tracked artifact (saved URLs keep working, as verified); no published npm package, release channel, or migration step exists. Installation: the literal README command `npm install` was executed (exit 0), in addition to the no-symlink/no-lifecycle variant (`npm ci --bin-links=false --ignore-scripts`, exit 0); removal remains stop-the-server and delete-the-checkout, with no global package or user project touched.

Remaining limits: GAP-001 and GAP-004 (release blockers per the gap register) remain open, so no release readiness is claimed; the audit-era external demo URL is undeclared and unverified; rebuild nondeterminism is recorded, not fixed; `npm audit` advisories are assessed, not eliminated (16 remain at the audited versions, none reachable in the distributed default artifact).

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
5. Check notices, dependency decisions, served provenance, upgrades, and removal for GAP-003 (executed 2026-09-26; remaining: bind the undeclared audit-era external demo URL, resolve GAP-001/GAP-004 blockers, and address bundle rebuild nondeterminism before any release qualification).

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

## 7. Vendor sync audit evidence (2026-09-26, noisemaker 2f47612c..6a0af04d)

Commands executed against a fresh full clone of noisefactorllc/noisemaker (the earlier reference checkout's object store is incomplete — blob `02edf77e1126` referenced by the `2f47612c` tree is absent, so path-filtered `git log`/`git diff` in that copy silently under-report; the fresh clone resolves every object). Range-end ancestry and tag containment verified in the same clone:

- `git merge-base --is-ancestor fca611fd8f91424661d4e531d39313d24ea21134 6a0af04d3c4f345ffab5e9f8e54e532216b4cdaa` -> true (40 commits, contiguous), and `git merge-base --is-ancestor fca611fd8f914 2f47612c2904` -> true, so the previously audited `13a8a049..2f47612c` delta already contains the declared range start; the incremental audited shader range is `2f47612c..6a0af04d3c4f` (18 commits).
- `git log --oneline 2f47612c..6a0af04d3c4f -- shaders/` ->
  - `f83a427e` fix(shaders): normalize backend shader/compiler failures to one structured diagnostic union
  - `95743621` fix(shaders): treat viewport passes without clear as partially written for texture pooling
  - `6113da00` feat(shaders): consume the resource allocation plan behind texturePooling opt-in with a queryable runtime plan (GAP-006)
  - `fa83eeab` feat(shaders): copy name/viewport/clear/samplerTypes/type onto expanded passes (GAP-005)
  Remaining 14 commits in the range are upstream docs/CI changes (`428ea29`, `93608f10`, `6a0af04d`, `0b2866dd`, `ad17fd02`, `6c3f9a26`, `8eeb7b5a`, `27590caa`, `919f653e`, `94fc880b`, `5e52a2a2`, `c6bc8e17`, `85ded3a6`, `63349a7d`).
- `git diff --name-only 2f47612c 6a0af04d3c4f -- shaders/effects/` -> empty output (no effect-catalog commits; the 210-ID catalog at `shaders/effects/manifest.json` is unchanged, so no additions, removals, or parameter-contract changes to port).
- `git diff --stat 2f47612c 6a0af04d3c4f -- shaders/ package.json` -> 9 files changed, 1720 insertions(+), 50 deletions(-): `package.json` (2: test-runner listing only), `shaders/src/runtime/backends/diagnostics.js` (+185, new), `backends/webgl2.js` (45), `backends/webgpu.js` (103), `shaders/src/runtime/expander.js` (+12), `shaders/src/runtime/pipeline.js` (+279), `shaders/tests/test_backend_diagnostics.js` (+338), `test_pass_fields.js` (+323), `test_resource_pooling.js` (+483). No port runtime module (`src/lib/`, `src/stores/`) changed, so this CDN-consuming port needs no tree change beyond tests and records; the range's backend constructs were cross-checked against the port runtime (`src/lib/noisemaker-runtime.mjs`) which only consumes the published engine and requires `CanvasRenderer` + manifest APIs that are unchanged in the range.
- `git tag --contains 6a0af04d3c4f345ffab5e9f8e54e532216b4cdaa` -> `v1.0.185` (the audited range end is published); the pinned parity-gate authority remains the immutable `1.0.182` CDN identity, so no fixture regeneration was triggered by this sync.
- The `ShaderDiagnostic` field contract asserted by the two new `repl-v2` tests is copied from `shaders/src/runtime/backends/diagnostics.js` at `6a0af04d3c4f`: `name = 'ShaderDiagnostic'`, legacy machine codes `ERR_SHADER_COMPILE` / `ERR_SHADER_LINK` / `ERR_SHADER_MISSING` / `ERR_NO_WGSL_SOURCE`, `backend` `'webgl2' | 'webgpu'`, `stage` `'compile' | 'link' | 'missing-source' | 'bind'`, `message` constructed from `detail` so the legacy `err.detail || err.message` consumer fallback keeps its output, plus `messages`, `program`, `source`, `bindingIndex`.

Suite executions bound to delivered commits (local, no CI declared for this delivery):
- `68d815d08fe10d70f528c729be7bc46d60d50ff0` (test additions): `node --test test/*.test.mjs` 82 pass / 0 fail; `CHROME=/usr/bin/chromium PORT=5197 node scripts/test.mjs` 11 PASS / 0 fail (11 cases defined by `scripts/test.mjs:57`); `node node_modules/vite/bin/vite.js build` exit 0 with a byte-identical `dist/` (no tracked dist change).
- The current record commit received the same pre-commit local execution.
- Review-readable bundle: `workflow-evidence/upstream-audit.txt` retains the raw audit command output (ancestry checks for `fca611fd8f91`, `2f47612c`, `6a0af04d3c4f`; the 18-commit range with the four `shaders/` commits; empty `shaders/effects/` delta; diffstat; `v1.0.185` tag containment; the `ShaderDiagnostic` module head at `6a0af04d3c4f`), and `workflow-evidence/{unit.log,unit.exit,browser.log,browser.exit,build.log,build.exit,exit-codes.txt,versions.txt,source-hashes.txt}` are regenerated together at the delivered commits (`unit.log` 82 pass / 0 fail, `browser.log` 11 PASS, `build.log` exit 0, `versions.txt` records the delivery commit SHA, tool versions, and host).
