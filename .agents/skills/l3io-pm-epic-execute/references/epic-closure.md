# Epic Closure

Communicate all responses in `{communication_language}`.

All sprints complete. Execute closure phases in the order below. All outputs go to `{epic_closure_dir}`.

**Orchestrator role:** Traffic controller. Hold only status-line summaries — never full file contents. Pass story file paths to subagents; build `{all_sprint_story_files}` (paths only) by listing all story files under `{epic_root_dir}/sprint-*/stories/`.

**Subagent invocation:** Agent tool preferred (self-contained prompt, no conversation history forwarded). Fallback: `claude --print`. Every subagent must end with: `DONE — [metrics] | BLOCKED: [reason] | FAILED: [reason]`

**Deferred cleanup:** When `{deferred_file_cleanup}` is `true`, append the following instruction to every subagent prompt you spawn during epic closure:
```
DEFERRED CLEANUP ACTIVE: Do not execute rm commands directly. Instead, append each rm command as its own line to {epic_cleanup_script} (create with #!/bin/bash header if it does not exist). Continue all other work normally.
```
Note: each sprint's cleanup script was already executed at its own sign-off. This file collects only epic-level closure phase deletions.

Announce: "All {total_sprint_count} sprint(s) complete. Beginning epic-level closure."

---

## Step 3 — Epic Retrospective

This step runs first and must complete before the parallel batch in Step 4.

Spawn subagent:
```
Load config from: {config_file}
Load project context from: {context_file} (if it exists)
Sprint status file: {status_active}
Target epic: {target_epic}
Sprint summaries (cross-sprint context): {sprint_summaries}
Invoke skill: bmad-retrospective
Execute a full epic-level retrospective for Epic {target_epic} — cross-sprint learnings, not just the last sprint.
Write to: {epic_closure_dir}/epic-{target_epic_padded}-retro-{date}.md
Print when done: DONE — Retro: [path], Action items: N | BLOCKED: [reason]
```

Record `{epic_retro_file}` and `{epic_retro_action_count}`. Surface any grave concerns directly to `{user_name}`.

Update epic retrospective to `done` in `{status_active}`.

---

## Step 4 — Parallel Closure Batch

Before launching the parallel batch, verify: no shared output file paths, no concurrent `{status_active}` writes, no unresolved blocker from Step 3. If any check is uncertain, run sequentially.

Spawn the following subagents in parallel (up to `effective_parallel_subagents` = min(`{max_parallel_subagents}`, 4)):

### 4a — Clean Release Review
```
Load config from: {config_file}
Load project context from: {context_file} (if it exists)
All story files for Epic {target_epic}: {all_sprint_story_files}
No skill to invoke — perform the following analysis directly:

CLEAN RELEASE REVIEW — Epic {target_epic} (full solution scope)

For each story across all sprints, read its acceptance criteria and File List. Assess across the full epic:
1. Does the implementation cover exactly what the stories specified, with no added scope?
2. Are there YAGNI violations — code or features not required by any acceptance criterion?
3. Are there premature abstractions, over-engineered solutions, or unnecessary complexity?
4. Are there simplification opportunities that would not reduce functionality?

Write to: {epic_closure_dir}/epic-{target_epic_padded}-clean-release-{date}.md
Print when done: DONE — Findings: N (Critical: N, High: N) | BLOCKED: [reason]
```

### 4b — Adversarial Review
```
Load config from: {config_file}
Load project context from: {context_file} (if it exists)
All story files for Epic {target_epic}: {all_sprint_story_files}
Epic retrospective: {epic_retro_file}
Invoke skill: bmad-review-adversarial-general
Content to review: all code changes across the entire epic (collect from story File List sections).
Review as a cohesive product increment — look for systemic issues only visible across all stories together: inter-story interactions, data flow across features, consistency of approach, patterns that only emerge at scale.
Also consider the epic retrospective at {epic_retro_file}.
Write to: {epic_closure_dir}/epic-{target_epic_padded}-adversarial-{date}.md
Print when done: DONE — Critical: N, High: N, Medium: N, Low: N | BLOCKED: [reason]
```

### 4c — Red-Team Review
Check if `l3io-sec-agent-redteam` is installed (look for `.claude/skills/l3io-sec-agent-redteam/SKILL.md` or `.claude/commands/l3io-sec-agent-redteam.md`). If absent, skip 4c and record the skip.

