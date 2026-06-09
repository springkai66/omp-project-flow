# omp-project-flow

[English](./README.md) | [简体中文](./README.zh-CN.md)

Project Flow workspace, task workflow, and spec injection for Oh My Pi.

Status: preview / beta. This repository is intended for local Oh My Pi plugin installation, not npm publishing.

This plugin provides a native project workflow for agent work:

- durable project specs
- reviewable spec proposals
- task PRDs with structured review snapshots, completeness checks, plan-quality checks, decisions, and promotion readiness
- stable task metadata for source, kind, priority, risk, labels, origin, and relationships
- parent/child subtask trees with child readiness rollups
- one-question-at-a-time PRD clarification loops
- task research artifacts and `info.md` technical notes
- structured plan state
- acceptance state
- handoff summaries for resuming interrupted work
- resume packs with next action, recent events, touched files, open acceptance, and failed checks
- finish readiness gates for acceptance, plan, and verification signals
- task snapshots for review, handoff, issues, and pull requests
- project overview across active, paused, finished, blocked, and proposed work
- upstream sync reports for tracking ECC/OMO-inspired capability gaps
- workflow state
- tool event logs
- verification tracking
- verification command suggestions
- workspace journals
- automatic context injection

The runtime state lives in a project-local `.project-flow/` directory. Plugin code is installed through Oh My Pi, but project workflow data stays outside OMP's native `.omp/` directory.

## Install Locally

From this directory:

```powershell
git clone git@github.com:springkai66/omp-project-flow.git
cd omp-project-flow
bun install
```

Install into Oh My Pi:

```powershell
.\scripts\install-local.ps1 -Force
```

Then start Oh My Pi in a project:

```powershell
omp
```

Check the install:

```powershell
omp plugin doctor
omp plugin list
```

## Automatic Flow

You do not need to run commands for the normal path.

When a user prompt looks like code work, the extension automatically:

1. creates or resumes an active task
2. writes `.project-flow/tasks/<task-id>/prd.md` and `prd-review.{json,md}`
3. stores stable task metadata in `task.json`
4. tracks parent/child task relationships in metadata
5. creates `clarification.json` and `clarification.md` when open PRD questions need a one-question loop
6. creates `research/research.json`, `research/notes.md`, and `info.md`
7. creates `plan.json` and `plan.md`
8. reads relevant specs from `.project-flow/spec`
9. injects hidden project flow context before the agent starts
10. records tool events into `events.jsonl`
11. records test/check/lint style commands into `verification.json`
12. suggests verification commands in `verification-strategy.json`
13. keeps acceptance state in `acceptance.json`
14. creates reviewable spec proposals when tasks finish
15. refreshes a resumable `handoff.md`
16. refreshes `resume.json` and `resume.md`
17. refreshes `readiness.json` and `readiness.md`
18. refreshes `snapshot.json` and `snapshot.md`
19. refreshes project-level `workspace/overview.json` and `workspace/overview.md`
20. blocks `/task:finish` when required finish signals are missing, unless `--force` is provided
21. writes turn journals under `.project-flow/workspace/journals`
22. keeps upstream sync review packs under `.project-flow/upstreams`

## Commands

Commands are escape hatches and diagnostics:

