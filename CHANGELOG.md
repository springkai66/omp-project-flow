# Changelog

## 0.19.0

- Added opt-in verification remediation loop artifacts with failed checks, next actions, stop conditions, and bounded attempts.
- Added `/verify:remediate` to show, refresh, start, pass, fail, or stop remediation attempts without running commands silently.
- Remediation summaries now flow into task info, snapshots, and hidden context.

## 0.18.0

- Added role orchestration handoffs for `research`, `implement`, and `check` roles under each task's `roles/` directory.
- Added `/task:roles` to show, refresh, start, complete, or block role handoffs.
- Role summaries now flow into task info, snapshots, and hidden context.

## 0.17.0

- Exposed `autoSubtaskMode` as an OMP plugin setting with `off`, `suggest`, and `auto` policies.
- Added project override support for automatic subtask planning through `.omp/plugin-overrides.json` or `.pi/plugin-overrides.json`.
- Added deterministic complexity scoring to subtask plans and summaries.
- `/task:subtasks` now accepts `--mode off|suggest|auto` plus `--off`, `--suggest`, and `--auto` shortcuts.

## 0.16.0

- Added Auto Subtask Planner v1 with generated child-task suggestions under `subtasks/plan.json` and `subtasks/plan.md`.
- Added `/task:subtasks [--refresh|--apply] [id-prefix-or-title]`.
- Subtask plan summaries now appear in hidden context, task info, and snapshots.
- Applying a subtask plan creates linked child tasks while preserving the active parent task.

## 0.15.0

- Added Subtask Trees v1 with parent/child task relationships.
- Added `/task:child <prompt>` and `/task:tree [id-prefix-or-title]`.
- Parent task readiness now rolls up unfinished child tasks.
- Added subtask summaries to hidden context, task info, snapshots, project overview, and task tree output.

## 0.14.0

- Added Task Metadata v1 inside `task.json`.
- Added `/task:metadata [id-prefix-or-title]`.
- Added metadata summaries to task status, hidden context, handoff, task info, snapshots, and project overview.
- Tool-inferred and upstream-sync tasks now record distinct metadata sources and origins.

## 0.13.0

- Added one-question-at-a-time PRD clarification artifacts: `clarification.json` and `clarification.md`.
- Added `/task:clarify` plus `/clarify:start`, `/clarify:status`, `/clarify:answer`, `/clarify:skip`, and `/clarify:finish`.
- Captures the next user prompt as the current clarification answer while a required clarification loop is collecting.
- Linked clarification state into hidden context, handoff, resume packs, readiness, snapshots, task info, PRDs, and spec proposals.

## 0.12.0

- Added Trellis-style research artifacts for each task: `research/research.json`, `research/notes.md`, and `info.md`.
- Added `/task:info`, `/research:status`, and `/research:add`.
- Linked research summaries into task snapshots, hidden context, and spec proposals.
- `info.md` is created once and left human-editable; generated research summaries are kept in structured artifacts.

## 0.11.1

- Fixed automatic task tracking when a coding prompt is phrased as inspection, diagnosis, verification, or troubleshooting.
- Added a tool-activity fallback that creates a Project Flow task when mutating or verification tools run without an existing active task.
- Preserved tool arguments across OMP start/end hook events so verification commands such as `bun test` are recorded correctly.

## 0.11.0

- Added upstream sync state under `.project-flow/upstreams/`.
- Added `sources.json`, `capabilities.json`, `sync-report.json`, and `sync-report.md`.
- Added `/upstream:status`, `/upstream:report`, `/upstream:review`, and `/upstream:sync`.
- Added compact upstream sync context when review work is pending.

## 0.10.0

- Added project-level `workspace/overview.json` and `workspace/overview.md`.
- Added `/flow:overview`.
- Expanded `/flow:status` with task totals, readiness totals, and proposed spec counts.
- Project overview summarizes active task, task readiness, next actions, blocked tasks, and spec proposals.

## 0.9.0

- Added per-task `snapshot.json` and `snapshot.md` review packs.
- Added `/task:snapshot [id-prefix-or-title]`.
- Added compact task snapshot summaries to hidden context.

## 0.8.0

- Added finish readiness packs in `readiness.json` and `readiness.md`.
- Added `/task:readiness [id-prefix-or-title]`.
- Added finish readiness to hidden context and task status.
- `/task:finish` now blocks when required signals are missing unless `--force` is provided.

## 0.7.0

- Added per-task `resume.json` and `resume.md`.
- Added `/task:resume [id-prefix-or-title]`.
- Added compact resume summaries to hidden context.

## 0.6.0

- Added reviewable spec proposals under `.project-flow/spec-proposals/`.
- Added `/spec:proposals`, `/spec:show`, and `/spec:apply`.

## 0.5.0

- Added verification strategy detection and suggestions.
- Added `/verify:suggest` and `/verify:refresh`.

## 0.4.0

- Added structured plan state and plan commands.

## 0.3.0

- Added acceptance state, handoff summaries, and acceptance commands.

## 0.2.0

- Added task listing, status, show, switch, and verification tracking.