If present:
```
Load config from: {config_file}
Load project context from: {context_file} (if it exists)
Architecture file: {arch_file} (load fully)
All story files for Epic {target_epic}: {all_sprint_story_files}
Epic retrospective: {epic_retro_file}
Invoke skill: l3io-sec-agent-redteam
Scope: epic
Epic artifact path: {epic_root_dir}
Focus on: (1) new attack surface introduced by the entire epic, (2) security properties spanning multiple stories — auth model, data ownership, trust boundaries, (3) failure modes that only emerge when all epic features interact.
Write to: {epic_closure_dir}/epic-{target_epic_padded}-redteam-{date}.md
Print when done: DONE — Critical: N, High: N, Medium: N, Low: N | BLOCKED: [reason]
```

### 4d — UX Review (conditional)
Search `{planning_artifacts}` for UX spec files matching `*ux*`, `*design*`, or similar (`{ux_specs_path}`). If none found, auto-SKIP this step — announce to `{user_name}` (informational): "Epic UX Review: skipped — no UX specs found under {planning_artifacts}." and omit 4d.

If proceeding:
```
Load config from: {config_file}
Load project context from: {context_file} (if it exists)
All story files for Epic {target_epic}: {all_sprint_story_files}
[If specs found] UX specs: {ux_specs_path} (load fully)
Invoke skill: bmad-ux-review (or equivalent UX evaluation framework)
Scope: all user-facing changes across the entire epic.
[If specs found] Review against UX specs: all specified user flows and interactions, design patterns, accessibility, cross-feature consistency, deviations from spec.
[If no specs] Apply standard UX principles at epic scale: WCAG 2.1 AA, interaction consistency across all sprint stories, mobile responsiveness if applicable, error messaging consistency, cross-feature UX patterns.
Write to: {epic_closure_dir}/epic-{target_epic_padded}-ux-review-{date}.md
Print when done: DONE — Critical: N, High: N, Medium: N, Low: N | BLOCKED: [reason]
```

Wait for all parallel subagents in Step 4 to complete. Record severity counts from each status line:
- `{clr_critical}`, `{clr_high}` from clean release
- `{adv_critical}`, `{adv_high}`, `{adv_medium}` from adversarial
- `{rt_critical}`, `{rt_high}`, `{rt_medium}` from red team (0 if skipped)
- `{ux_critical}`, `{ux_high}`, `{ux_medium}` from UX (0 if skipped)

---

## Step 5 — Architecture Drift Analysis

Spawn subagent for inline solution-scoped drift analysis:
```
Load config from: {config_file}
Load project context from: {context_file} (if it exists)
Architecture specification: {arch_file} (load fully)
All story files for Epic {target_epic}: {all_sprint_story_files}
No skill to invoke — perform the following analysis directly:

ARCHITECTURE DRIFT ANALYSIS — Epic {target_epic} (full solution scope)

Compare the architecture specification against what was implemented across all sprints. Check five dimensions:
1. DATA MODEL DRIFT — specified entities, fields, types, relationships vs. source code
2. API CONTRACT DRIFT — specified endpoints, methods, request/response shapes vs. implemented routes
3. COMPONENT ARCHITECTURE DRIFT — specified module/service boundaries vs. actual file/module structure
4. NFR DRIFT — performance targets, security controls, observability requirements specified vs. implemented
5. TECHNOLOGY & PATTERN DRIFT — specified libraries, frameworks, patterns vs. actually used

Categorize each finding:
- INTENTIONAL: documented rationale in a story Dev Agent Record — acceptable
- UNDOCUMENTED: deviation with no documented rationale — this is an issue requiring fix or documentation
- SPEC GAP: spec was silent, implementation made a choice — flag for architecture doc update
- MISSING: specified but not yet implemented

Write to: {epic_closure_dir}/epic-{target_epic_padded}-arch-drift-{date}.md
Print when done: DONE — Undocumented: N, Missing: N, Spec gaps: N | BLOCKED: [reason]
```

Record `{drift_undoc}`, `{drift_missing}`, `{drift_gaps}`, `{drift_output_path}`.

---

## Step 6 — Functional Completeness Review