```text
/flow:init
/flow:status
/flow:overview
/task:new <prompt>
/task:continue
/task:resume [id-prefix-or-title]
/task:list
/task:status [id-prefix-or-title]
/task:readiness [id-prefix-or-title]
/task:snapshot [id-prefix-or-title]
/task:show <id-prefix-or-title>
/task:switch <id-prefix-or-title>
/task:handoff [id-prefix-or-title]
/task:info [id-prefix-or-title]
/task:metadata [id-prefix-or-title]
/task:child <prompt>
/task:tree [id-prefix-or-title]
/task:subtasks [--refresh|--apply] [--mode off|suggest|auto] [--template auto|acceptance|workflow|roles|verification] [--depth N] [id-prefix-or-title]
/task:roles [--refresh|--start|--done|--block <research|implement|check>] [id-prefix-or-title] [note]
/task:clarify [answer|--refine|--skip note|--finish [--force]]
/task:finish [--force] [note]
/task:pause [note]
/clarify:start [id-prefix-or-title] [--max N]
/clarify:status [id-prefix-or-title]
/clarify:answer <answer>
/clarify:skip [reason]
/clarify:finish [--force] [note]
/prd:refine [id-prefix-or-title] [--axes a,b] [--max N]
/prd:review [--refresh] [id-prefix-or-title]
/research:status [id-prefix-or-title]
/research:add <note>
/plan:status [id-prefix-or-title]
/plan:next [id-prefix-or-title]
/plan:done [id] [evidence]
/plan:block [id] [reason]
/plan:open [id] [note]
/verify:status [id-prefix-or-title]
/verify:suggest [id-prefix-or-title]
/verify:refresh [id-prefix-or-title]
/verify:remediate [--refresh|--next|--start|--pass|--fail|--stop] [id-prefix-or-title] [note]
/acceptance:status [id-prefix-or-title]
/acceptance:done <id> [evidence]
/acceptance:block <id> [reason]
/acceptance:open <id> [note]
/spec:update [note]
/spec:proposals
/spec:show <id-prefix-or-title>
/spec:apply <id-prefix-or-title>
/sources:check
/upstream:status
/upstream:report
/upstream:review <source-id> <reference> [note]
/upstream:sync [note]
```

Normal work does not require commands. The task commands are useful when you want to inspect, resume, or switch long-running work.

Subtask planning policy is controlled by the `autoSubtaskMode` plugin setting: `off` disables automatic plans for new root tasks, `suggest` records guarded proposals for review, and `auto` creates linked child tasks from generated proposals. Project-local overrides can set `settings["omp-project-flow"].autoSubtaskMode` in `.omp/plugin-overrides.json` or `.pi/plugin-overrides.json`. `/task:subtasks --mode off|suggest|auto` can regenerate one task's plan with an explicit policy. `/task:subtasks --template acceptance|workflow|roles|verification --depth N` selects deterministic split templates with ordered items, dependencies, nested parent plan-item links, and tree rollups.

Role orchestration handoffs are generated under each task's `roles/` directory. `/task:roles` shows the research/implement/check ownership plan, `/task:roles --refresh` regenerates prompts from current task state, and `/task:roles --start|--done|--block <role> [note]` records role progress while keeping the main OMP runtime in control.

Clarification is automatic when the initial PRD has open questions. While a required clarification loop is collecting, the next normal user reply is recorded as the current answer, and the injected context tells the agent to ask only the next question before planning or implementing. Use `/task:clarify` for the compact command surface, `/task:clarify --refine` or `/prd:refine` for a focused PRD refinement loop over goal/scope/users/acceptance/constraints/non-goals/verification/risk, or `/clarify:*` when you want explicit start/status/answer/skip/finish control.

PRD review artifacts live next to each task PRD as `prd-review.json` and `prd-review.md`. They record goal, scope, actors/users, non-goals, constraints, acceptance, verification, risks, dependencies, open questions, research-backed decisions, PRD completeness checks, acceptance-to-plan coverage, verification coverage, and a promotion readiness state. Use `/prd:review` to inspect the gate or `/prd:review --refresh` to regenerate it from current task artifacts. Promotion blockers flow into finish readiness; warnings remain reviewable without silently expanding scope.

The upstream commands are for controlled upgrades when ECC or OMO changes. They refresh the local sync report, mark reviewed upstream references, or create a normal Project Flow task to adapt useful ideas.

`info.md` is created once and is safe for human technical notes. Project Flow does not overwrite it after creation. `research/notes.md` is generated from `research/research.json`; add durable research notes with `/research:add` or put free-form manual notes in `info.md`.

## Project Layout

```text
.project-flow/
  spec/
    README.md
  spec-proposals/
    S-YYYYMMDD-slug.md
  upstreams/
    sources.json
    capabilities.json
    sync-report.json
    sync-report.md
  workspace/
    overview.json
    overview.md
    journals/
  tasks/
    T-YYYYMMDD-slug/
      task.json
      prd.md
      prd-review.json
      prd-review.md
      clarification.json
      clarification.md
      info.md
      research/
        research.json
        notes.md
      acceptance.json
      handoff.md
      resume.json
      resume.md
      readiness.json
      readiness.md
      snapshot.json
      snapshot.md
      subtasks/
        plan.json
        plan.md
      roles/
        plan.json
        plan.md
        research.md
        implement.md
        check.md
      plan.json
      plan.md
      events.jsonl
      verification.json
      verification-strategy.json
      verification-remediation.json
      verification-remediation.md
  workflow/
    active-task.json
    active-task-scopes.json
```

