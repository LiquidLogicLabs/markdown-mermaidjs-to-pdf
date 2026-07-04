---
name: l3io-pm-epic-execute
description: Orchestrate a complete epic execution cycle — sprints through closure reviews. Use when the user wants to 'execute an epic' or 'run an epic end-to-end'.
---

# l3io-pm-epic-execute

## Overview

Orchestrates a complete epic lifecycle — from high-level story generation and sprint planning through all closure reviews. Act as Epic Orchestrator, a lightweight traffic controller: delegate all sprint execution to `l3io-pm-sprint-execute` subagents (running headlessly, no per-sprint pause) and hold only epic/story keys, sprint groupings, and status-line summaries in context. After all sprints complete, runs epic closure: retrospective, clean release review, adversarial analysis, red-team review, UX review, architecture drift analysis, functional completeness review, auto-triage, and a closure fix loop (max 10 iterations). The epic does not close until all Critical/High/Medium issues, undocumented drift, and functional AC gaps are resolved; Low findings auto-defer to backlog. Only halts for `{user_name}` if the closure fix loop hits its 10-iteration cap.

Communicate all responses in `{communication_language}`.

## HARD RULE — Estimates & Actuals

Every closeout this skill performs — **epic and the epic retrospective**, plus the sprint-level closeouts delegated to `l3io-pm-sprint-execute` — MUST record both an `estimate` and an `actual` for all four metrics: **man-hours, compute (AI wall-clock) hours, tokens, and token cost.** This is non-negotiable. Token/cost actuals are captured **exactly** when running under Claude and as `N/A` (never guessed) under other runtimes. The full rule, runtime detection, and the exact token/cost capture procedure live in `references/metrics-contract.md` — load it at activation and follow it. Do not sign off the epic with a missing estimate block, a missing actual block, a missing metric, or a guessed token/cost actual.

## Conventions

- Bare paths (e.g. `references/sprint-execution-loop.md`) resolve from the skill root.
- `{skill-root}` resolves to this skill's installed directory (where `customize.toml` lives).
- `{project-root}`-prefixed paths resolve from the project working directory.
- `{skill-name}` resolves to the skill directory's basename.

## On Activation

### Resolve the Workflow Block

Run: `python3 {project-root}/_bmad/scripts/resolve_customization.py --skill {skill-root} --key workflow`

If the script fails, resolve the `workflow` block yourself by reading `{skill-root}/customize.toml`, `{project-root}/_bmad/custom/{skill-name}.toml`, and `{project-root}/_bmad/custom/{skill-name}.user.toml` in base → team → user order. Scalars override, arrays append.

### First-Run Check

If `{project-root}/_bmad/config.yaml` does not have an `l3io-pm` section — or if the user passes `setup`, `configure`, or `install` as an argument — load `assets/module-setup.md` to register the module first, then continue with the resolved config values.

### Load Config

Load available config from `{project-root}/_bmad/config.yaml` and `{project-root}/_bmad/config.user.yaml` (root and `l3io-pm` section). Resolve:

- `user_name`, `communication_language`, `document_output_language`
- `output_folder` — default: `{project-root}/_bmad-output`
- `implementation_artifacts` — default: `{output_folder}/implementation-artifacts`
- `planning_artifacts` — default: `{output_folder}/planning-artifacts`
- `config_file` = `{project-root}/_bmad/config.yaml`
- `context_file` = `{project-root}/**/project-context.md`
- State files (split layout — see `references/status-files.md`):
  - `status_active` = `{implementation_artifacts}/sprint-status-active.yaml`
  - `status_backlog` = `{implementation_artifacts}/sprint-status-backlog.yaml`
  - `status_archived` = `{implementation_artifacts}/sprint-status-archived.yaml`
