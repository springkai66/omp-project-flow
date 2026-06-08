# Changelog

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