Task metadata is stored inside each `task.json` under `metadata`. It records stable, non-derived fields such as `kind`, `source`, `priority`, `risk`, `labels`, `origin`, and task relationships. Derived state such as readiness, verification counts, and touched files remains in snapshot/resume/readiness artifacts.

Active task pointers are session-scoped when OMP exposes a session id. Project Flow stores those pointers in `.project-flow/workflow/active-task-scopes.json` and keeps `.project-flow/workflow/active-task.json` as the project-level compatibility pointer for legacy or no-session contexts. Commands, lifecycle hooks, tool events, turn journals, and status updates resolve the active task from the current session scope.

Subtasks are ordinary tasks linked through `metadata.relationships.parentTaskId` and `childTaskIds`. Project Flow creates a guarded subtask plan for complex root tasks under `subtasks/plan.json` and `subtasks/plan.md`; each plan records deterministic complexity scoring plus the active `off`, `suggest`, or `auto` policy. Use `/task:subtasks` to inspect suggestions, `/task:subtasks --refresh` to regenerate them, `/task:subtasks --mode auto --refresh` to regenerate and immediately create child tasks, and `/task:subtasks --apply` to create linked child tasks from existing suggestions. Use `/task:child <prompt>` to create a child manually and `/task:tree` to inspect the tree. Parent task readiness is blocked while child tasks remain unfinished, unless `/task:finish --force` is used.

Role orchestration records role prompts, owned artifacts, expected outputs, and role-local checks for research, implementation, and verification/review. It does not launch independent agents by itself; it provides explicit handoff packets and status tracking so a main OMP session or manually launched role agent can execute without guessing ownership.

Research artifacts live under each task's `research/` directory. Notes remain in `research/notes.md`, reviewed/draft evidence is captured in `research/source-packs.json`, and the local research workflow handoff is written to `research/handoff.md`. Source packs include kind, source path/URL, claim, excerpt, confidence, review status, question links, stale-after metadata, and open risks. Use `/research:question`, `/research:extract-source --source <file[:start-end]> --claim <claim>`, `/research:review --id S1`, `/research:answer --id Q1 --answer <answer> --source-packs S1,S2`, `/research:decision`, `/research:add-source`, and `/research:summary` to run a review-first workflow. Upstream/parity tasks warn on missing reviewed evidence, open questions, draft-only packs, stale sources, low confidence without a second source, conflicts, and open research risks; Project Flow does not pretend autonomous research happened.

Verification suggestions are inferred from common project files such as `package.json`, `pyproject.toml`, `pytest.ini`, `Cargo.toml`, `go.mod`, `.sln`, `.csproj`, and `Makefile`. Project Flow also writes a reviewable verification policy matrix into each `verification-strategy.json`: touched-file categories are matched to suggested checks, successful recorded commands mark rows covered, and readiness/resume packs surface remaining coverage gaps without running commands silently. When checks fail, `/verify:remediate` creates an opt-in loop with failed-check evidence, classification category, confidence, impacted files/signals, structured next-action records, a local `verification-remediation-ledger.jsonl`, bounded attempts, stop conditions, and explicit pass/fail/stop status. Use `/verify:remediate --next` to regenerate reviewable next actions. It never runs fix or verification commands silently; rerun commands are stored as opt-in records with confirmation requirements.

Spec proposals are saved for review under `.project-flow/spec-proposals/`. They are not applied to `.project-flow/spec/` unless you explicitly run `/spec:apply`.

## Design Notes

- OMO inspires the resumable workflow state.
- ECC inspires small composable hooks and safe, reviewable source packs.
- Oh My Pi remains the execution runtime.

Spec updates are suggested, not silently applied.

