# Project Flow Gaps

This file records known gaps that are intentionally not implemented yet.
It also records implemented areas that are useful but still below the depth of Trellis, ECC, OMO, or Superpowers.

## High Priority

- Auto Subtask Planner
  - Status: partial.
  - Current behavior: Project Flow generates guarded subtask suggestions for complex root tasks, records deterministic complexity scoring in `subtasks/plan.json` and `subtasks/plan.md`, exposes `off`, `suggest`, and `auto` policy controls through the `autoSubtaskMode` plugin setting and `/task:subtasks --mode`, injects summaries into context/info/snapshots, and can apply suggestions through `/task:subtasks --apply` or automatic `auto` mode.
  - Remaining gap: the planner is still deterministic rather than agent-assisted.
  - Target behavior: support agent-assisted decomposition for large tasks, with role-aware child execution and stronger dependency ordering.

- Real research / implement / check agent orchestration
  - Status: partial.
  - Current behavior: Project Flow now generates `roles/` handoff packets for research, implement, and check roles, tracks role status through `/task:roles`, records owned artifacts / expected outputs / role-local checks, and injects summaries into task info, snapshots, and hidden context.
  - Remaining gap: Project Flow still does not launch independent role-based agents automatically; role packets are executed by the main OMP session or manually launched agents.
  - Target behavior: launch or coordinate independent role sessions when OMP exposes a safe runtime API, while preserving explicit state ownership, handoff artifacts, and check outputs.

- Automatic verification remediation loop
  - Status: partial.
  - Current behavior: Project Flow detects likely verification commands, records pass/fail checks, blocks premature finish when checks are missing or failing, and now supports an opt-in `/verify:remediate` loop with failed-check evidence, bounded attempts, stop conditions, and explicit pass/fail/stop records.
  - Remaining gap: the loop records and governs remediation, but it still does not automatically apply fixes or rerun commands; that remains user/agent-controlled.
  - Target behavior: add safe fix-and-rerun execution policies, failure classification, coverage-aware check selection, and clear user control before risky commands run.

## Medium Priority

- Session-scoped active task
  - Status: implemented in 0.20.0.
  - Current behavior: `.project-flow/workflow/active-task-scopes.json` tracks per-session active task pointers keyed by OMP session identity, while `.project-flow/workflow/active-task.json` remains the project-level compatibility pointer.
  - Boundary: session-aware commands and hooks use the current session scope; project-level active task lookup is retained for legacy/no-session contexts and explicit fallback callers.

- Interactive brainstorm PRD loop
  - Status: partial.
  - Current behavior: Project Flow extracts an initial PRD and supports clarification questions, but it does not yet run a richer brainstorm loop until the PRD is explicitly complete.
  - Target behavior: add a PRD refinement mode that asks focused questions, updates draft scope and acceptance criteria, and only exits when required axes are resolved or explicitly skipped.

- Deeper subtask tree planning
  - Status: partial.
  - Current behavior: Project Flow supports parent/child task relationships, `/task:child`, `/task:tree`, readiness rollups, and subtask summaries.
  - Target behavior: add multi-child split templates, better large-tree rollups, child ordering, and optional task tree planning from a single high-level goal.

## Implemented But Below Parity

- PRD / acceptance / plan artifacts
  - Status: implemented, below Superpowers/Trellis depth.
  - Current behavior: Project Flow extracts a PRD, acceptance criteria, and a default implementation plan from the initial prompt.
  - Gap: artifacts are useful but still mostly heuristic; they do not yet enforce a complete methodical spec-to-plan workflow, plan quality checks, task decomposition gates, or rich design review loops.
  - Target behavior: add stronger spec completeness checks, plan review criteria, explicit non-goals, decision logs, and promotion gates before implementation.

