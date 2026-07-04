# Metrics Capture Contract (HARD RULE)

Communicate all responses in `{communication_language}`.

This file is the single source of truth for how estimates and actuals are captured across the l3io-pm skills. Load it at activation and keep its rules in context for every estimate and every closeout.

## The Rule (non-negotiable)

**Every planning point and every closeout — at epic, sprint, story, and retrospective level — MUST record both an `estimate` and an `actual` for all four metrics.** This is a hard rule, not an optional step. A missing `estimate` block, a missing `actual` block, a missing metric within a block, or a **guessed** token/cost actual is a contract violation — do not sign off a story, sprint, or epic with any of these missing.

The four metrics (same field names everywhere):

| Metric | Field(s) | Source | Notes |
|--------|----------|--------|-------|
| Compute hours | `time_hours_low/high` (estimate), `elapsed_hours` (actual) | Measured wall-clock via `date +%s` | AI-assisted agent run time. Always available. |
| Man hours | `man_hours_low/high` (estimate), `man_hours` (actual) | Modeled formula (traditional dev equivalent) | A defined equivalent, not a measurement. |
| Tokens | `tokens_k_min/max` (estimate), `tokens_k` (actual) | Measured under Claude; runtime-dependent otherwise | In thousands (K). |
| Token cost | `cost_low/high` (estimate), `cost` (actual) | Derived from real tokens × model rate | Formatted `$X.XX`. |

## Runtime-aware actuals capture

Determine `{runtime}` once at activation and bind it:

Claude Code sets `CLAUDECODE=1` in every Bash **and** PowerShell subprocess (documented). Detect by that alone — do NOT infer `claude` from a `~/.claude/projects` directory, which can linger from a prior Claude Code session on a shared machine and would misclassify a Copilot/Cursor run as Claude (yielding a false `$0.00` instead of `N/A`).

```bash
# bash (Linux / macOS / Git-Bash)
if [ "$CLAUDECODE" = "1" ]; then echo claude; else echo other; fi
```

```powershell
# PowerShell (Windows, or anywhere pwsh is the available shell)
if ($env:CLAUDECODE -eq '1') { 'claude' } else { 'other' }
```

Use whichever shell the harness runs. The two capture procedures below (bash and PowerShell) read the same transcript files and produce identical results — pick the one matching your platform: **bash on Linux/macOS or where `jq` is present; PowerShell on Windows** (or anywhere `bash`/`jq` are absent but PowerShell is).

Bind `{runtime}` = `claude` or `other`.

- **`{runtime}` == `claude` → capture EXACT actuals for tokens and cost.** Claude Code records real per-message usage in the session transcript; read it (procedure below). Never estimate when running under Claude.
- **`{runtime}` == `other` (Copilot / any non-Claude agent) → capture as much as the runtime exposes.** Compute hours (wall-clock) and man-hours (formula) are always available. For tokens and cost: if the runtime exposes a usage source, read it; **if it does not, write the literal value `N/A`** — do **not** guess, approximate, or back-fill from a throughput model. `0` is acceptable only when the runtime genuinely reports zero usage; absence is `N/A`.

Compute hours (`elapsed_hours`) and man-hours (`man_hours`) are captured identically in both runtimes — they do not depend on the transcript.

## Token & cost capture under Claude (EXACT)

Each orchestration phase records an epoch start timestamp (e.g. `{sprint_start_ts}`, `{epic_start_ts}`, `{story_start_ts}`). At close, sum the real `usage` fields from the session transcript JSONL entries for **this run** at/after that start. Discovery is anchored on the session id (`$CLAUDE_CODE_SESSION_ID`, exported by Claude Code into every subprocess) — it reads the main transcript `<sid>.jsonl` **and** every subagent transcript under `<sid>/subagents/`, honoring `CLAUDE_CONFIG_DIR` and remaining independent of the undocumented project-dir name encoding (it globs by id, not by path).

**Do not scope by `cwd`.** The orchestrator and its subagents routinely run from different working directories — subdirs they `cd` into, nested artifact paths, worktrees — so an exact-`cwd` filter silently drops most usage rows and trips the zero-entry guard, yielding a false `N/A` (this was the historical bug). The session id is globally unique, so id-scoping captures 100% of this run with zero contamination from concurrent sessions in other (or the same) repo.

