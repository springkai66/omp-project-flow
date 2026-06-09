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
  - Status: complete-local in 0.27.0; below autonomous self-fix parity only.
  - Current behavior: Project Flow detects likely verification commands, records pass/fail checks, blocks premature finish when checks are missing or failing, supports an opt-in `/verify:remediate` loop, classifies failed checks with evidence/confidence/signals/impacted files, writes structured next-action records plus a remediation ledger, and keeps rerun/fix commands opt-in.
  - Boundary: Project Flow does not automatically apply fixes, rerun commands, install dependencies, or launch hidden agents; it records reviewable next actions and stop reasons grounded in observed verification evidence.
  - Target behavior: add safe self-fix execution policies only if the runtime exposes explicit user-controlled execution contracts and the task carries reviewed evidence for the policy.

## Medium Priority

- Session-scoped active task
  - Status: implemented in 0.20.0.
  - Current behavior: `.project-flow/workflow/active-task-scopes.json` tracks per-session active task pointers keyed by OMP session identity, while `.project-flow/workflow/active-task.json` remains the project-level compatibility pointer.
  - Boundary: session-aware commands and hooks use the current session scope; project-level active task lookup is retained for legacy/no-session contexts and explicit fallback callers.

- Interactive brainstorm PRD loop
  - Status: implemented in 0.21.0.
  - Current behavior: Project Flow supports `/prd:refine` and `/task:clarify --refine`, which run a focused one-question-at-a-time PRD refinement loop over required axes: goal, scope, users, acceptance, constraints, non-goals, verification, and risk. Answers update `clarification.json`, `clarification.md`, `prd.md`, hidden context, handoff, snapshots, and readiness.
  - Boundary: refinement stays explicit and reviewable; Project Flow asks and records focused questions, but it does not invent unresolved product decisions or proceed past collecting mode until required axes are answered or skipped.

- Deeper subtask tree planning
  - Status: implemented in 0.22.0.
  - Current behavior: Project Flow supports parent/child task relationships, `/task:child`, `/task:tree`, readiness rollups, subtask summaries, multi-child split templates, ordered subtask plan items, nested parent plan-item links, and tree rollups by status, phase, depth, leaves, truncation, and blocked subtasks.
  - Boundary: planning remains deterministic and local to `.project-flow/`; Project Flow records reviewable child-task proposals instead of inventing hidden agents or executing child tasks automatically unless `autoSubtaskMode`/`--mode auto` explicitly applies the plan.

## Implemented But Below Parity

- PRD / acceptance / plan artifacts
  - Status: complete-local in 0.26.0; below autonomous design-review parity only.
  - Current behavior: Project Flow writes `prd-review.json` and `prd-review.md` for each task with a structured PRD snapshot, decision log, completeness blockers/warnings, plan-quality checks, acceptance-to-plan coverage, verification coverage, and a promotion readiness state. The promotion summary flows into `info.md`, handoff, snapshots, hidden context, and finish readiness.
  - Boundary: planning remains deterministic and local to `.project-flow/`; Project Flow records reviewable blockers and warnings but does not invent missing product decisions or launch hidden design-review agents.
  - Target behavior: add richer interactive design review and agent-assisted planning only when the runtime exposes a safe, auditable agent/session contract.

- Research artifacts and `info.md`
  - Status: complete-local in 0.25.0; external-blocked only for autonomous research-agent launch.
  - Current behavior: each task can store `research/research.json`, `research/source-packs.json`, `research/notes.md`, `research/handoff.md`, and `info.md`; research records structured questions, findings, decisions, risks, reviewed/draft source packs, local file/range extraction, source confidence, freshness, and implementation/check handoff packets; summaries flow into context, handoff, snapshots, and spec proposals.
  - Boundary: Project Flow intentionally does not claim autonomous research or silently fetch/diff remote upstream sources; reviewed evidence is explicit and local/agent/user controlled.
  - Target behavior: add autonomous research-agent execution only if the runtime exposes a safe, auditable agent/session contract; keep review-first state ownership as the fallback.

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
  - Status: implemented locally, below ECC/OMO/Superpowers autonomous execution depth.
  - Current behavior: Project Flow detects likely verification commands, records verification events, blocks finish when checks are missing or failing, tracks opt-in remediation attempts with stop conditions and evidence, persists a verification policy matrix, classifies failed checks, and writes explicit next-action records without running commands silently.
  - Gap: it does not enforce a user-defined verification matrix or execute the self-fix loop automatically.
  - Target behavior: add configurable verification policies, richer rerun analysis, and safe self-fix integration only behind explicit user control.

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
