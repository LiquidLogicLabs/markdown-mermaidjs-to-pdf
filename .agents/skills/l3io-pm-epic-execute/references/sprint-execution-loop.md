# Sprint Execution Loop

Communicate all responses in `{communication_language}`.

**Orchestrator role:** Traffic controller. Hold only sprint summaries (status-line metrics) — never sprint story details, diffs, or implementation content.

**Subagent invocation:** Agent tool preferred (self-contained prompt, no conversation history forwarded). Fallback: `claude --print`. Every subagent must end with exactly one status line:
```
DONE — [brief metrics]
BLOCKED: [one-line reason]
FAILED: [one-line reason]
```

**Adaptive parallelism for sprints:** Sequential by default. Parallel sprint batches only when sprint groups are proven independent (no shared story files, no cross-sprint dependencies) and status merges are serialized. `effective_parallel_subagents` = min(`{max_parallel_subagents}`, 4, safe_batch_size). Force to 1 when `{parallel_mode}` = `off` or any safety check is uncertain.

**Progress reporting:** ETA ranges (`~3-8 min`), not exact timestamps. Report sprint position (`N/M`) and batch size. Refresh ETA after each sprint completes.

---

## Step 2 — Sprint Execution

For each sprint in `{sprint_plan}` (sequential default; parallel batch when safe):

Resolve `{current_sprint_padded}` as a two-digit zero-padded value. Announce:
```
Spawning sprint subagent {current_sprint_num} of {total_sprint_count} — stories: {sprint_story_keys}
```

Spawn subagent:
```
Load config from: {config_file}
Load project context from: {context_file} (if it exists)
State files: split layout under {implementation_artifacts} (sprint-status-active.yaml / -backlog.yaml / -archived.yaml) — resolve per references/status-files.md
Target: Epic {target_epic}, stories: {sprint_story_keys}
Sprint number: {current_sprint_num} (two-digit: {current_sprint_padded})
Expected sprint output root: {epic_root_dir}/sprint-{current_sprint_padded}
Invoke skill: l3io-pm-sprint-execute
Execute the complete sprint for the listed stories — all per-story phases and closure phases.
Promote the sprint to the active state file and update it as stories complete, per references/status-files.md.
Print when done:
  DONE — Stories: N, Issues resolved: N, Issues deferred: N, Retro: [path]
  BLOCKED: [reason]
  FAILED: [reason]
```

Wait for the subagent to complete. Read its status line — record `{sprint_stories_done}`, `{sprint_issues_resolved}`, `{sprint_issues_deferred}`, `{sprint_retro_path}`.

If BLOCKED or FAILED: halt and report the status line to `{user_name}`. Wait for resolution before continuing.

Announce: "Sprint {current_sprint_num} closed — {sprint_stories_done} stories delivered."

Append to `{sprint_summaries}`: sprint number + status-line metrics.

If this is not the last sprint, announce to `{user_name}` (informational, no confirmation requested): "Proceeding to Sprint {next_sprint_num} of {total_sprint_count}." The epic orchestrator continues immediately to the next sprint without waiting.

---

When all sprints in `{sprint_plan}` are complete, continue to `references/epic-closure.md`.