When `$CLAUDE_CODE_SESSION_ID` is absent (older Claude Code, or an unusual harness), fall back to scanning all transcripts filtered by `cwd` **prefix** on the repo root (`git rev-parse --show-toplevel`) — a prefix match still spans every subdirectory, unlike the old exact-equality filter.

```bash
CFG="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
START_ISO="$(date -u -d @{start_ts} +%Y-%m-%dT%H:%M:%S 2>/dev/null || date -u -r {start_ts} +%Y-%m-%dT%H:%M:%S)"
SID="$CLAUDE_CODE_SESSION_ID"
if [ -n "$SID" ]; then
  MODE=session; ROOT=""
  mapfile -t TX_FILES < <(find "$CFG/projects" \( -name "$SID.jsonl" -o -path "*/$SID/subagents/*.jsonl" \) 2>/dev/null)
else
  MODE=root; ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
  mapfile -t TX_FILES < <(find "$CFG/projects" -name '*.jsonl' 2>/dev/null)
fi
```

Both helpers below consume `$TX_FILES`, `$MODE`, and `$ROOT` — run this preamble first so they are in scope. The `{ [ ... ] && cat ...; }` guard emits nothing when no files match, so `jq -s` sees `[]` and returns `N/A` rather than hanging on an arg-less `cat`.

**Total tokens (K)** — emits the string `"N/A"` when no usage rows match (zero-entry guard: a real phase always records usage, so zero matches means "not recorded here", never a real zero):

```bash
{ [ ${#TX_FILES[@]} -gt 0 ] && cat "${TX_FILES[@]}" 2>/dev/null; } \
  | jq -s --arg s "$START_ISO" --arg mode "$MODE" --arg root "$ROOT" '
      [ .[] | select((.timestamp // "") >= $s)
        | select($mode == "session" or ((.cwd // "") | startswith($root)))
        | .message.usage // empty ] as $u
      | if ($u|length) == 0 then "N/A"
        else ( [ $u[] | (.input_tokens//0)+(.output_tokens//0)
                       +(.cache_creation_input_tokens//0)+(.cache_read_input_tokens//0) ]
               | add ) / 1000 | floor
        end'
```

Bind to `{actual_tokens_k}` (a number, or the literal string `N/A`).

**Cost (USD)** — same guard, derived per-entry from the real model and real token categories:

```bash
{ [ ${#TX_FILES[@]} -gt 0 ] && cat "${TX_FILES[@]}" 2>/dev/null; } \
  | jq -s --arg s "$START_ISO" --arg mode "$MODE" --arg root "$ROOT" '
      def rate(m):
        if   (m|test("opus"))   then {i:5.0, o:25.0}
        elif (m|test("sonnet")) then {i:3.0, o:15.0}
        elif (m|test("haiku"))  then {i:1.0, o:5.0}
        else {i:5.0, o:25.0} end;            # default: Opus (current Claude Code default)
      [ .[] | select((.timestamp // "") >= $s)
        | select($mode == "session" or ((.cwd // "") | startswith($root)))
        | select(.message.usage) | .message ] as $m
      | if ($m|length) == 0 then "N/A"
        else ( [ $m[] | rate(.model // "") as $r | .usage as $u
                 | (($u.input_tokens//0)                * $r.i)
                 + (($u.output_tokens//0)               * $r.o)
                 + (($u.cache_creation_input_tokens//0) * $r.i * 1.25)   # 5-min cache write
                 + (($u.cache_read_input_tokens//0)     * $r.i * 0.1) ]  # cache read
               | add ) / 1000000
        end'
```

Bind to `{actual_cost}` (format `$X.XX`, or the literal string `N/A`).

**Rate table** (per-MTok input/output; cache-write = input × 1.25, cache-read = input × 0.1) is seeded with Anthropic pricing current as of 2026-06: Opus `$5/$25`, Sonnet `$3/$15`, Haiku `$1/$5`. **Update the `rate()` table when Anthropic pricing changes** — this is the only place rates live for actuals.