Spawn subagent for inline PRD coverage analysis:
```
Load config from: {config_file}
Load project context from: {context_file} (if it exists)
PRD file: {prd_file} (load fully)
Epics file: {epics_file} — load Epic {target_epic} section only
All story files for Epic {target_epic}: {all_sprint_story_files}
No skill to invoke — perform the following analysis directly:

FUNCTIONAL COMPLETENESS REVIEW — Epic {target_epic}

For each acceptance criterion in Epic {target_epic}:
- Identify which story implements it
- Check that story's Dev Agent Record confirms implementation
- Check that a test covers it
- Flag if: not in any story, story done but AC unverified, or no test coverage

For each user-facing feature described for Epic {target_epic} in the PRD:
- Identify implementing story/stories
- Verify story is done
- Check implementation matches described behavior
- Flag discrepancies

Check cross-cutting concerns specified at epic level in the PRD: consistent UX patterns, shared data model elements, error handling consistency.

Write to: {epic_closure_dir}/epic-{target_epic_padded}-functional-completeness-{date}.md
Print when done: DONE — ACs checked: N, Covered: N, Gaps: N, PRD discrepancies: N | BLOCKED: [reason]
```

Record `{func_ac_gaps}`, `{func_discrepancies}`, `{func_output_path}`.

---

## Step 7 — Issue Triage and Resolution

Summarize all closure findings from recorded status lines:
```
EPIC CLOSURE FINDINGS — Epic {target_epic}: {epic_title}
Clean Release:          Critical {clr_critical}, High {clr_high}
Adversarial:            Critical {adv_critical}, High {adv_high}, Medium {adv_medium}
Red Team:               Critical {rt_critical}, High {rt_high}, Medium {rt_medium}
UX Review:              Critical {ux_critical}, High {ux_high}, Medium {ux_medium}
Architecture Drift:     {drift_undoc} undocumented, {drift_missing} missing, {drift_gaps} spec gaps
Functional Completeness:{func_ac_gaps} AC gaps, {func_discrepancies} PRD discrepancies
```

If any Critical, High, or Medium counts are non-zero, or `drift_undoc` > 0, or `func_ac_gaps` > 0, spawn a detail-read subagent:
```
Read the closure review files in {epic_closure_dir} created today.
List all Critical, High, and Medium findings: [SEVERITY] [SOURCE] [Title] — [one-sentence description]
List Low findings: title only.
List undocumented drift findings: title only.
List functional completeness gaps: AC or feature name.
List spec gap findings: title only.
Print the list. No other output.
```

