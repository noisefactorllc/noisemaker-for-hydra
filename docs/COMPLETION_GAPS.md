# noisemaker-for-hydra: completion gaps

Current measured support: [compatibility report](COMPATIBILITY.md).

## 1. Scope and source revisions

Daily review: 2026-09-25 (vendor sync audit). Current inspected source: [`2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9`](https://github.com/noisefactorllc/noisemaker-for-hydra/commit/2b60ce97ddbfcf5e40e3cfaff1719a45ee9786d9).
Full rendered parity remains **unverified**. No release approval or new closure follows from this review.
Current upstream discovery: `2f47612c29045c1b91af94887a8ff20106e980ef` (release tag `v1.0.182`). Published Noisemaker authority: `1.0.182`, source `2f47612c29045c1b91af94887a8ff20106e980ef`, 210 effect IDs (counted from `shaders/effects/manifest.json` at that commit).
Sync audit: the force-pushed range start `fca611fd8f91424661d4e531d39313d24ea21134` was superseded; the audited shader range `13a8a0491dcf9aeb8eb2db5518682f58a6a0ec0e..2f47612c29045c1b91af94887a8ff20106e980ef` contains three `shaders/` commits (`a021a283`, `62eb56fa`, `2f47612c`). `shaders/effects/` is unchanged at the range end, so effect-catalog parity requires no additions, removals, or parameter-contract updates. The runtime texture-policy changes reach this port through the published engine (`src/lib/noisemaker-runtime.mjs:1`); the new texture-policy validation diagnostics are covered by four `repl-v2` tests in commit 2b60ce97. GAP-001 (full parity qualification, unpinned rolling `/1` engine URL) and the WebGPU GAP-004 remain open; no closure follows from this sync.
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
- Observed behavior: No complete rendered suite exists. All 210 current effect IDs lack a full current-authority fixture qualification. Two published-authority probes pass.
- Evidence: [coverage-inventory.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/coverage-inventory.json) and section 3.
- Next action: Add the complete rendered gate in the implementation job. Pin engine and companion authority identities.
- Dependencies: Identify effect parameters, defines, external inputs, seeds, times, sizes, chains, and stateful frames.
- Acceptance criteria: Execute every inventoried case. Report exact equality separately from any existing numerical contract. Preserve failures and missing cases.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-24. No closure claimed.

### GAP-002: installed developer workflow qualification

- Status: open. Priority: P2. Category: usability.
- Affected scope: Browser editing, help, host workflows, lifecycle, and platform versions.
- Expected behavior: Developers can understand the DSL, produce output, recover, integrate inputs, and preserve saved work.
- Observed behavior: Bounded editing and recovery pass. In-app JavaScript guidance conflicts with the DSL. External media, upgrades, and other platforms remain unverified.
- Evidence: [host-probe-wgsl.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/host-probe-wgsl.json) and section 3.
- Next action: Correct in-app guidance through the implementation job. Exercise media input, saved work, resize, and lifecycle.
- Dependencies: Define supported browser versions and operating systems. Retain the successful Chrome workflow.
- Acceptance criteria: Pass documented examples through public controls. Check invalid input, recovery, URL restoration, input removal, and resource cleanup.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-24. No closure claimed.

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
- Observed behavior: No workflow exists in the reviewed tree. Exact-source Actions returns zero runs. Browser tests inspect DOM text only.
- Evidence: [remote-ci.json](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/remote-ci.json) and section 3.
- Next action: Add source-bound compiler and rendered checks through the implementation job and existing CI systems.
- Dependencies: Resolve authority and fixture requirements in GAP-001. Preserve normal publication protections.
- Acceptance criteria: Demonstrate an exact-source run that executes all cases and rejects a missing fixture, skipped case, or rendered mismatch.
- Required checks: Preserve raw commands, versions, source hashes, full denominators, output, and exit codes for the acceptance checks.
- Last verification: 2026-09-24. No closure claimed.

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

[Initial register and evidence](https://github.com/noisefactorllc/noisemaker-for-hydra/blob/ea7795f20b4fcb157f6acabbe02935612babc32a/docs/COMPLETION_GAPS.md).
Run ID: `audit-20260924-090235`. [Result and publication checkpoint](/Users/alex/.codex/automations/noisemaker-port-completion-audit/evidence-audit-20260924-090235/result.json).