Notes:
- **Detection is env-var-only** (`CLAUDECODE=1`); a stale `~/.claude/projects` directory never produces a false `claude` classification.
- **Discovery scopes by session id** (`$CLAUDE_CODE_SESSION_ID`), reading the main transcript and every `<sid>/subagents/*.jsonl`. It does **not** filter by `cwd` — the orchestrator and its subagents legitimately run from different directories, and a `cwd` filter drops their rows (the historical cause of false `N/A`). Id-scoping is independent of the undocumented project-dir name encoding and captures every subagent transcript Claude Code writes for the run.
- **Fallback (no session id):** scan all transcripts filtered by `.cwd` **prefix** on the repo root. A prefix match still spans every subdirectory; it can merge a concurrent same-repo session, but that is rare and far preferable to a false `N/A`.
- **Zero-entry guard:** if no usage rows match the window, both helpers emit `N/A` — never `0` / `$0.00`. A false number is therefore impossible even if detection or discovery misfires (a non-Claude run, a relocated/renamed transcript) — the worst case is losing exact capture and recording `N/A`, never a fabricated value.
- ISO-8601 UTC timestamps compare correctly as strings, so the `>= $s` filter is exact.
- If `jq` is unavailable, treat tokens/cost as unreadable → `N/A` (do not guess).

## Token & cost capture under Claude — Windows / PowerShell

PowerShell does the same job natively (no `jq`/`find`/`xargs`). Use this on Windows, or anywhere PowerShell is the available shell. It reads the same transcripts, applies the **same session-id scoping** (with the same repo-root-prefix fallback) and the same zero-entry guard, and produces identical results.

**Total tokens (K)** — emits `N/A` when no usage rows match:

```powershell
$cfg = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { Join-Path $HOME '.claude' }
$startIso = [DateTimeOffset]::FromUnixTimeSeconds([int64]'{start_ts}').UtcDateTime.ToString('yyyy-MM-ddTHH:mm:ss')
$proj = Join-Path $cfg 'projects'
$sid = $env:CLAUDE_CODE_SESSION_ID
if ($sid) {
  $files = Get-ChildItem $proj -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -eq "$sid.jsonl" -or $_.FullName -match "[\\/]$sid[\\/]subagents[\\/].+\.jsonl$" }
  $root = $null
} else {
  $files = Get-ChildItem $proj -Recurse -Filter *.jsonl -ErrorAction SilentlyContinue
  $root = (git rev-parse --show-toplevel 2>$null); if (-not $root) { $root = (Get-Location).Path }
  $root = $root -replace '\\','/'
}
$rows = $files | Get-Content -ErrorAction SilentlyContinue |
  ForEach-Object { try { $_ | ConvertFrom-Json } catch {} } |
  Where-Object {
    $_.timestamp -ge $startIso -and $_.message.usage -and (
      $sid -or ($_.cwd -and (($_.cwd -replace '\\','/')).StartsWith($root))
    )
  }
if (-not $rows) { 'N/A' } else {
  $t = ($rows | ForEach-Object { $u = $_.message.usage
    [double]$u.input_tokens + [double]$u.output_tokens +
    [double]$u.cache_creation_input_tokens + [double]$u.cache_read_input_tokens } |
    Measure-Object -Sum).Sum
  [math]::Floor($t / 1000)
}
```

Bind to `{actual_tokens_k}`.

**Cost (USD)** — same guard and rate table, derived per-entry from the real model:

```powershell
if (-not $rows) { 'N/A' } else {
  $sum = 0.0
  foreach ($r in $rows) {
    $m = "$($r.message.model)"; $ri = 5.0; $ro = 25.0          # default: Opus
    if     ($m -match 'sonnet') { $ri = 3.0; $ro = 15.0 }
    elseif ($m -match 'haiku')  { $ri = 1.0; $ro = 5.0 }
    $u = $r.message.usage
    $sum += ([double]$u.input_tokens * $ri) + ([double]$u.output_tokens * $ro) +
            ([double]$u.cache_creation_input_tokens * $ri * 1.25) +
            ([double]$u.cache_read_input_tokens * $ri * 0.1)
  }
  '$' + [math]::Round($sum / 1000000, 2).ToString('0.00', [System.Globalization.CultureInfo]::InvariantCulture)
}
```