Upstream sync is intentionally controlled. Project Flow tracks upstream sources and capability coverage, but it does not automatically merge or execute upstream code.

See [docs/upstream-sync.md](./docs/upstream-sync.md) for the review workflow.

## Development

```powershell
bun run check
bun test
```

This package is marked `private` to avoid accidental npm publication.

## License

MIT. See [LICENSE](./LICENSE).

## Version Notes

### 0.27.0

- Added local verification failure classification with evidence, confidence, impacted files/signals, retryability, and stop reasons.
- Verification remediation now writes structured next-action records and a local ledger without silently executing commands.
- Added `/verify:remediate --next` for reviewable next-action generation.

### 0.26.0

- Added structured PRD review artifacts with completeness checks, plan-quality checks, acceptance-to-plan coverage, decisions, and promotion readiness.
- PRD review summaries now flow into `info.md`, handoffs, snapshots, hidden context, and finish readiness.
- Added `/prd:review [--refresh]` for local PRD-to-plan gate inspection.

### 0.25.0

- Closed the local research workflow with structured questions, findings, decisions, risks, local source extraction, reviewed/draft source packs, and research handoff packets.
- Readiness now warns on incomplete research evidence for upstream/parity work instead of treating source-pack capture as full research parity.

### 0.24.0

- Added reviewed research source packs with source kind, claim, excerpt, confidence, and open risks.
- Research source summaries now flow into task info, handoffs, snapshots, hidden context, and readiness warnings for upstream/parity work.

### 0.23.0

- Added verification policy matrix coverage for touched files, suggested checks, and recorded pass evidence.
- Readiness and resume packs now show verification coverage gaps as reviewable next actions.

### 0.22.0

- Added richer subtask planning templates: acceptance, workflow, roles, and verification.
- Subtask plans now store item order, depth, dependencies, parent item links, template, and max depth.
- Subtask trees now show rollups by status, phase, depth, leaves, truncation, and blocked subtasks.

### 0.21.0

- Added focused PRD refinement mode with `/prd:refine` and `/task:clarify --refine`.
- PRD refinement asks one required-axis question at a time and records answers into the draft PRD.
- Refined PRD state now appears in clarification artifacts, task PRDs, hidden context, readiness, handoff, and snapshots.

### 0.20.0

- Added session-scoped active task pointers in `.project-flow/workflow/active-task-scopes.json`.
- Commands, lifecycle hooks, tool events, turn journals, and status now use the current OMP session scope.
- Kept `.project-flow/workflow/active-task.json` as the project-level compatibility pointer.

### 0.19.0

- Added opt-in verification remediation loop artifacts and `/verify:remediate`.
- Remediation attempts now track failed checks, rerun commands, evidence, attempt limits, and stop conditions.
- Remediation summaries now appear in task info, snapshots, and hidden context.

### 0.18.0

- Added research/implement/check role orchestration handoffs under `roles/`.
- Added `/task:roles` for showing, refreshing, and marking role status.
- Role summaries now appear in task info, snapshots, and hidden context.

### 0.17.0

- Exposed `autoSubtaskMode` with `off`, `suggest`, and `auto` policies.
- Added project-local override support through `.omp/plugin-overrides.json` and `.pi/plugin-overrides.json`.
- Added deterministic complexity scoring to subtask plans and summaries.
- Added `/task:subtasks --mode off|suggest|auto` plus shortcut flags.

### 0.16.0

- Added Auto Subtask Planner v1 with generated child-task suggestions.
- Added `/task:subtasks [--refresh|--apply] [id-prefix-or-title]`.
- Subtask plan summaries now appear in hidden context, task info, and snapshots.
- Applying a subtask plan creates linked child tasks while preserving the active parent task.

### 0.15.0

- Added Subtask Trees v1 with parent/child task relationships.
- Added `/task:child <prompt>` and `/task:tree [id-prefix-or-title]`.
- Parent task readiness now rolls up unfinished child tasks.
- Subtask summaries now appear in hidden context, task info, snapshots, project overview, and task tree output.

### 0.14.0

