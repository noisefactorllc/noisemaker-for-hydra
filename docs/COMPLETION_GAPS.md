# noisemaker-for-hydra: completion gaps

Current measured support: [compatibility report](COMPATIBILITY.md).

## 1. Scope and source revisions

Daily review: 2026-09-25 (vendor sync audit). Current inspected source: [`2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9).
Full rendered parity remains **unverified**. No release approval or new closure follows from this review.
Current upstream discovery: `2f47612c29045c1b91af94887a8ff20106e980ef` (release tag `v1.0.182`). Published Noisemaker authority: `1.0.182`, source `2f47612c29045c1b91af94887a8ff20106e980ef`, 210 effect IDs (counted from `shaders/effects/manifest.json` at that commit).
Sync audit: the force-pushed range start `fca611fd8f91424661d4e531d39313d24ea21134` was superseded; the audited shader range `13a8a0491dcf9aeb8eb2db5518682f58a6a0ec0e..2f47612c29045c1b91af94887a8ff20106e980ef` contains three `shaders/` commits (`a021a283`, `62eb56fa`, `2f47612c`). `shaders/effects/` is unchanged at the range end, so effect-catalog parity requires no additions, removals, or parameter-contract updates. The runtime texture-policy changes reach this port through the published engine (`src/lib/noisemaker-runtime.mjs:1`); the new texture-policy validation diagnostics are covered by three `repl-v2` tests introduced in commit 2b60ce97. GAP-001 (full parity qualification, unpinned rolling `/1` engine URL) and the WebGPU GAP-004 remain open; no closure follows from this sync.
Record provenance: the implementation and test commit of this delivery is `2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9`; the record-carrying commits `22a90ac7d1e4dbd7d2794fd6d71c8f7d6c0394f4`, `bd749991ec0d0d2cbd20d3203dde05993206c28a`, `1bc5fc2a4526c7d732bc21e1293e3d43582b4c08` (published tip) and this record commit change documentation only. The delivered tip received its own applicable checks: a pristine clone of `1bc5fc2a` (origin main) with `npm ci` ran `node --test test/*.test.mjs` 68 pass / 0 fail and `CHROME=/usr/bin/chromium node scripts/test.mjs` 7 browser checks PASS / 0 fail (local execution logs retained outside the tree; this repo declares no CI checks, no deployments, and contains no workflow, so zero Actions runs are recorded and are recorded as absent, not success — GAP-006 stays open).
Acceptance scope: this record documents a ports-sync (tearoff) delivery whose own scope is the audited upstream range, its port-side tests, and the local suite pass at the delivered commits. GAP-001, the WebGPU GAP-004, and GAP-006 (missing rendered CI gate) pre-date this delivery, remain open, and are not closure claims of the sync; full rendered parity and release readiness stay unqualified as recorded above.
Range-audit evidence and suite bindings are recorded in the compatibility report, section 6 ("Vendor sync audit evidence"): `git log --oneline 13a8a0491dcf..2f47612c -- shaders/` yields exactly `2f47612c`, `62eb56fa`, `a021a283`; the same range against `shaders/effects/` is empty (210-ID catalog unchanged); the diffstat is 6 files, +988/-45, all under `shaders/src/runtime` plus upstream tests; the test strings are verbatim from `effect-validator.js:729-750` at `2f47612c`. Suite executions: 68 pass / 0 fail unit and 7 PASS / 0 fail browser at `2b60ce97`, at pristine `1bc5fc2a4526c7d732bc21e1293e3d43582b4c08`, and pre-commit on this tree. No CI checks or deployments are declared for this delivery; zero Actions runs are recorded as absent, not success (GAP-006 open).
The observations below retain their original source and authority identities. They do not qualify later updates.

### Earlier source observations

Daily review: 2026-09-25. Inspected source: [`8c5dafd3cb5232297001e058b6b1dd2a05a215c9`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/8c5dafd3cb5232297001e058b6b1dd2a05a215c9).

Audit date: 2026-09-24. Reviewed source: [`d75412d12e27d8a338f635ed6a05e0e5c5b2d57e`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e).
Local HEAD matched remote main. This audit changes documentation only. No effect, implementation, or parity checkpoint changed.
The experimental editor supports Polymorphic DSL. It does not preserve ordinary Hydra JavaScript syntax. [README](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e/README.md).

Current upstream authority: `823bbff1d17061d231cb0c7f5bf4527b3344abab`.
Published authority: `1.0.176`, source `c9ee8a049b2b63cd300da67c01ee40baf29dc288`.
The rolling `/1` core matched the immutable `1.0.176` core byte-for-byte during this audit.
Its SHA-256 is `2460ed60f8002c893f4f6c99a119be5d4ab1fafa6055cb94d95f887ff12a2952`.
The current source definitions and published manifest each contain 210 effects. Equal counts do not prove equal behavior.
The browser evidence covers the published authority. It does not qualify the newer upstream revision.
[Authority identity](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/authority-tag.json). [Coverage inventory](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/coverage-inventory.json).

The editor loads a rolling engine URL. Its companion extension is a tracked bundle without an immutable companion revision declaration.
[Runtime source](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e/src/lib/noisemaker-runtime.mjs). [Tracked source hashes](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/source-hashes.json).
No GitHub release or exact-source Actions run was returned. The served demo records source `626f37c21170927e7c24429ca2c8f31cf38905ec`.
[Release evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/remote-releases.json). [CI evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/remote-ci.json). [Served provenance](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/deployment-meta.data).

Only this report and `docs/COMPATIBILITY.md` require publication. No Actions workflow exists in the reviewed tree.
A push activates the existing repository notification webhook. No workflow dispatch, release, or deployment belongs to this audit.
The shared result records the publication commit and remote document hashes. [Publication evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/result.json).

## 2. Completion claims

| Claim ID | Claim source | Claimed scope | Finding | Evidence |
|---|---|---|---|---|
| CLAIM-001 | [README](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e/README.md) | Editor evaluation, mutation, lifecycle, browser compilation | supported | 39 unit tests and seven browser DOM checks pass. This does not establish pixel parity. |
| CLAIM-002 | [README](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e/README.md) | Installation and useful browser editing | partial | Isolated build, keyboard evaluation, scale changes, diagnostics, recovery, and URL restoration pass. Accessibility and broader workflows remain open. |
| CLAIM-003 | [README](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e/README.md) | Hydra ecosystem integration | partial | Polymorphic noise produces output. Official `osc().out()` syntax fails because the compiler requires a search directive. |
| CLAIM-004 | [README](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e/README.md) | Release readiness | unverified | README claims an experimental demonstration. Full parity, notices, dependency review, versions, and upgrades remain unqualified. |
| CLAIM-005 | [Exact-source Actions](https://github.com/noisefactorllc/noisemaker-for-hydra/actions?query=head_sha%3Ad75412d12e27d8a338f635ed6a05e0e5c5b2d57e) | Automated qualification | unverified | Zero exact-source runs. No workflow or rendered comparison gate exists in this repository. |
| CLAIM-006 | [README](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/d75412d12e27d8a338f635ed6a05e0e5c5b2d57e/README.md) | WebGPU render target for mixed programs | contradicted | Hydra solid fails under WGSL with `ERR_NO_WGSL_SOURCE`. WebGL2 solid passes. GAP-004. |

## 3. Methods and evidence

Review CI boundary: No workflow run exists at the inspected source SHA. A passing export dispatch does not qualify rendered parity. Current complete-render enforcement remains an open verification requirement. [Exact-source responses and workflows](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/noisemaker-for-hydra-remote-evidence.json).

The current-source browser probe independently reproduces ERR_NO_WGSL_SOURCE for Hydra solid after switching to WGSL. [Probe](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/hydra-wgsl-current.json).

### Daily review, 2026-09-25

48 unit tests and seven browser editor checks pass. The browser checks do not compare pixels. The retained WebGPU failure and two bounded WebGL2 comparisons remain relevant, but do not qualify all current authority inputs or the Hydra API. GAP-001, GAP-004, and the missing rendered CI gate remain open. [Raw evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/hydra-browser-tests.json).
The review checked source changes, worker evidence, source-bound CI where present, and current served inventories. Full installed-host and platform qualification remains incomplete.

Environment: macOS 26.5, arm64, Node 26.10.0, npm 11.19.1, Chrome 153.0.8010.53.
Chrome reported WebGL through `WebKit WebGL`. This identifier does not qualify a physical GPU matrix.
The audit used an isolated source archive and served only its built distribution on loopback.
Installation used `--bin-links=false --ignore-scripts` to avoid symbolic links and lifecycle side effects.
These installation flags differ from the literal README command. Unmodified installation remains unverified.

| Command or entry point | Exit | Measured result |
|---|---|---|
| `npm run build` | 0 | Checkout build passed. Generated tracked output was restored from verified pre-run bytes. |
| `node --test test/*.test.mjs` | 0 | 39 passed, zero failed, zero skipped. |
| `PORT=5197 node scripts/test.mjs` | 0 | Seven DOM/compiler cases passed. No pixels were compared. |
| `npm ci --bin-links=false --ignore-scripts` | 0 | Isolated dependency installation passed. |
| `node node_modules/vite/bin/vite.js build` | 0 | All 28 tracked distribution files match the isolated build. |
| `node browser-probe.cjs` | 0 | Five renders, expected invalid-input rejection, recovery, saved URL restoration, and two exact comparisons. |
| `node host-probe-wgsl.cjs` | 0 | Probe completed. WGSL case failed. Served WebGL output changes. Renderer disposal stops execution and clears its pipeline. |
| `npm audit --omit=dev --json` | 1 | 16 production dependency advisories: two low, six moderate, seven high, one critical. Reachability was not assessed. |

[Build](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/build.json), [unit tests](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/unit.json), [browser suite](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/browser.json), [installation](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/install.json), [distribution reproduction](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/distribution-reproduction.json).
[Browser probe](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/browser-probe.json), [host probe](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/host-probe-wgsl.json), [dependency report](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/production-audit.json).
The probe source files and RGBA outputs remain beside these results. No test or fixture entered the repository.

The README noise example produced non-flat pixels. Changing scale from 5 to 8 changed the output hash.
An unknown effect produced an effect name and source location. Correcting the program produced opaque red at all 768 pixels.
Control+Shift+Enter evaluated programs and updated their saved URLs. Reload restored the final program without a shown error.
Two 32×24 RGBA8 comparisons matched the immutable reference exactly at normalized time zero: `core-noise` and `core-chain`.
Each comparison covered 3,072 channels. Maximum error and unequal channels were both zero. No tolerance was applied.
These default probes do not establish parameter, external-input, seed, temporal, or complete effect coverage.

The first two probe attempts had measurement errors. They remain retained and do not count as product failures or passes.
One used the wrong backend accessor. Another omitted the readback data field and loaded two custom-element registries into one page.
The corrected run used the actual readback data and a separate reference page. [Attempt 1](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/browser-probe-attempt1.json). [Attempt 2](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/browser-probe-attempt2.json).
The initial served `o0` sample followed a resize and was not the shown `o1` surface. It is not a rendering defect.
The follow-up sampled shown `o1` twice at 480×320. Both samples contained 256 byte values and different hashes.
The served metadata identifies an older source. This observation does not qualify the reviewed source as deployed.

Official ecosystem reference: [Hydra getting started](https://hydra.ojack.xyz/docs/docs/learning/getting-started/), accessed 2026-09-24, page dated 2025-06-10.
It documents JavaScript sketches, keyboard evaluation, saved URLs, and external sources.
The fork's README identifies the DSL change. Its in-app help still describes ordinary JavaScript Hydra behavior.
External media, live audio/MIDI, browser versions, other operating systems, upgrades, and long-running resource behavior remain unverified.
Removal requires stopping the local server and removing the isolated consumer. No global package or user project changed.

## 4. Known gaps

P1 denotes a major correctness or release blocker. P2 denotes incomplete coverage or integration. P3 denotes documentation inconsistency.
No prior gap closed during this audit.

### GAP-001: current authority and parity qualification

- Status: open. Priority: P1. Category: verification.
- Affected scope: Runtime, companion bundle, authority inputs, and all rendered fixtures.
- Expected behavior: Every applicable case has source-bound reference-versus-port output without missing or skipped cases.
- Observed behavior: The complete rendered gate now exists in the tree (`scripts/parity-gate.mjs` with `test/parity-gate/authority.html` and `test/parity-gate/port.html`, matrix in `test/fixtures/parity-cases.json` generated from upstream `2f47612c29045c1b91af94887a8ff20106e980ef`, fixture SHA-256 `5b43d8a2243ad55f0b4e668909a1ce0d27ca86f4423ea47ebf8d37fd15202a06`). Executed run 2026-09-26: all 210 effect IDs and 1254 of 1260 case comparisons executed, 1254 exact, 0 tolerance-level, 0 failed, 6 missing — the six `filter/octaveWarp` frames on the authority side only, where the pinned `1.0.182` engine fails on the second render of the program under SwiftShader (`ERR_SHADER_COMPILE` with an empty ANGLE info log, reproduced across eight fresh-chromium attempts; the port rendered every frame). The gate exits nonzero and records `pass=false`; GAP-001 is not closed. The gate also verified the pinned authority identities in-run and recorded that the rolling `/1` engine (`31b766091125742665bee4c5c8392048eaaa786748cc9570b1c94460029fbded`) has drifted ahead of the pinned `1.0.182` bundle.
- Evidence: in-repo raw execution log `parity-evidence/gate-run.log` (verbatim Chromium launch commands, versions, console output, exit codes), per-case reports `parity-evidence/slice-000.json` through `parity-evidence/slice-209.json`, merged denominator and failures in `parity-evidence/parity-gate-report.json`; report sections in `docs/COMPATIBILITY.md` section 3 ("Rendered parity gate, 2026-09-26"). Historical audit evidence: [coverage-inventory.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/coverage-inventory.json) and section 3.
- Next action: Close the remaining 6 comparisons once a pinned-authority engine revision that renders `filter/octaveWarp` beyond its first render is available (a newer immutable published engine or a host whose GL stack compiles the failing program), then rerun the gate to `pass=true`.
- Dependencies: Identify effect parameters, defines, external inputs, seeds, times, sizes, chains, and stateful frames. (Done: the matrix covers defaults and varied programs with define-backed kwargs, explicit surface bindings, chains, three sizes/times; the one remaining dependency is the pinned-authority engine limitation above.)
- Acceptance criteria: Execute every inventoried case. Report exact equality separately from any existing numerical contract. Preserve failures and missing cases.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-26 (rendered gate executed; 1254/1260 exact; 6 missing preserved; no closure claimed).

### GAP-002: installed developer workflow qualification

- Status: open. Priority: P2. Category: usability.
- Affected scope: Browser editing, help, host workflows, lifecycle, and platform versions.
- Expected behavior: Developers can understand the DSL, produce output, recover, integrate inputs, and preserve saved work.
- Observed behavior: Implementation commit of 2026-09-26: the in-app help (`src/stores/text-elements.js`) now teaches Polymorphic DSL — search directive, `.write(oN)`, `render(oN)`, Ctrl+Shift+Enter, URL-preserved programs — and no longer claims camera/screen/stream/audio inputs or cross-browser streaming, which the fork does not provide (`getUserMedia`/`mediaDevices` are absent from the built bundle and the companion engine). The editor placeholder was corrected from `osc().out()` to a search-directive example. Supported platforms are defined (COMPATIBILITY.md, "Installed developer workflow checks, 2026-09-26"): Chromium-based desktop browsers with WebGL2, verified Chromium 154.0.8037.57 on Debian GNU/Linux 12 with Node v26.5.1, npm 11.17.0; the retained Chrome 153 workflow is preserved. Acceptance checks executed at 79 unit tests / 11 browser cases (0 failures, both exit 0; raw logs in `workflow-evidence/`): both README documented examples pass through the public `?code=` URL control; invalid input surfaces `Unknown effect` with a `log-error` diagnostic; recovery through `repl.eval` compiles a corrected program after a failed one (unit) with retained rendered recovery evidence; URL restoration and removal are covered by new gallery tests (`saveLocally` stores the program in the URL, `clear()` removes the `code` parameter); resource cleanup is covered by extended lifecycle source checks and the retained probe evidence that renderer disposal stops execution and clears its pipeline; a 640×480 resize case passes. External media is not supported by the DSL and is now documented as such rather than verified; upgrades and non-listed browsers/operating systems remain unverified.
- Evidence: `workflow-evidence/unit.log`, `workflow-evidence/browser.log`, `workflow-evidence/versions.txt`, `workflow-evidence/source-hashes.txt`, `workflow-evidence/commands.txt`, `workflow-evidence/exit-codes.txt` (in-repo raw execution logs); report section "Installed developer workflow checks, 2026-09-26" in `docs/COMPATIBILITY.md`; retained prior evidence [host-probe-wgsl.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/host-probe-wgsl.json) and section 3.
- Next action: Verify saved-sketch upgrades and non-listed browsers or operating systems, or treat them as permanently out of scope by extending the supported-platforms record; media input remains unsupported and documented as such.
- Dependencies: Supported browser versions and operating systems are defined (COMPATIBILITY.md, 2026-09-26); the successful Chrome workflow is retained.
- Acceptance criteria: Pass documented examples through public controls. Check invalid input, recovery, URL restoration, input removal, and resource cleanup.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-26 (guidance corrected; examples, invalid input, recovery, URL restoration and removal, resource cleanup, and resize executed; no closure claimed — upgrades and non-listed platforms remain open).

### GAP-003: distribution and release qualification

- Status: open. Priority: P2. Category: release.
- Affected scope: Tracked distribution, served deployment, dependencies, notices, and upgrades.
- Expected behavior: The identified artifact contains required notices and supports its documented installation and lifecycle.
- Observed behavior: The isolated build reproduces 28 tracked files. Dist contains no license file. Sixteen production dependency advisories require assessment. Served source differs.
- Evidence: [distribution-reproduction.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/distribution-reproduction.json) and section 3.
- Next action: Check notices and dependency reachability. Bind served bytes to source. Qualify installation, upgrade, and removal.
- Dependencies: Preserve AGPL attribution and bundled dependency notices. Resolve GAP-001 and GAP-004 before release qualification.
- Acceptance criteria: Check artifact hashes, required notices, dependency decisions, exact-source checks, supported installation, and saved-sketch upgrades.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-24. No closure claimed.

### GAP-004: Hydra effects fail under WebGPU

- Status: open. Priority: P1. Category: implementation.
- Affected scope: Hydra namespace shaders and advertised WebGPU support.
- Expected behavior: A supported Hydra solid program renders under the advertised backend.
- Observed behavior: Switching to WGSL and compiling Hydra solid throws ERR_NO_WGSL_SOURCE for node_0_solid. WebGL2 renders opaque red.
- Evidence: [host-probe-wgsl.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/host-probe-wgsl.json) and section 3.
- Next action: Implement the missing supported backend behavior or correct the explicit support contract in the implementation job.
- Dependencies: Keep unsupported Hydra cases in the parity denominator. Do not advance the current parity checkpoint.
- Acceptance criteria: Run Hydra solid and every supported Hydra effect under WebGL2 and WebGPU. Preserve shader failures and compare output.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-24. No closure claimed.

### GAP-005: toolbar controls lack keyboard and accessibility semantics

- Status: open. Priority: P2. Category: usability.
- Affected scope: Run, clear, extension, shuffle, mutation, and help controls.
- Expected behavior: Each control exposes a name and keyboard operation to browser accessibility tools.
- Observed behavior: Six clickable icons have tabindex -1, aria-hidden true, and no role. The editor textarea has no aria-label.
- Evidence: [browser-probe.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/browser-probe.json) and section 3.
- Next action: Replace inaccessible controls through the implementation job. Preserve existing evaluation shortcuts.
- Dependencies: Keep destructive clear behavior testable without changing user projects.
- Acceptance criteria: Reach each control by keyboard. Check names, roles, focus, activation, editor labeling, and visible diagnostics.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-24. No closure claimed.

### GAP-006: source updates lack a rendered CI gate

- Status: open. Priority: P1. Category: release.
- Affected scope: Default-branch source updates and distribution qualification.
- Expected behavior: Existing CI enforces exact-source rendered parity before a source update qualifies for release.
- Observed behavior: A source-bound CI workflow now exists in the tree (`.github/workflows/tests.yml`): on every push to main and pull request it installs dependencies without binary links or lifecycle scripts (`npm ci --bin-links=false --ignore-scripts`), runs the unit and compiler suite (`node --test test/*.test.mjs`), builds the distribution (`node node_modules/vite/bin/vite.js build`), and executes the 11-case headless browser editor suite (`scripts/test.mjs` with a Chrome stable install from `@puppeteer/browsers`). The workflow does not execute the rendered parity gate, does not compare pixels, and does not reject missing fixtures, skipped cases, or rendered mismatches, so the required exact-source rendered-parity enforcement demonstrated for GAP-006 is not yet met and the gap remains open. Earlier state: no workflow existed in the reviewed tree and exact-source Actions returned zero runs.
- Evidence: `.github/workflows/tests.yml` (tracked source); executed local equivalents at this record commit in `workflow-evidence/` (`unit.log` 79 pass / 0 fail, exit 0; `browser.log` 11 PASS / 0 fail, exit 0); [remote-ci.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/remote-ci.json) for the earlier zero-run state and section 3.
- Next action: Demonstrate the exact-source run executing the rendered parity gate (all 1260 comparisons) and rejecting a missing fixture, skipped case, or rendered mismatch; resolve GAP-001's 6 missing authority frames first.
- Dependencies: Resolve authority and fixture requirements in GAP-001. Preserve normal publication protections.
- Acceptance criteria: Demonstrate an exact-source run that executes all cases and rejects a missing fixture, skipped case, or rendered mismatch.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-26 (source-bound unit/build/browser CI workflow added and locally executed; rendered enforcement remains open).

## 5. Ordered next actions

Current first action: At an immutable engine revision, run the same Hydra program in WebGL2 and WebGPU and retain output or ERR_NO_WGSL_SOURCE. Require equal useful output before closing GAP-004. Then enumerate the expected Hydra API, Noisemaker effects, and parameter cases. Exercise keyboard controls and error recovery separately.
Subsequent historical actions remain dependent on that evidence. No implementation is authorized by this audit.

1. Resolve immutable authority identities and the missing rendered inventory for GAP-001.
2. Reproduce `ERR_NO_WGSL_SOURCE` and resolve the supported backend contract for GAP-004.
3. Establish the exact-source rendered CI gate for GAP-006 through the implementation job.
4. Qualify developer workflows and correct help and accessibility for GAP-002 and GAP-005.
5. Check distribution notices, dependencies, served provenance, and upgrades for GAP-003.

Implementation remains with the separate job. This audit does not port effects or advance the parity checkpoint.

## 6. Pass history

2026-09-25 daily review at `8c5dafd3cb5232297001e058b6b1dd2a05a215c9`: source freshness and bounded evidence reviewed. Open qualification limits retained. [Retained review evidence](/Users/alex/.codex/automations/noisemaker-port-completion-audit/review-20260925-053200/hydra-browser-tests.json). No new closure claimed.

| Date | Source SHA | Changes | Tested scope | Remaining limits |
|---|---|---|---|---|
| 2026-09-24, initial register | `2691007f48acc5342c6a10478373094fff6fd697` | Created register and README link. No closures. | 36 unit tests passed. | Browser, parity, distribution, and platform qualification remained open. |
| 2026-09-24, selected audit | `d75412d12e27d8a338f635ed6a05e0e5c5b2d57e` | Updated both reports. Added GAP-004 through GAP-006. No closures. | 39 unit tests, seven browser checks, installed workflows, two exact reference comparisons, actual served output. | Full parity, current upstream, WebGPU Hydra, accessibility, release requirements, and other platforms remain unqualified. |
| 2026-09-26, GAP-002 workflow qualification | this candidate (implementation and record commit) | No closure claimed. GAP-002 acceptance checks executed; GAP-001, GAP-004, GAP-005, GAP-006, GAP-003 unchanged. | 79 unit tests, 11 browser checks (both README examples, invalid-input diagnostic, 640×480 resize, seven retained cases), gallery URL save/remove/restore unit tests, extended lifecycle cleanup checks. Raw logs in `workflow-evidence/`. | External media unsupported (documented), upgrades and non-listed browsers/operating systems unverified, pixels not compared, rendered parity gate unchanged (6 missing authority frames). |
| 2026-09-26, CI boundary addition | this candidate (workflow, vite launch path, and record commit) | No closure claimed. GAP-006 remains open: the workflow runs unit, build, and browser checks but not the rendered parity gate. | Same local suites as the prior row, regenerated at this commit (79/79 unit, 11/11 browser, build exit 0); `scripts/test.mjs` now launches vite through `node node_modules/vite/bin/vite.js` under the no-symbolic-links install contract. | Exact-source rendered-parity enforcement, missing-fixture/skipped-case rejection, and the GAP-001 authority frames remain open. |

[Initial register and evidence](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/ea7795f20b4fcb157f6acabbe02935612babc32a/docs/COMPLETION_GAPS.md).
Run ID: `audit-20260924-090235`. [Result and publication checkpoint](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/result.json).