Bind to `{actual_cost}`. (Null usage fields coerce to 0 in the arithmetic; `InvariantCulture` keeps the `.` decimal separator regardless of system locale.) The `$rows` filter is shared between the two blocks — run the token block first so `$rows` is in scope.

## Recording timestamps (OS-aware)

Each phase records its start as epoch seconds (`{sprint_start_ts}`, `{epic_start_ts}`, `{story_start_ts}`) and computes `elapsed_hours` from it. Use the form matching the shell — this is the one place the surrounding skill steps depend on the OS:

| | Record start (epoch) | `elapsed_hours` at close |
|--|--|--|
| **bash** | `date +%s` | `round((($(date +%s) - {start_ts}) / 3600), 2)` |
| **PowerShell** | `[DateTimeOffset]::UtcNow.ToUnixTimeSeconds()` | `[math]::Round((([DateTimeOffset]::UtcNow.ToUnixTimeSeconds() - {start_ts}) / 3600), 2)` |

Where the closure/story steps say `date +%s`, substitute the PowerShell form when the harness shell is PowerShell. The token/cost capture above consumes the same epoch `{start_ts}`, so it stays correct regardless of which shell recorded it.

## Estimate roll-up — the invariant (enforced)

Estimates are a **true bottom-up roll-up**: a sprint estimate is *defined as* the sum of its story estimates plus its closure band, and an epic estimate is *defined as* the sum of its sprint estimates plus its epic-closure band. They therefore reconcile exactly (no parallel formulas that can drift). For every metric `m` ∈ {`time_hours`, `man_hours`, `tokens_k`, `cost`}, and each of `_low` / `_high`:

```
story.estimate[m]  = base_band(class)[m] × scope_ratio(class, m) × fix_mult(class)
sprint.estimate[m] = Σ_stories  story.estimate[m]   + sprint_closure_band[m] × closure_ratio.sprint[m]
epic.estimate[m]   = Σ_sprints  sprint.estimate[m]  + epic_closure_band[m]   × closure_ratio.epic[m]
```

`cost` is always derived from the metric's `tokens_k` at the blended estimate rate **$8/MTok** (`cost = tokens_k × 0.008`, formatted `$X.XX`), so cost rolls up automatically with tokens.

**Reconciliation is a hard check:** at sprint close, `sprint.estimate[m]` must equal `Σ story.estimate[m] + (written sprint_closure term)`; at epic close, `epic.estimate[m]` must equal `Σ sprint.estimate[m] + (written epic_closure term)`. A mismatch beyond rounding is a contract violation.

### Base bands (single source of truth)

Per-story base bands by `classification` (identical numbers everywhere — story-loop and both SKILLs read them here):

| class    | time_hours low/high | tokens_k min/max | man_hours low/high |
|----------|---------------------|------------------|--------------------|
| simple   | 0.13 / 0.20         | 40 / 70          | 4 / 8              |
| standard | 0.20 / 0.33         | 70 / 120         | 12 / 24            |
| complex  | 0.33 / 0.58         | 120 / 200        | 24 / 48            |

Closure bands (the closure term added once at each level):

| band                         | time_hours low/high | tokens_k min/max | man_hours low/high |
|------------------------------|---------------------|------------------|--------------------|
| `sprint_closure_band`        | 0.42 / 0.83         | 60 / 120         | 16 / 32            |
| `sprint_closure` + red-team¹ | +0.25 / +0.42       | +30 / +60        | +0 / +0            |
| `epic_closure_band`          | 1.0 / 2.0           | 100 / 200        | 8 / 16             |

¹ Add the red-team row to the sprint closure band only when `l3io-sec-agent-redteam` is installed. Closure-band midpoints equal the closure constants used by **actuals** (sprint man-hours +24 = mid of 16–32; epic man-hours +12 = mid of 8–16), so estimate and actual stay symmetric.

`base_band_mid(class, m)` = (low + high) / 2; `closure_band_mid(level, m)` likewise. These mids are the divisors when computing calibration ratios (below).

