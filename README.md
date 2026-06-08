# omp-project-flow

Project Flow workspace, task workflow, and spec injection for Oh My Pi.

Status: preview / beta. This repository is intended for local Oh My Pi plugin installation, not npm publishing.

This plugin provides a native project workflow for agent work:

- durable project specs
- reviewable spec proposals
- task PRDs with simple goal, constraint, acceptance, and open-question extraction
- structured plan state
- acceptance state
- handoff summaries for resuming interrupted work
- resume packs with next action, recent events, touched files, open acceptance, and failed checks
- finish readiness gates for acceptance, plan, and verification signals
- task snapshots for review, handoff, issues, and pull requests
- project overview across active, paused, finished, blocked, and proposed work
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
2. writes `.project-flow/tasks/<task-id>/prd.md`
3. creates `plan.json` and `plan.md`
4. reads relevant specs from `.project-flow/spec`
5. injects hidden project flow context before the agent starts
6. records tool events into `events.jsonl`
7. records test/check/lint style commands into `verification.json`
8. suggests verification commands in `verification-strategy.json`
9. keeps acceptance state in `acceptance.json`
10. creates reviewable spec proposals when tasks finish
11. refreshes a resumable `handoff.md`
12. refreshes `resume.json` and `resume.md`
13. refreshes `readiness.json` and `readiness.md`
14. refreshes `snapshot.json` and `snapshot.md`
15. refreshes project-level `workspace/overview.json` and `workspace/overview.md`
16. blocks `/task:finish` when required finish signals are missing, unless `--force` is provided
17. writes turn journals under `.project-flow/workspace/journals`

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
/task:finish [--force] [note]
/task:pause [note]
/plan:status [id-prefix-or-title]
/plan:next [id-prefix-or-title]
/plan:done [id] [evidence]
/plan:block [id] [reason]
/plan:open [id] [note]
/verify:status [id-prefix-or-title]
/verify:suggest [id-prefix-or-title]
/verify:refresh [id-prefix-or-title]
/acceptance:status [id-prefix-or-title]
/acceptance:done <id> [evidence]
/acceptance:block <id> [reason]
/acceptance:open <id> [note]
/spec:update [note]
/spec:proposals
/spec:show <id-prefix-or-title>
/spec:apply <id-prefix-or-title>
/sources:check
```

Normal work does not require commands. The task commands are useful when you want to inspect, resume, or switch long-running work.

## Project Layout

```text
.project-flow/
  spec/
    README.md
  spec-proposals/
    S-YYYYMMDD-slug.md
  workspace/
    overview.json
    overview.md
    journals/
  tasks/
    T-YYYYMMDD-slug/
      task.json
      prd.md
      acceptance.json
      handoff.md
      resume.json
      resume.md
      readiness.json
      readiness.md
      snapshot.json
      snapshot.md
      plan.json
      plan.md
      events.jsonl
      verification.json
      verification-strategy.json
  workflow/
    active-task.json
```

Verification suggestions are inferred from common project files such as `package.json`, `pyproject.toml`, `pytest.ini`, `Cargo.toml`, `go.mod`, `.sln`, `.csproj`, and `Makefile`.

Spec proposals are saved for review under `.project-flow/spec-proposals/`. They are not applied to `.project-flow/spec/` unless you explicitly run `/spec:apply`.

## Design Notes

- OMO inspires the resumable workflow state.
- ECC inspires small composable hooks and safe, reviewable source packs.
- Oh My Pi remains the execution runtime.

Spec updates are suggested, not silently applied.

## Development

```powershell
bun run check
bun test
```

This package is marked `private` to avoid accidental npm publication.

## License

MIT. See [LICENSE](./LICENSE).

## Version Notes

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