**Auto-classification (no per-finding prompt).** Bind `{fix_now_items}`, `{doc_update_items}`, and `{defer_items}` programmatically:
- Critical → `{fix_now_items}` (must resolve before epic closes)
- High → `{fix_now_items}` (must resolve before epic closes)
- Medium → `{fix_now_items}` (must resolve before epic closes — same quality bar as Critical/High)
- Low → `{defer_items}` (create backlog story, do not fix this epic)
- Undocumented drift → `{fix_now_items}` (fix code; if implementation is intentional, document rationale in the affected story's Dev Agent Record instead)
- Functional AC gaps → `{fix_now_items}` (implement the missing AC; ship-blocker)
- Spec gaps → `{doc_update_items}` (update architecture or PRD doc, no code change)

Announce the auto-classification to `{user_name}` (informational, no confirmation requested):
```
Epic Orchestrator: Auto-triage — Fix now: {fix_now_count} (Critical+High+Medium+Drift+AC-gaps). Doc updates: {doc_update_count} (spec gaps). Defer to backlog: {defer_count} (Low). No user decision needed unless the closure fix cap is hit.
```

### Closure Fix Loop

Maintain `{closure_fix_iteration}` = 0. Iterate the fix-and-verify cycle below until `{fix_now_items}` is empty OR `{closure_fix_iteration}` ≥ 10.

For each batch (per iteration):
1. For each item in `{fix_now_items}`:
   a. Spawn fix subagent: invoke `bmad-create-story` if a new story is needed; otherwise invoke `bmad-dev-story` with the issue context
   b. Spawn verification subagent: invoke `bmad-qa-generate-e2e-tests` targeting the fix
   c. Write verification evidence to: `{epic_test_dir}/epic-{target_epic_padded}-fix-verification-{date}.md`
   d. If verification passes, remove from `{fix_now_items}`. If it fails, leave in the list for the next iteration.
2. Increment `{closure_fix_iteration}`.

For each item in `{doc_update_items}` (process once, not per iteration):
1. Spawn subagent to update the architecture or PRD document (store new files under `{planning_epic_dir}`)
2. Confirm from subagent status line

For each item in `{defer_items}` (process once, not per iteration):
1. Spawn `bmad-create-story` to create a backlog story
2. Record the story key in `{deferred_story_keys}`
3. Append to the consolidated `backlog:` list at the top level of `{status_backlog}` (create the list if absent), tagged with `epic`/`sprint` per `references/status-files.md` (use `sprint: ''` for an epic-level deferral):
   ```yaml
   - key: {new_story_key}
     epic: '{target_epic_padded}'
     sprint: ''
     title: {issue_title}
     source: {review_phase} ({finding_id})   # e.g. adversarial (ADV-L-01), red-team (RT-L-03), ux-review (UX-L02), arch-drift (ARCH-DM-01)
     severity: Low
     status: backlog
     description: {one-sentence description of the issue}
   ```

**Only halt and prompt `{user_name}` if `{closure_fix_iteration}` ≥ 10 and `{fix_now_items}` is non-empty:**
```
Epic Orchestrator: HALT — Closure fix loop reached the 10-iteration cap.
Unresolved (Critical/High/Medium/Drift/AC-gaps): {fix_now_items}
Epic cannot close until these are fixed or explicitly accepted.
Options:
1. Continue fixing (provide additional context; counter resets)
     Est: ~15–35 min per remaining item, ~80–150K tokens per item
2. Accept risk — defer remaining items to backlog with documented rationale
     Est: ~3–5 min per item, ~15–30K tokens per item (one bmad-create-story + rationale note per item)
3. Escalate to architect (pauses the epic; sign-off blocked until decision is provided)
     Est: 0 min / 0 tokens here (cost is offline)
4. Split remaining issues into a follow-on hardening epic
     Est: ~10–20 min, ~50–100K tokens total (epic-skeleton plus one backlog story per remaining item)
```
Wait for `{user_name}` decision.

---

## Step 8 — Epic Sign-Off

### Deferred File Cleanup

If `{deferred_file_cleanup}` is `true` and `{epic_cleanup_script}` exists with non-empty content:
Execute `bash {epic_cleanup_script}` to process all deferred file deletions accumulated during epic closure in one batch.
On success, execute `rm {epic_cleanup_script}`.
If `{epic_cleanup_script}` does not exist or is empty, skip this step.

Record end timestamp: run `date +%s` (OS-aware — on a PowerShell harness use `[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()`; see `references/metrics-contract.md` → Recording timestamps), subtract `{epic_start_ts}`, bind `{epic_actual_elapsed_min}` = round(elapsed seconds / 60), then bind `{epic_elapsed_hours}` = round(`{epic_actual_elapsed_min}` / 60, 1).

Compute `{epic_actual_man_hours}` by reading `actual.man_hours` from each sprint node in `{status_active}` (targeted read only):
- `{epic_actual_man_hours}` = round(sum of sprint `actual.man_hours` values + 12, 1)   ← 12h = epic closure overhead (epic retro, functional completeness, arch drift)

**Token & cost actuals (HARD RULE — see `references/metrics-contract.md`):**
- If `{runtime}` == `claude`: compute **exactly** using the token/cost capture procedure with `{epic_start_ts}` as the start (the whole-epic transcript window, covering all sprints and epic closure). Bind `{epic_actual_tokens_k}` and `{epic_actual_cost}` (format `$X.XX`). Capturing from the epic window is preferred to summing sprint values (it covers epic-closure subagents and avoids gaps); if the transcript is unreadable, fall back to summing the sprints' numeric `actual.tokens_k` / `actual.cost`, and bind `N/A` if no sprint reported a numeric value.
- If `{runtime}` == `other`: sum the sprints' numeric `actual.tokens_k` / `actual.cost` if any exist; otherwise bind `{epic_actual_tokens_k}` = `N/A` and `{epic_actual_cost}` = `N/A`. **Never guess.**

Update the epic node in `{status_active}`:
- `status: done`
- All epic stories: verified `done`
- `closed: {date}`
- `retrospective: {epic_retro_file}`
- `actual:` (all four metrics — required)
  - `elapsed_hours: {epic_elapsed_hours}`
  - `man_hours: {epic_actual_man_hours}`
  - `tokens_k: {epic_actual_tokens_k}`
  - `cost: '{epic_actual_cost}'`

Print:
```
Epic Orchestrator: Epic {target_epic} — {epic_title} — CLOSED — {date}

  Sprints executed:             {total_sprint_count}
  Stories delivered:            {total_story_count}
  Epic retrospective:           {epic_retro_file}
  Clean release critical/high:  resolved
  Adversarial critical/high:    resolved
  Red team critical/high:       resolved
  UX review critical/high:      resolved
  Architecture drift:           {drift_undoc} deviations fixed/documented, {drift_gaps} spec gaps documented
  Functional completeness:      {func_ac_gaps} gaps resolved
  Deferred to backlog:          {deferred_story_keys}

  ── Planned vs Actual ──────────────────────────────────────────────────────────────────────
  AI time:         planned {estimate.time_hours_low}–{estimate.time_hours_high} hours    actual ~{epic_elapsed_hours} hours
  Tokens:          planned {estimate.tokens_k_min}K–{estimate.tokens_k_max}K              actual {epic_actual_tokens_k}K
  Cost:            planned ~{estimate.cost_low}–{estimate.cost_high}                      actual {epic_actual_cost}
  Traditional:     estimated ~{estimate.man_hours_low}–{estimate.man_hours_high} hours    actual ~{epic_actual_man_hours} hours
  (Token/cost actuals are exact under Claude; shown as N/A under other runtimes — never estimated.)
```

---

## Step 9 — Calibration Update (epic-closure sample)

Update the project-level decomposed calibration file (`references/metrics-contract.md` → *Decomposed calibration* / *Emitting calibration samples at close* / *Rolling averages*). **Scope and fix samples, and the per-sprint `sprint-closure` samples, were already emitted by each `l3io-pm-sprint-execute` subagent at its own close** — do **not** re-sample them here (that would double-count the same stories). This step emits only the **epic-closure** sample.

**Read** the epic node's `estimate` + `actual`, and each sprint node's `actual` block. If the file is `version: 1` (or has no `version`), migrate to v2 first (per metrics-contract → *migration*).

**Epic-closure sample.** `closure_actual.epic[m] = epic.actual[m] − Σ sprint.actual[m]` for `m` ∈ {time, tokens, cost} (skip if any contributing actual is `N/A`); `man_hours` epic closure is the fixed +12 constant → `closure.epic.man_hours_ratio` sample = 1.0. `closure_ratio_sample.epic[m] = closure_actual.epic[m] / epic_closure_band_mid(m)` (band mids per metrics-contract).

**Append** one history entry: `{ kind: epic-closure, id: 'E{target_epic_padded}', date: '{date}', closure: {time_ratio, token_ratio, cost_ratio, man_hours_ratio} }` (omit any ratio whose metric was `N/A`/skipped); increment `closure.epic.sample_count` and `epics_sampled`.

**Recompute & write.** Keep the most recent **30** history entries; recompute the `closure.epic` component ratios as the decay-0.8 weighted mean over its `epic-closure` entries (per metrics-contract → *Rolling averages*; a metric with no real sample keeps its prior of 1.0). Leave the `scope` / `closure.sprint` / `fix` components as the sprints left them. Write the v2 file (`scope` / `closure` / `fix` / `history`, with `epics_sampled` updated).

If a ratio cannot be computed (zero denominator or `N/A`), leave `closure.epic` at its prior (1.0) and note the skip.

---

## Step 10 — Archive the Epic

All sign-off writes (Step 8) and calibration reads (Step 9) are now complete against the
epic node in `{status_active}`. As the final action, **move the epic node** (its full
subtree — all done sprints and stories) from `{status_active}` to `{status_archived}` per
`references/status-files.md` → Move operations, and remove any leftover shell for this epic
from `{status_backlog}`. Re-parse `{status_active}` and `{status_archived}` to confirm both
are valid YAML and the epic now appears only in `{status_archived}`.