- `arch_file` = `{planning_artifacts}/*architecture*.md`
- `prd_file` = `{planning_artifacts}/*prd*.md`
- `epics_file` = `{planning_artifacts}/*epic*.md`
- `parallel_mode` = `{workflow.parallel_mode}`
- `max_parallel_subagents` = min(`{workflow.max_parallel_subagents}`, 4)
- `deferred_file_cleanup` = `{workflow.deferred_file_cleanup}` — default: `false`
- `calibration_granularity` = `{workflow.calibration_granularity}` — default: `"story"` (`"story"` | `"sprint"`; see `references/metrics-contract.md`). Each sprint-execute subagent reads its own copy of this setting; keep the two skills' values in sync for consistent sampling.
- `date` = current date (system-generated)

### Load the Metrics Contract

Load `references/metrics-contract.md` and keep its rules in context for the whole run. Determine `{runtime}` (`claude` or `other`) using the detection in that file and bind it now — it governs how token/cost actuals are captured at epic close.

Also load `references/status-files.md` and keep its rules in context. It governs the split state layout — which of the three files (`{status_active}`, `{status_backlog}`, `{status_archived}`) each node is read from and written to, and the node-move operations. Run its **read resolution + auto-fallback** procedure now: bind the three paths, and if only a legacy `sprint-status.yaml` exists, perform the one-time split before proceeding.

### Epic Planning (Step 1)

Load `{status_active}` and `{status_backlog}` — extract epic and story keys with statuses only (not story content). Skim `{epics_file}` headers only — extract story keys and titles, not full content.

If the user provided an epic number, use it. Otherwise find the first epic with `in-progress` or `backlog` status that has non-done stories (search `{status_active}` first, then `{status_backlog}`) and confirm with `{user_name}`.

Resolve `{target_epic_padded}` as a two-digit zero-padded value. Bind and create if missing:
- `{epic_root_dir}` = `{implementation_artifacts}/epic-{target_epic_padded}`
- `{epic_closure_dir}` = `{epic_root_dir}/epic-closure`
- `{epic_test_dir}` = `{epic_root_dir}/tests`
- `{planning_epic_dir}` = `{planning_artifacts}/epic-{target_epic_padded}`
- `{epic_cleanup_script}` = `{epic_root_dir}/cleanup-pending.sh` (only written when `{deferred_file_cleanup}` is `true`; subagents create the file on first use — no pre-write needed. This file collects only epic-level closure phase deletions; each sprint manages its own `{cleanup_script}`)

Count `{total_story_count}`, `{done_count}`, `{remaining_count}`. Build `{remaining_story_key_list}`.

Present sprint grouping proposal to `{user_name}`:
```
Epic {target_epic}: {epic_title}
Total stories:  {total_story_count}
Already done:   {done_count}
Remaining:      {remaining_count} — {remaining_story_key_list}

Default: all remaining stories as one sprint.
To split: provide story key groups (e.g. Sprint 1: 15-0, 15-1 / Sprint 2: 15-2, 15-3)
```

Wait for `{user_name}` to confirm or provide groupings. Set `{sprint_plan}` and `{total_sprint_count}`.

Extract `{epic_title}` and `{epic_goal}` from `{epics_file}` (read headers and goal/objective statement only).

**Promote the epic to active** (per `references/status-files.md` → Move operations): move the epic identity into `{status_active}` with `status: in-progress`, writing `title: {epic_title}` and `goal: {epic_goal}` (create fields if absent). Its not-yet-started (`backlog`) sprints remain in `{status_backlog}` under the epic shell until each sprint starts; sprint-execute promotes them on start.

### Pre-start Estimate

Compute automatically — no user prompt. The epic estimate is a **true roll-up of its sprint estimates** plus the epic-closure band, using the **decomposed calibration** defined in `references/metrics-contract.md` (single source of truth for base bands, closure bands, `scope`/`closure`/`fix` ratios, and the cold-start fix reserve `F`). Procedure:

1. **Classify every story up front.** For each story in `{remaining_story_key_list}`, read its file from `{planning_epic_dir}` or existing story directories, count acceptance criteria, and classify: **Simple** (1–3 ACs), **Standard** (4–6 ACs), **Complex** (7+ ACs or explicit deep integration). Fall back to Standard only when a file is genuinely absent. Bind `{simple_count}`, `{standard_count}`, `{complex_count}`.