- Added Task Metadata v1 inside `task.json`.
- Metadata tracks stable task fields: kind, source, priority, risk, labels, origin, relationships, related specs, and custom values.
- Added `/task:metadata [id-prefix-or-title]`.
- Metadata summaries now appear in task status, hidden context, handoff, task info, snapshots, and project overview.
- Tool-inferred and upstream-sync tasks now record distinct metadata sources and origins.

### 0.13.0

- Added task PRD clarification artifacts: `clarification.json` and `clarification.md`.
- Added `/task:clarify` and `/clarify:start/status/answer/skip/finish`.
- The next user prompt is captured as the current clarification answer while a required clarification loop is collecting.
- Clarification state now appears in hidden context, handoff, resume packs, readiness, snapshots, task info, PRDs, and spec proposals.

### 0.12.0

- Added task research artifacts: `research/research.json`, `research/notes.md`, and `info.md`.
- Added `/task:info`, `/research:status`, and `/research:add`.
- Research summaries now appear in task snapshots, hidden context, and spec proposals.

### 0.11.1

- Fixed automatic task tracking for inspection, diagnosis, verification, and troubleshooting prompts.
- Added tool-activity fallback tracking when mutating or verification tools run without an active task.

### 0.11.0

- Added upstream sync state under `.project-flow/upstreams/`.
- Added `sources.json`, `capabilities.json`, `sync-report.json`, and `sync-report.md`.
- Added `/upstream:status`, `/upstream:report`, `/upstream:review`, and `/upstream:sync`.
- Hidden context now includes compact upstream sync next actions when review work is pending.

### 0.10.0

- Added project-level `workspace/overview.json` and `workspace/overview.md`.
- Added `/flow:overview`.
- `/flow:status` now includes task totals, readiness totals, and proposed spec counts.
- Project overview summarizes active task, task readiness, next actions, blocked tasks, and spec proposals.

### 0.9.0

- Added per-task `snapshot.json` and `snapshot.md` review packs.
- Added `/task:snapshot [id-prefix-or-title]`.
- Snapshots combine task metadata, acceptance, plan, verification, verification suggestions, resume, readiness, recent events, touched files, and handoff.
- Hidden context now includes a compact task snapshot summary.

### 0.8.0

- Added finish readiness packs in `readiness.json` and `readiness.md`.
- Added `/task:readiness [id-prefix-or-title]`.
- Hidden context and task status now include finish readiness.
- `/task:finish` now blocks when acceptance, plan, or verification signals are not ready; use `/task:finish --force` to override.

### 0.7.0

- Added per-task `resume.json` and `resume.md` files.
- Resume packs track next action, recent events, touched files, open acceptance items, and failed verification checks.
- Hidden context now includes a compact resume summary automatically.
- Added `/task:resume [id-prefix-or-title]` to trigger continuation from the latest resume pack.

### 0.6.0

- Added `.project-flow/spec-proposals/` for reviewable spec proposal files.
- Added `/spec:proposals`, `/spec:show`, and `/spec:apply`.
- `/spec:update` now creates a local proposal instead of asking the agent to patch specs directly.
- Finishing a task now creates a spec proposal, but applying it still requires an explicit command.

### 0.5.0

- Added `verification-strategy.json` for suggested verification commands.
- Added `/verify:suggest` and `/verify:refresh`.
- Hidden context and handoff summaries now include verification suggestions.
- Strategy detection supports common JavaScript, Python, Rust, Go, .NET, and Makefile projects.

### 0.4.0

- Added `plan.json` for structured task plan state.
- Added `/plan:status`, `/plan:next`, `/plan:done`, `/plan:block`, and `/plan:open`.
- Hidden context now includes plan state and the next plan step.
- Tool and verification events now lightly advance the structured plan.

### 0.3.0

- Added `acceptance.json` for per-task acceptance criteria state.
- Added `handoff.md` summaries that refresh during prompts, tool execution, pause, finish, and compaction.
- Hidden context now includes acceptance status and the latest handoff summary.
- Added `/task:handoff` and `/acceptance:*` commands.

### 0.2.0

- Added task listing, status, show, and switch commands.
- Added deterministic PRD extraction from the initial request.
- Added verification tracking for test/check/lint style tool calls.
- `/task:finish` now notes when no verification was recorded.