## Decomposed calibration — `pm-calibration.yaml` (version 2)

Calibration learns **three independent components**, so a miss can be attributed to *story sizing* vs *closure overhead* vs *fix churn* instead of one blended number:

- **`scope`** — per `classification` × per metric: how story-sizing estimates compare to fix-excluded actuals.
- **`closure`** — per level (`sprint`, `epic`) × per metric: how the static closure bands compare to real closure consumption. **This is new — closure was previously never calibrated (a blind spot).**
- **`fix`** — per `classification`: the observed average fix multiplier (`avg_fix_factor`). This replaces the static fix reserve once learned.

```yaml
version: 2
last_updated: '{date}'
stories_sampled: {N}            # scope/fix samples emitted at story granularity
sprints_sampled: {M}            # scope/fix samples emitted at sprint granularity + closure.sprint samples
epics_sampled: {K}              # closure.epic samples
scope:                          # per class × per metric; sample_count gates cold-start (≥3)
  simple:   { time_ratio: 1.0, token_ratio: 1.0, cost_ratio: 1.0, man_hours_ratio: 1.0, sample_count: 0 }
  standard: { time_ratio: 1.0, token_ratio: 1.0, cost_ratio: 1.0, man_hours_ratio: 1.0, sample_count: 0 }
  complex:  { time_ratio: 1.0, token_ratio: 1.0, cost_ratio: 1.0, man_hours_ratio: 1.0, sample_count: 0 }
closure:                        # per level × per metric (NEW); always per-sprint / per-epic
  sprint: { time_ratio: 1.0, token_ratio: 1.0, cost_ratio: 1.0, man_hours_ratio: 1.0, sample_count: 0 }
  epic:   { time_ratio: 1.0, token_ratio: 1.0, cost_ratio: 1.0, man_hours_ratio: 1.0, sample_count: 0 }
fix:                            # per class; avg_fix_factor supersedes the cold-start reserve at ≥3
  simple:   { avg_fix_factor: 1.25, sample_count: 0 }
  standard: { avg_fix_factor: 1.25, sample_count: 0 }
  complex:  { avg_fix_factor: 1.25, sample_count: 0 }
history:                        # keep most recent 30 entries (story granularity emits more)
  - { kind: story, id: 'E01-S01-story-key', class: complex, date: '...', scope: { time_ratio: 1.1, token_ratio: 1.2, cost_ratio: 1.2, man_hours_ratio: 1.0 }, fix_factor: 1.5 }
  - { kind: sprint-closure, id: 'E01-S01', date: '...', closure: { time_ratio: 0.9, token_ratio: 1.1, cost_ratio: 1.1, man_hours_ratio: 1.0 } }
  - { kind: epic-closure, id: 'E01', date: '...', closure: { time_ratio: 1.0, token_ratio: 1.0, cost_ratio: 1.0, man_hours_ratio: 1.0 } }
```

**The fix reserve `F` is a cold-start prior only.** Default `F = 1.25` (≈ one fix pass). It is used **only while a component is under-sampled**; it never stacks on a learned value. Concretely, `fix_mult(class)` = `fix.{class}.avg_fix_factor` when `fix.{class}.sample_count ≥ 3`, else `F` (1.25). Likewise `scope_ratio(class, m)` = the learned ratio when `scope.{class}.sample_count ≥ 3`, else `1.0`; and `closure_ratio.level[m]` = the learned ratio when `closure.{level}.sample_count ≥ 3`, else `1.0`.

> Why `F` must be a prior, not a standing factor: actuals are captured **after** the fix loop while estimates are written **before** it, so every learned ratio already encodes real fix overhead. Multiplying a learned ratio by a static reserve would **double-count** fixes. The ≥3 gate hands off from `F` to the learned `avg_fix_factor` exactly once enough data exists.

## Applying calibration at estimate time