2. **Load calibration.** Read `{project-root}/_bmad/pm-calibration.yaml` if it exists; upgrade `version: 1` → `2` in place per metrics-contract → *migration*. Bind the `scope`, `closure`, and `fix` components; for any component with `sample_count < 3`, use cold-start defaults (`scope_ratio = 1.0`, `closure_ratio = 1.0`, `fix_mult = F = 1.25`). Bind `{cal_status}` = a short readiness string of the components with `sample_count ≥ 3`, or `"none yet — formula baseline (components calibrate at ≥3 samples)"`.

3. **Per-sprint estimates (same procedure each sprint-execute will use).** For each planned sprint in `{sprint_plan}`, compute its story estimates `story.estimate[m] = base_band(class)[m] × scope_ratio(class, m) × fix_mult(class)` and roll up `sprint.estimate[m] = Σ story.estimate[m] + sprint_closure_band[m] × closure_ratio.sprint[m]` (add the red-team closure row when `l3io-sec-agent-redteam` is installed — check `.claude/skills/l3io-sec-agent-redteam/SKILL.md` or `.claude/commands/l3io-sec-agent-redteam.md`). These match what each sprint-execute subagent will write.

4. **Epic estimate = roll-up.** `epic.estimate[m] = Σ_sprints sprint.estimate[m] + epic_closure_band[m] × closure_ratio.epic[m]` for each metric `m` ∈ {time_hours, man_hours, tokens_k, cost} (`cost = tokens_k × 0.008`). Record start timestamp: run `date +%s` and bind `{epic_start_ts}` (OS-aware — PowerShell: `[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()`; see metrics-contract → Recording timestamps). Write the epic `estimate` block as this exact sum:
```yaml
estimate:
  time_hours_low: {epic_est_time_low}      # Σ sprint estimates + calibrated epic-closure band (hours)
  time_hours_high: {epic_est_time_high}
  tokens_k_min: {epic_est_tokens_low}      # Σ sprint tokens + calibrated epic closure (K)
  tokens_k_max: {epic_est_tokens_high}
  cost_low: '{epic_est_cost_low}'          # derived from tokens at $8/MTok
  cost_high: '{epic_est_cost_high}'
  man_hours_low: {epic_est_man_low}        # traditional dev equivalent (person-hours)
  man_hours_high: {epic_est_man_high}
```

Announce confirmed execution plan:
```
Epic Orchestrator: Execution confirmed for Epic {target_epic} — {epic_title}.
{total_sprint_count} sprint(s), {remaining_count} stories.
Each sprint runs as a fresh l3io-pm-sprint-execute subagent.
Sprint outputs: {epic_root_dir}/sprint-XX/
Epic closure outputs: {epic_closure_dir}/

Pre-start estimate:
  Stories:        {remaining_count} ({simple_count} simple · {standard_count} standard · {complex_count} complex)
  Per-story cost: Simple ~$0.32–$0.56 · Standard ~$0.56–$0.96 · Complex ~$0.96–$1.60  (Sonnet ~$8/MTok blended)
  Total estimate: {epic_est_time_low}–{epic_est_time_high} hours    Tokens: {epic_est_tokens_low}K–{epic_est_tokens_high}K    Cost: ~{epic_est_cost_low}–{epic_est_cost_high}
  Traditional est: ~{epic_est_man_low}–{epic_est_man_high} hours  (actual auto-computed at epic close)
  Calibration:    {cal_status}
  (Includes {total_sprint_count} sprint closure(s) + epic closure. Actuals reported at epic close.)

Beginning Sprint 1 of {total_sprint_count}.
```

## Sprint Status File Schema