- Research artifacts and `info.md`
  - Status: implemented, below ECC/Trellis depth.
  - Current behavior: each task can store `research/research.json`, `research/notes.md`, and `info.md`, and summaries flow into context, snapshots, and spec proposals.
  - Gap: research is mostly manually appended or prompt-derived; there is no dedicated research role, source extraction pipeline, citation/source pack structure, or confidence tracking.
  - Target behavior: add structured source packs, research questions, findings, decisions, confidence levels, and optional research-agent handoff.

- Handoff / resume / snapshot artifacts
  - Status: implemented, below OMO/Superpowers depth.
  - Current behavior: Project Flow writes compact handoff, resume, readiness, and snapshot artifacts for continuity.
  - Gap: summaries are reliable enough for local use but do not yet model richer session history, branch/PR lifecycle, multi-agent ownership, or cross-session conflict resolution.
  - Target behavior: add richer lifecycle state, ownership fields, stale-state detection, and clearer resume packs for long-running multi-session work.

- Context injection
  - Status: implemented, below ECC/OMO depth.
  - Current behavior: Project Flow injects task context, specs, clarification, research, readiness, snapshots, and upstream sync context into OMP agent prompts.
  - Gap: context assembly is scored and bounded but lacks advanced routing, role-specific context packs, source prioritization policies, and token-budget-aware compression strategies.
  - Target behavior: add role-specific context bundles, stronger relevance scoring, explicit token budgets, and source/category priority controls.

- Task metadata
  - Status: implemented, near parity as a foundation, below full orchestration use.
  - Current behavior: task metadata records kind, source, priority, risk, labels, origin, relationships, related specs, custom values, branch, assignee, and PR URL.
  - Gap: metadata is recorded and displayed, but not yet deeply used for scheduling, routing, agent assignment, branch/PR automation, or policy decisions.
  - Target behavior: use metadata to drive active-task selection, subtask planning, verification policy, agent role assignment, and upstream sync prioritization.

- Subtask tree
  - Status: implemented, below Trellis depth.
  - Current behavior: Project Flow supports manual child creation, parent/child relationships, tree display, readiness rollups, context/snapshot/info summaries, and reparent cleanup.
  - Gap: deterministic suggested decomposition now exists, but there is no dependency ordering, per-child role assignment, and only limited large-tree rollups.
  - Target behavior: add dependencies, ordering, richer batch creation controls, large-tree summaries, and role-aware child execution.

- Verification suggestions and readiness blocking
  - Status: implemented, below ECC/OMO/Superpowers depth.
  - Current behavior: Project Flow detects likely verification commands, records verification events, blocks finish when checks are missing or failing, and tracks opt-in remediation attempts with stop conditions and evidence.
  - Gap: it does not classify flaky failures, compare check coverage to touched files, enforce a configurable verification matrix, or execute the self-fix loop automatically.
  - Target behavior: add verification policies, coverage-aware check selection, failure classification, rerun attempt analysis, and safe self-fix loop integration.

- Upstream sync framework
  - Status: implemented as a local enhancement, below automated upstream-intelligence depth.
  - Current behavior: Project Flow tracks ECC and OMO as design sources, records capability coverage, and can create review-first upstream sync tasks.
  - Gap: source review is manual; it does not yet fetch release notes, diff upstream capabilities, summarize new patterns, or map changes into proposed local tasks automatically.
  - Target behavior: add reviewed-source snapshots, capability diffing, update summaries, and proposed implementation tasks while preserving review-first safety.

## Lower Priority

- Custom hooks / skills / agents / templates catalog
  - Status: watch.
  - Current behavior: Project Flow ships as one local OMP plugin with fixed commands and hooks.
  - Target behavior: only add a catalog or marketplace-style module system if the plugin grows multiple optional modules that need versioned installation, discovery, and enable/disable controls.

- Richer upstream sync automation
  - Status: partial.
  - Current behavior: Project Flow tracks ECC and OMO as design sources and can create review-first upstream sync tasks.
  - Target behavior: improve source review artifacts, change summaries, capability diffs, and suggested implementation tasks without automatically fetching, executing, or merging upstream code.
