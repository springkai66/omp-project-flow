# Changelog

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