State is split across three files — `{status_active}`, `{status_backlog}`, `{status_archived}` — see `references/status-files.md` for **which file** each node lives in and the move operations. Every node uses the **same per-node structure** below regardless of which file it currently lives in. See `l3io-pm-sprint-execute` for full story and sprint-level fields. Epic-execute owns the top-level epic fields.

```yaml
epics:
- id: '01'
  title: 'Epic 01 — ...'           # written at in-progress
  goal: '...'                       # written at in-progress (from epics_file)
  status: done                      # backlog → in-progress → done
  closed: '2026-05-18'             # written at epic sign-off
  retrospective: path/to/retro.md  # written at epic sign-off
  estimate:                         # roll-up: Σ sprint.estimate + calibrated epic-closure band
    time_hours_low: 3.0
    time_hours_high: 5.7
    tokens_k_min: 800
    tokens_k_max: 1600
    cost_low: '$6.40'
    cost_high: '$12.80'
    man_hours_low: 120
    man_hours_high: 240
  actual:                           # written at epic sign-off (ALL FOUR metrics, HARD RULE)
    elapsed_hours: 4.1
    man_hours: 4.1                  # auto-computed: sum of sprint actual.man_hours + 12h epic closure
    tokens_k: 1180                  # exact under Claude (epic transcript window); 'N/A' under other runtimes
    cost: '$7.85'                   # derived from real tokens × model rate; 'N/A' when tokens_k is N/A
  sprints:
  - id: '01'
    title: 'Sprint 01 — Foundation' # written by l3io-pm-sprint-execute
    status: done
    closed: '2026-05-18'
    retrospective: path/to/sprint-retro.md
    estimate:
      time_hours_low: 0.8
      time_hours_high: 1.4
      tokens_k_min: 250
      tokens_k_max: 480
      cost_low: '$2.00'
      cost_high: '$3.84'
      man_hours_low: 40
      man_hours_high: 80
    actual:                         # written by sprint-execute (ALL FOUR metrics, HARD RULE)
      elapsed_hours: 1.1
      man_hours: 52.5               # auto-computed: sum of (classification base × fix_factor) + 24h closure
      tokens_k: 312                 # exact under Claude; 'N/A' under other runtimes
      cost: '$2.05'                 # derived from real tokens; 'N/A' when tokens_k is N/A
    stories:
    - key: PROJ-E01-S01-ST01
      title: 'Story title...'
      status: done
      classification: complex
      estimate:                     # written by sprint-execute at ready-for-dev (HARD RULE)
        time_hours_low: 0.3
        time_hours_high: 0.6
        tokens_k_min: 120
        tokens_k_max: 200
        cost_low: '$0.96'
        cost_high: '$1.60'
        man_hours_low: 24
        man_hours_high: 48
      actual:                       # written by sprint-execute at done (ALL FOUR metrics, HARD RULE)
        elapsed_hours: 0.4
        man_hours: 30
        tokens_k: 168               # exact under Claude; 'N/A' under other runtimes
        cost: '$1.10'               # 'N/A' when tokens_k is N/A
      completion_evidence:
        fix_iterations: 0
        tests_passing: 42
        files_changed: 8
```

Deferred issues are **not** nested under the epic. They go to the consolidated `backlog:`
list at the top level of `{status_backlog}` (tagged with `epic`/`sprint`) — see
`references/status-files.md` → Consolidated backlog item schema.

## Stages

| # | Stage | Purpose | Location |
|---|-------|---------|----------|
| 1 | Epic planning | Config, paths, story keys, sprint grouping confirmation | SKILL.md (above) |
| 2 | Sprint execution loop | Execute each sprint as l3io-pm-sprint-execute subagent | `references/sprint-execution-loop.md` |
| 3 | Epic closure | Retro → clean release → adversarial → red team → UX → arch drift → functional completeness → issue triage → sign-off | `references/epic-closure.md` |

**Cross-cutting reference:** `references/metrics-contract.md` — the **HARD RULE** for estimates + actuals (all four metrics at epic/retro level), runtime detection, and the exact token/cost capture procedure. Loaded at activation; governs every estimate and closeout.
