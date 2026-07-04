# Status File Layout Contract (split state)

Communicate all responses in `{communication_language}`.

This file is the single source of truth for **where** sprint/epic/story/backlog state lives
on disk. Load it at activation alongside `metrics-contract.md` and keep its rules in context
for every read, every write, and every node move. The metrics rules (what to capture) are
unchanged — this file only governs **which file** each node is written to and read from.

## The three files

State is split across three files in `{implementation_artifacts}/` (each created lazily — a
file that does not yet exist is treated as empty, not an error):

| Binding | File | Holds |
|---------|------|-------|
| `{status_active}` | `sprint-status-active.yaml` | `epics:` with `status: in-progress` only. Each carries its `in-progress` and `done` sprints (and all their stories). |
| `{status_backlog}` | `sprint-status-backlog.yaml` | `epics:` = not-yet-started work; `backlog:` = consolidated deferred-issue tracker across all epics. |
| `{status_archived}` | `sprint-status-archived.yaml` | `epics:` with `status: done` — full subtree, moved here at epic close. |

All three share the **same node schema** as the legacy single `sprint-status.yaml` (epic →
sprints → stories, with `estimate`/`actual`/`completion_evidence` blocks). The only schema
addition is the consolidated `backlog:` item (see below). The split changes *placement*, not
field shape.

## Placement rule (the single source of truth)

- **Granularity = epic + sprint.** Stories always travel inside their owning sprint node;
  there is no story-level fragmentation. Once a sprint is in `{status_active}`, every one of
  its stories lives there too, whatever each story's individual status.
- An **epic** node lives in `{status_archived}` iff `status: done`; in `{status_active}` iff
  `status: in-progress`; in `{status_backlog}` iff `status: backlog`.
- For an **in-progress epic**, its `in-progress` and `done` sprints live in `{status_active}`
  under the epic node. Its not-yet-started (`backlog`) sprints live in `{status_backlog}`
  under an epic **shell** — `id`, `title`, `goal` only, plus a `sprints:` list of the
  backlog sprints — so they stay locatable. A node appears in exactly one file at a time.
- The consolidated `backlog:` deferred-issue list lives only in `{status_backlog}`.

## Read resolution + auto-fallback (run once at activation)

1. If any of the three split files exists → the split layout is in use. Bind the three
   paths; a missing member is an empty set.
2. Else if a legacy `{implementation_artifacts}/sprint-status.yaml` exists → perform the
   one-time split **inline** (partition every epic/sprint per the placement rule above into
   the three files), then rename the legacy file to `sprint-status.yaml.legacy` (never
   delete it — it is the rollback). This is the same partition the
   `l3io-util-cleanup split-status` mode performs; doing it here makes adoption
   automatic on first run.
3. Else → no state yet. Create files lazily as the first node of each kind is written.

Bind `{status_active}`, `{status_backlog}`, `{status_archived}` to the three paths.

**To locate a target epic/sprint:** search `{status_active}` first, then `{status_backlog}`.
A `done` epic (in `{status_archived}`) is normally not a target for new work; read it only
when a roll-up explicitly needs historical nodes.

## Move operations (who triggers what)

A "move" = remove the node from its source file and write it into the destination file
(preserving all fields). After every move, re-parse all touched files to confirm valid YAML.

| Trigger | Step | Move |
|---------|------|------|
| **Epic start** | epic-execute "Epic Planning" | Epic identity → `{status_active}` as `status: in-progress`. Its not-yet-started sprints remain in `{status_backlog}` under the epic shell. (If the epic was a whole `backlog` epic, split it: epic header → active, backlog sprints → shell.) |
| **Sprint start** | sprint-execute "Sprint Scope" | Move that sprint node from the `{status_backlog}` epic shell → the epic node in `{status_active}`, set `status: in-progress`. Remove the shell once its `sprints:` list is empty. |
| **Sprint close** | sprint-closure sign-off | **No file move** — the sprint stays `done` in `{status_active}` until its epic closes (archive is epic-close-only). |
| **Epic close** | epic-closure sign-off | Do all metric/calibration reads from `{status_active}` **first**, then move the whole epic node (all done sprints + stories) `{status_active}` → `{status_archived}`. Remove any leftover shell for that epic from `{status_backlog}`. |
| **Issue triage** | sprint-closure / epic-closure triage | Append deferred items to the `backlog:` section of `{status_backlog}` (tagged with `epic`/`sprint`) — **not** a per-epic nested `backlog:` array. |

## Consolidated backlog item schema

The `backlog:` list lives at the top level of `{status_backlog}` (one flat list across all
epics, replacing the old per-epic nested `backlog:` arrays). Each item gains `epic` and
`sprint` keys so its origin is unambiguous once flattened:

```yaml
backlog:
- key: PROJ-E01-BL-01
  epic: '01'                     # zero-padded epic id
  sprint: '02'                   # zero-padded sprint id; '' for an epic-level deferral
  title: 'Issue title'
  source: 'adversarial (ADV-L-01)'   # review phase + finding id
  severity: Low
  status: backlog
  description: 'One-sentence description of the deferred issue.'
  resolved: '2026-05-19'         # added when the item is later fixed
  resolution: 'How it was fixed.' # added when the item is later fixed
```

## Notes

- A node is in exactly one of the three files at any time; never duplicate it. Moves are
  remove-then-write.
- Empty files are valid (treat a missing file as empty); only write a file once it has at
  least one node, to avoid littering empty YAML.
- The split is one-way. To re-merge, the `sprint-status.yaml.legacy` rollback from the
  initial split is the recovery path; there is no automated re-merge.