1. Classify every story up front (read AC counts; fall back to Standard only when a file is genuinely absent).
2. For each story and each metric, compute `story.estimate[m]_low/high = base_band(class)[m] × scope_ratio(class, m) × fix_mult(class)`. Write the four-metric `estimate` block + `classification` to the story node now (it is read, not recomputed, later in the story loop).
3. `sprint.estimate[m] = Σ story.estimate[m] + sprint_closure_band[m] × closure_ratio.sprint[m]` (add the red-team row when installed). Write the sprint `estimate` block as this sum.
4. (Epic) `epic.estimate[m] = Σ sprint.estimate[m] + epic_closure_band[m] × closure_ratio.epic[m]`. The epic pre-start estimate computes each planned sprint's estimate the same way and sums them — it does not re-derive from story bases.

`man_hours` scope_ratio stays structurally ≈ 1.0 (man-hours is a modeled formula, not a measurement); its variance is carried by `fix_mult`. That is expected and is not a bug.

## Emitting calibration samples at close (approach A)

At **sprint close**, for each done story compute `fix_factor = min(1.0 + fix_iterations × 0.25, 2.0)` and split its actuals into scope vs fix by **backing the fix portion out of the measured actual** (approach A — no extra instrumentation):

- Measured metrics (`time_hours`, `tokens_k`, `cost`): `scope_actual[m] = story.actual[m] / fix_factor`. **Skip** any metric whose actual is `N/A` (never feed `N/A`/guessed values).
- `man_hours`: `scope_actual = base(class)` exactly (it is the formula sans fix), so its `scope.man_hours_ratio` sample = 1.0.
- `scope_ratio_sample(class, m) = scope_actual[m] / base_band_mid(class, m)`; `fix_factor_sample(class) = fix_factor`.

Closure sample (always per level, independent of granularity): `closure_actual[m] = sprint.actual[m] − Σ_stories story.actual[m]`; `closure_ratio_sample.sprint[m] = closure_actual[m] / closure_band_mid(sprint, m)` (skip metrics that are `N/A`). At **epic close**, `closure_actual.epic[m] = epic.actual[m] − Σ_sprints sprint.actual[m]`, ratio vs `epic_closure_band_mid`.

**Granularity** (`{calibration_granularity}` from `customize.toml`) controls only how many scope/fix samples a sprint emits:
- `"story"` → emit one `kind: story` history entry per done story; each adds 1 to `scope.{class}.sample_count` and `fix.{class}.sample_count`, and increments `stories_sampled`.
- `"sprint"` → average the per-class scope ratios and fix_factors across the sprint's stories; emit one aggregated entry per touched class; each adds 1 to the relevant `sample_count`s and increments `sprints_sampled`.

Closure samples (`kind: sprint-closure` / `kind: epic-closure`) are emitted once per sprint / epic regardless of the setting, incrementing `closure.sprint.sample_count` / `closure.epic.sample_count`.

## Rolling averages, retention, N/A, and migration

- **Rolling average:** recompute each ratio (and `avg_fix_factor`) as the exponential-decay weighted mean (decay = 0.8) over that component's history entries: for the component's entries ordered oldest→newest, `weight[i] = 0.8^(n−1−i)` (newest weight 1.0), value = `round(Σ(v[i]·weight[i]) / Σ(weight[i]), 3)`.
- **N/A:** a metric whose actual is `N/A` (non-Claude runtime, unreadable transcript) is **omitted** from that entry and excluded from both sums for that ratio; the rolling value stays at its prior (1.0 if never sampled). Never feed `N/A` or a guessed value.
- **Retention:** keep the most recent **30** history entries (raised from 10 because story granularity emits more); recompute `sample_count`s from the retained entries per component.
- **v1 → v2 migration:** if the file has `version: 1` (or no `version`), upgrade in place on first write: set `version: 2`; map old `by_classification.{c}.man_hours_ratio` → `fix.{c}.avg_fix_factor` with its `sample_count` (they measure the same quantity); seed `scope.{c}.{time,token,cost}_ratio` from the old overall `time_ratio`/`token_ratio`/`cost_ratio` (coarse prior) and `scope.{c}.man_hours_ratio = 1.0`, carrying the old class `sample_count`; start `closure.*` cold (`sample_count: 0`, ratios 1.0) since v1 never measured closure. Preserve the original as `pm-calibration.yaml.v1` on first upgrade.
