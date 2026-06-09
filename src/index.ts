import type { ExtensionAPI, ExtensionContext } from "@oh-my-pi/pi-coding-agent";
import type { ActiveTaskScope, AutoSubtaskMode, ClarificationAxis, ClarificationState, TaskRoleId, TaskRoleStatus, TaskState } from "./core";
import {
  advancePlan,
  addTaskResearchNote,
  answerTaskClarification,
  applySubtaskPlan,
  applySpecProposal,
  buildSubtaskTree,
  buildContextBundle,
  createSpecProposal,
  createChildTask,
  createTask,
  ensureProject,
  findProjectRoot,
  finishActiveTask,
  finishVerificationRemediationAttempt,
  formatAcceptanceSummary,
  formatClarificationPrompt,
  formatClarificationSummary,
  formatRoleOrchestrationSummary,
  formatProjectOverviewSummary,
  formatReadinessSummary,
  formatResearchSummary,
  formatVerificationRemediationSummary,
  formatSnapshotSummary,
  formatSpecProposalSummary,
  formatSubtaskPlanSummary,
  formatSubtaskTree,
  formatTaskMetadataSummary,
  formatTaskSummary,
  formatUpstreamSyncReport,
  formatUpstreamSyncSummary,
  formatUpstreamTaskPrompt,
  formatVerificationSuggestions,
  getOrCreateActiveTask,
  isCodeWorkPrompt,
  listSpecProposals,
  listTasks,
  loadActiveTask,
  nextPlanStep,
  pauseActiveTask,
  readAcceptance,
  readProjectAutoSubtaskMode,
  readPlan,
  readSpecDocuments,
  refreshSubtaskPlanArtifacts,
  readTaskClarification,
  readTaskInfo,
  readRoleOrchestration,
  readSubtaskPlan,
  readTaskReadiness,
  readTaskResearch,
  readVerificationStrategy,
  readVerificationRemediationPlan,
  readVerification,
  refreshVerificationStrategy,
  recordToolEvent,
  resolveTask,
  resolveSpecProposal,
  setActiveTask,
  setPlanStepStatus,
  shouldCaptureClarificationAnswer,
  skipTaskClarification,
  startTaskClarification,
  startPrdRefinement,
  startVerificationRemediationAttempt,
  summarizeUnknown,
  finishTaskClarification,
  updateRoleOrchestrationStatus,
  updateAcceptanceItem,
  writeTaskHandoff,
  writeRoleOrchestration,
  writeTaskInfo,
  writeSubtaskPlan,
  writeTaskReadiness,
  writeTaskResume,
  writeTaskSnapshot,
  updateUpstreamSource,
  writeProjectOverview,
  writeTurnJournal,
  writeVerificationRemediationPlan,
  writeUpstreamSyncReport,
  formatPlanSummary,
  formatTaskResume,
} from "./core";

export default function projectFlowExtension(pi: ExtensionAPI) {
  pi.setLabel("Project Flow");
  const pendingToolArgs = new Map<string, unknown>();

  pi.registerCommand("flow:init", {
    description: "Initialize .project-flow directories",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      await ensureProject(root);
      ctx.ui.notify(`Project Flow initialized at ${root}`, "info");
    },
  });

  pi.registerCommand("flow:status", {
    description: "Show active Project Flow task and spec count",
    handler: async (_args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const specs = await readSpecDocuments(root);
      const overview = await writeProjectOverview(root);
      const upstream = await writeUpstreamSyncReport(root, "status");
      const taskLine = overview.activeTaskId || "none";
      ctx.ui.notify(
        [
          "Project Flow",
          `Root: ${root}`,
          `Active task: ${taskLine}`,
          `Specs: ${specs.length}`,
          `Tasks: ${overview.totals.tasks}`,
          `Readiness: ${overview.totals.readyReadiness} ready, ${overview.totals.warningReadiness} warning, ${overview.totals.blockedReadiness} blocked`,
          `Proposed specs: ${overview.totals.proposedSpecs}`,
          `Upstream sync: ${upstream.totals.needsReview} sources need review, ${upstream.totals.missing} missing capability groups`,
        ].join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("flow:overview", {
    description: "Refresh and show the Project Flow overview",
    handler: async (_args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const overview = await writeProjectOverview(root);
      ctx.ui.notify(formatProjectOverviewSummary(overview), overview.totals.blockedReadiness > 0 ? "warning" : "info");
    },
  });

  pi.registerCommand("task:new", {
    description: "Create a Project Flow task from the provided prompt",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const prompt = args.trim() || "Manual project task";
      const task = await createTask(root, prompt, { subtaskMode: await readProjectAutoSubtaskMode(root), activeScope: activeTaskScopeFromContext(ctx) });
      ctx.ui.notify(`Created task ${task.id}`, "info");
    },
  });

  pi.registerCommand("task:continue", {
    description: "Ask the agent to continue the active Project Flow task",
    handler: async (_args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No active Project Flow task. Use /task:new or ask for code work.", "warning");
        return;
      }
      pi.sendMessage(
        {
          customType: "project-flow-continue",
          content: `Continue Project Flow task ${task.id}. Follow the project loop: inspect relevant specs, plan the next smallest step, implement, verify, and summarize.`,
          display: true,
        },
        { triggerTurn: true },
      );
    },
  });

  pi.registerCommand("task:resume", {
    description: "Resume a Project Flow task from its latest resume pack",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const resume = await writeTaskResume(root, task, "command");
      pi.sendMessage(
        {
          customType: "project-flow-resume",
          content: [
            `Continue Project Flow task ${task.id} from the resume pack below.`,
            "Use the next action as the starting point, inspect touched files if relevant, update plan and acceptance state as work progresses, run targeted verification, and summarize the outcome.",
            "",
            formatTaskResume(task, resume),
          ].join("\n"),
          display: true,
        },
        { triggerTurn: true },
      );
    },
  });

  pi.registerCommand("task:list", {
    description: "List Project Flow tasks in this project",
    handler: async (_args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const tasks = await listTasks(root);
      if (tasks.length === 0) {
        ctx.ui.notify("No Project Flow tasks found.", "info");
        return;
      }
      ctx.ui.notify(
        [
          "Project Flow tasks:",
          ...tasks.slice(0, 12).map(task => `- ${task.id} [${task.status}/${task.phase}] ${task.title}`),
          tasks.length > 12 ? `...and ${tasks.length - 12} more` : undefined,
        ].filter(Boolean).join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("task:status", {
    description: "Show the active Project Flow task status",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const verification = await readVerification(root, task.id);
      const acceptance = await readAcceptance(root, task.id);
      const plan = await readPlan(root, task.id);
      const strategy = await readVerificationStrategy(root, task.id);
      const readiness = await writeTaskReadiness(root, task, "status");
      ctx.ui.notify(formatTaskSummary(task, verification, acceptance, plan, strategy, readiness), "info");
    },
  });

  pi.registerCommand("task:readiness", {
    description: "Show whether a Project Flow task is ready to finish",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const readiness = await writeTaskReadiness(root, task, "command");
      ctx.ui.notify(formatReadinessSummary(readiness), readiness.status === "blocked" ? "warning" : "info");
    },
  });

  pi.registerCommand("task:snapshot", {
    description: "Refresh and show a Project Flow task snapshot",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const snapshot = await writeTaskSnapshot(root, task, "command");
      ctx.ui.notify(formatSnapshotSummary(snapshot), "info");
    },
  });

  pi.registerCommand("task:show", {
    description: "Show a Project Flow task by id prefix or title fragment",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const query = args.trim();
      if (!query) {
        ctx.ui.notify("Provide a task id prefix or title fragment. Use /task:list first if needed.", "warning");
        return;
      }
      const result = await resolveTask(root, query);
      if (result.status === "ambiguous") {
        ctx.ui.notify(formatAmbiguousTasks(result.matches), "warning");
        return;
      }
      if (!result.task) {
        ctx.ui.notify(`No Project Flow task matched "${query}".`, "warning");
        return;
      }
      const verification = await readVerification(root, result.task.id);
      const acceptance = await readAcceptance(root, result.task.id);
      const plan = await readPlan(root, result.task.id);
      const strategy = await readVerificationStrategy(root, result.task.id);
      const readiness = await writeTaskReadiness(root, result.task, "show");
      ctx.ui.notify(formatTaskSummary(result.task, verification, acceptance, plan, strategy, readiness), "info");
    },
  });

  pi.registerCommand("task:switch", {
    description: "Switch the active Project Flow task by id prefix or title fragment",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const query = args.trim();
      if (!query) {
        ctx.ui.notify("Provide a task id prefix or title fragment. Use /task:list first if needed.", "warning");
        return;
      }
      const result = await resolveTask(root, query);
      if (result.status === "ambiguous") {
        ctx.ui.notify(formatAmbiguousTasks(result.matches), "warning");
        return;
      }
      if (!result.task) {
        ctx.ui.notify(`No Project Flow task matched "${query}".`, "warning");
        return;
      }
      const task = await setActiveTask(root, result.task.id, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify(`Could not activate task ${result.task.id}.`, "warning");
        return;
      }
      ctx.ui.notify(`Active Project Flow task: ${task.id}`, "info");
      await refreshStatus(ctx);
    },
  });

  pi.registerCommand("task:finish", {
    description: "Finish the active Project Flow task and write a journal entry",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const activeScope = activeTaskScopeFromContext(ctx);
      const active = await loadActiveTask(root, activeScope);
      const verification = active ? await readVerification(root, active.id) : undefined;
      const parsed = parseFinishArgs(args);
      const task = await finishActiveTask(root, parsed.note, { force: parsed.force, activeScope });
      if (!task) {
        if (!active) {
          ctx.ui.notify("No active Project Flow task to finish.", "warning");
          return;
        }
        const readiness = (await readTaskReadiness(root, active.id)) || await writeTaskReadiness(root, active, "finish_blocked");
        ctx.ui.notify(
          [
            `Finish blocked for ${active.id}. Use /task:readiness for details or /task:finish --force to override.`,
            formatReadinessSummary(readiness, 6),
          ].join("\n"),
          "warning",
        );
        return;
      }
      const verificationNote = verification && verification.checks.length === 0
        ? "\nNo verification checks were recorded for this task."
        : "";
      const forcedNote = parsed.force ? "\nFinished with --force." : "";
      ctx.ui.notify(`Finished task ${task.id}${verificationNote}${forcedNote}`, "info");
    },
  });

  pi.registerCommand("task:pause", {
    description: "Pause the active Project Flow task without archiving it",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await pauseActiveTask(root, args.trim() || undefined, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No active Project Flow task to pause.", "warning");
        return;
      }
      ctx.ui.notify(`Paused task ${task.id}`, "info");
    },
  });

  pi.registerCommand("task:handoff", {
    description: "Show or refresh the active Project Flow handoff summary",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const handoff = await writeTaskHandoff(root, task, "command");
      ctx.ui.notify(trimForNotice(handoff), "info");
    },
  });

  pi.registerCommand("task:info", {
    description: "Show or create the active Project Flow task info artifact",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const info = await writeTaskInfo(root, task, "command");
      ctx.ui.notify(trimForNotice(info), "info");
    },
  });

  pi.registerCommand("task:metadata", {
    description: "Show stable metadata for a Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      ctx.ui.notify(
        [
          `Metadata for ${task.id}:`,
          task.metadata ? formatTaskMetadataSummary(task.metadata, 12) : "No metadata recorded.",
        ].join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("task:child", {
    description: "Create a child task under the active Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const parent = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
      if (!parent) {
        ctx.ui.notify("No active Project Flow task. Use /task:new or /task:switch first.", "warning");
        return;
      }
      const prompt = args.trim();
      if (!prompt) {
        ctx.ui.notify("Provide a child task prompt.", "warning");
        return;
      }
      const child = await createChildTask(root, parent.id, prompt);
      if (!child) {
        ctx.ui.notify(`Could not create child task for ${parent.id}.`, "warning");
        return;
      }
      ctx.ui.notify(`Created child task ${child.id} under ${parent.id}`, "info");
    },
  });

  pi.registerCommand("task:tree", {
    description: "Show a Project Flow parent/child task tree",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const tree = await buildSubtaskTree(root, task.id);
      if (!tree) {
        ctx.ui.notify(`Could not build task tree for ${task.id}.`, "warning");
        return;
      }
      ctx.ui.notify(trimForNotice(formatSubtaskTree(tree), 5000), tree.blockedTasks.length > 0 ? "warning" : "info");
    },
  });

  pi.registerCommand("task:subtasks", {
    description: "Show, refresh, or apply the Project Flow subtask plan",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const parsed = parseSubtaskPlanArgs(args);
      const task = await getTaskFromArgsOrActive(root, parsed.query, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const effectiveMode = parsed.mode || await readProjectAutoSubtaskMode(root);
      if (parsed.action === "apply") {
        if (parsed.mode) await writeSubtaskPlan(root, task, parsed.mode, "command_mode");
        const result = await applySubtaskPlan(root, task.id);
        if (result.status === "missing") {
          ctx.ui.notify(`No matching Project Flow task for ${task.id}.`, "warning");
          return;
        }
        const plan = result.plan || await readSubtaskPlan(root, task.id);
        ctx.ui.notify(
          [
            result.created.length > 0
              ? `Created ${result.created.length} child task(s): ${result.created.map(child => child.id).join(", ")}`
              : "No suggested subtasks were available to create.",
            plan ? formatSubtaskPlanSummary(plan, 12) : undefined,
          ].filter(Boolean).join("\n"),
          result.created.length > 0 ? "info" : "warning",
        );
        return;
      }
      const shouldRegenerate = parsed.action === "refresh" || !!parsed.mode;
      const plan = shouldRegenerate
        ? await writeSubtaskPlan(root, task, effectiveMode, parsed.action === "refresh" ? "command_refresh" : "command_mode")
        : (await readSubtaskPlan(root, task.id)) || await writeSubtaskPlan(root, task, effectiveMode, "command");
      if ((parsed.mode === "auto" || (parsed.action === "refresh" && effectiveMode === "auto")) && plan.items.some(item => item.status === "suggested")) {
        const result = await applySubtaskPlan(root, task.id);
        await refreshSubtaskPlanArtifacts(root, task.id, "subtask_plan_auto_applied");
        ctx.ui.notify(
          [
            result.created.length > 0
              ? `Created ${result.created.length} child task(s): ${result.created.map(child => child.id).join(", ")}`
              : "No suggested subtasks were available to create.",
            result.plan ? formatSubtaskPlanSummary(result.plan, 12) : formatSubtaskPlanSummary(plan, 12),
          ].join("\n"),
          result.created.length > 0 ? "info" : "warning",
        );
        return;
      }
      await refreshSubtaskPlanArtifacts(root, task.id, parsed.action === "refresh" ? "subtask_plan_refreshed" : "subtask_plan_shown");
      ctx.ui.notify(formatSubtaskPlanSummary(plan, 12), plan.items.length > 0 ? "info" : "warning");
    },
  });

  pi.registerCommand("task:roles", {
    description: "Show, refresh, or update Project Flow role handoffs",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const parsed = parseRoleOrchestrationArgs(args);
      const task = await getTaskFromArgsOrActive(root, parsed.query, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      if (parsed.action === "start" || parsed.action === "done" || parsed.action === "block") {
        if (!parsed.role) {
          ctx.ui.notify("Usage: /task:roles [id] --start|--done|--block <research|implement|check> [note]", "warning");
          return;
        }
        const status: TaskRoleStatus = parsed.action === "start" ? "in_progress" : parsed.action === "done" ? "done" : "blocked";
        const result = await updateRoleOrchestrationStatus(root, task.id, parsed.role, status, parsed.note);
        if (result.status !== "updated" || !result.plan || !result.role) {
          ctx.ui.notify(result.status === "missing" ? `No matching Project Flow task for ${task.id}.` : `Unknown role ${parsed.role}.`, "warning");
          return;
        }
        ctx.ui.notify([
          `Updated role ${result.role.id} -> ${result.role.status}`,
          formatRoleOrchestrationSummary(result.plan, 3),
        ].join("\n"), result.role.status === "blocked" ? "warning" : "info");
        return;
      }
      const roles = parsed.action === "refresh"
        ? await writeRoleOrchestration(root, task, "command_refresh")
        : (await readRoleOrchestration(root, task.id)) || await writeRoleOrchestration(root, task, "command");
      if (parsed.action === "refresh") {
        await writeTaskInfo(root, task, "role_orchestration_refreshed", { refreshRoles: true });
        await writeTaskSnapshot(root, task, "role_orchestration_refreshed");
        await writeTaskHandoff(root, task, "role_orchestration_refreshed");
      }
      ctx.ui.notify(formatRoleOrchestrationSummary(roles, 3), roles.roles.some(role => role.status === "blocked") ? "warning" : "info");
    },
  });

  pi.registerCommand("task:clarify", {
    description: "Show, answer, skip, or finish the active Project Flow clarification loop",
    handler: async (args, ctx) => {
      await handleTaskClarifyCommand(pi, ctx, args);
    },
  });

  pi.registerCommand("clarify:start", {
    description: "Start PRD clarification for a Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const parsed = parseClarifyStartArgs(args);
      const task = await getTaskFromArgsOrActive(root, parsed.query, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const state = await startTaskClarification(root, task.id, { maxQuestions: parsed.maxQuestions });
      if (!state) {
        ctx.ui.notify(`Could not start clarification for ${task.id}.`, "warning");
        return;
      }
      ctx.ui.notify(formatClarificationSummary(state, 12), "info");
      sendClarificationPrompt(pi, task, state);
    },
  });

  pi.registerCommand("clarify:status", {
    description: "Show PRD clarification status for a Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const state = await readTaskClarification(root, task.id);
      ctx.ui.notify(state ? formatClarificationSummary(state, 12) : `No clarification artifact recorded for ${task.id}.`, "info");
    },
  });

  pi.registerCommand("clarify:answer", {
    description: "Answer the current PRD clarification question",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No active Project Flow task. Use /task:switch or /task:new first.", "warning");
        return;
      }
      const answer = args.trim();
      if (!answer) {
        ctx.ui.notify("Provide an answer for the current clarification question.", "warning");
        return;
      }
      const result = await answerTaskClarification(root, task.id, answer);
      notifyClarificationResult(pi, ctx, task, result);
    },
  });

  pi.registerCommand("clarify:skip", {
    description: "Skip the current PRD clarification question",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No active Project Flow task. Use /task:switch or /task:new first.", "warning");
        return;
      }
      const result = await skipTaskClarification(root, task.id, args.trim() || undefined);
      notifyClarificationResult(pi, ctx, task, result);
    },
  });

  pi.registerCommand("clarify:finish", {
    description: "Finish PRD clarification without finishing the task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No active Project Flow task. Use /task:switch or /task:new first.", "warning");
        return;
      }
      const parsed = parseClarifyFinishArgs(args);
      const result = await finishTaskClarification(root, task.id, parsed);
      notifyClarificationResult(pi, ctx, task, result);
    },
  });

  pi.registerCommand("prd:refine", {
    description: "Run the focused PRD refinement loop for a Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const parsed = parsePrdRefineArgs(args);
      const task = await getTaskFromArgsOrActive(root, parsed.query, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const state = await startPrdRefinement(root, task.id, { maxQuestions: parsed.maxQuestions, requiredAxes: parsed.requiredAxes });
      if (!state) {
        ctx.ui.notify(`Could not start PRD refinement for ${task.id}.`, "warning");
        return;
      }
      ctx.ui.notify(formatClarificationSummary(state, 12), state.status === "collecting" ? "warning" : "info");
      sendClarificationPrompt(pi, task, state);
    },
  });

  pi.registerCommand("research:status", {
    description: "Show Project Flow research notes for a task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const research = await readTaskResearch(root, task.id);
      const info = await readTaskInfo(root, task.id);
      ctx.ui.notify(
        [
          `Research for ${task.id}:`,
          research ? formatResearchSummary(research, 12) : "No research artifact recorded yet.",
          info ? "info.md: available" : "info.md: missing",
        ].join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("research:add", {
    description: "Add a research note to the active Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No active Project Flow task. Use /task:new or /task:switch first.", "warning");
        return;
      }
      const note = args.trim();
      if (!note) {
        ctx.ui.notify("Provide a research note to add.", "warning");
        return;
      }
      const research = await addTaskResearchNote(root, task.id, note);
      if (!research) {
        ctx.ui.notify(`Could not update research for ${task.id}.`, "warning");
        return;
      }
      ctx.ui.notify(formatResearchSummary(research, 8), "info");
    },
  });

  pi.registerCommand("plan:status", {
    description: "Show the active Project Flow plan",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const plan = await readPlan(root, task.id);
      const next = nextPlanStep(plan);
      ctx.ui.notify(
        [
          `Plan for ${task.id}:`,
          formatPlanSummary(plan, 20),
          next ? `Next: ${next.id} - ${next.text}` : "Next: complete",
        ].join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("plan:next", {
    description: "Show the next Project Flow plan step",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const next = nextPlanStep(await readPlan(root, task.id));
      ctx.ui.notify(next ? `${next.id}: ${next.text}` : "Plan is complete.", "info");
    },
  });

  pi.registerCommand("plan:done", {
    description: "Mark the current or selected plan step done: /plan:done [P1] [evidence]",
    handler: async (args, ctx) => {
      await updatePlanFromCommand(ctx, args, "done");
    },
  });

  pi.registerCommand("plan:block", {
    description: "Mark the current or selected plan step blocked: /plan:block [P1] [reason]",
    handler: async (args, ctx) => {
      await updatePlanFromCommand(ctx, args, "blocked");
    },
  });

  pi.registerCommand("plan:open", {
    description: "Reopen or activate a selected plan step: /plan:open P1 [note]",
    handler: async (args, ctx) => {
      await updatePlanFromCommand(ctx, args, "active");
    },
  });

  pi.registerCommand("spec:update", {
    description: "Create a Project Flow spec proposal from the active task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No active task. Spec updates are tied to task learnings.", "warning");
        return;
      }
      const proposal = await createSpecProposal(root, task.id, args.trim() || undefined);
      if (!proposal) {
        ctx.ui.notify("Could not create a Project Flow spec proposal.", "warning");
        return;
      }
      ctx.ui.notify(`Created spec proposal ${proposal.id}. Use /spec:apply ${proposal.id} to apply it.`, "info");
    },
  });

  pi.registerCommand("spec:proposals", {
    description: "List Project Flow spec proposals",
    handler: async (_args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const proposals = await listSpecProposals(root);
      ctx.ui.notify(formatSpecProposalSummary(proposals, 12), "info");
    },
  });

  pi.registerCommand("spec:show", {
    description: "Show a Project Flow spec proposal by id prefix or title fragment",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const query = args.trim();
      if (!query) {
        ctx.ui.notify("Provide a spec proposal id prefix or title fragment.", "warning");
        return;
      }
      const resolved = await resolveSpecProposal(root, query);
      if (resolved.status === "ambiguous") {
        ctx.ui.notify(
          [
            "More than one spec proposal matched:",
            ...resolved.matches.slice(0, 8).map(item => `- ${item.id} [${item.status}] ${item.title}`),
          ].join("\n"),
          "warning",
        );
        return;
      }
      if (!resolved.proposal) {
        ctx.ui.notify(`No spec proposal matched "${query}".`, "warning");
        return;
      }
      ctx.ui.notify(trimForNotice(resolved.proposal.content), "info");
    },
  });

  pi.registerCommand("spec:apply", {
    description: "Apply a reviewed Project Flow spec proposal",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const query = args.trim();
      if (!query) {
        ctx.ui.notify("Provide a spec proposal id prefix or title fragment.", "warning");
        return;
      }
      const resolved = await resolveSpecProposal(root, query);
      if (resolved.status === "ambiguous") {
        ctx.ui.notify(
          [
            "More than one spec proposal matched:",
            ...resolved.matches.slice(0, 8).map(item => `- ${item.id} [${item.status}] ${item.title}`),
          ].join("\n"),
          "warning",
        );
        return;
      }
      if (!resolved.proposal) {
        ctx.ui.notify(`No spec proposal matched "${query}".`, "warning");
        return;
      }
      const applied = await applySpecProposal(root, resolved.proposal.id);
      if (!applied) {
        ctx.ui.notify(`Could not apply spec proposal ${resolved.proposal.id}.`, "warning");
        return;
      }
      ctx.ui.notify(`Applied spec proposal ${applied.id}.`, "info");
    },
  });

  pi.registerCommand("verify:status", {
    description: "Show verification checks recorded for the active Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const verification = await readVerification(root, task.id);
      if (verification.checks.length === 0) {
        ctx.ui.notify(`No verification checks recorded for ${task.id}.`, "info");
        return;
      }
      ctx.ui.notify(
        [
          `Verification for ${task.id}:`,
          ...verification.checks.slice(-8).map(check =>
            `- ${check.success ? "pass" : "fail"} ${check.command || check.toolName} (${check.timestamp})`,
          ),
        ].join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("verify:suggest", {
    description: "Show suggested verification commands for the active Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const strategy = await readVerificationStrategy(root, task.id);
      ctx.ui.notify(
        [
          `Verification suggestions for ${task.id}:`,
          formatVerificationSuggestions(strategy, 12),
        ].join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("verify:refresh", {
    description: "Rescan project files and refresh suggested verification commands",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const strategy = await refreshVerificationStrategy(root, task.id);
      await writeTaskHandoff(root, task, "verify_refresh");
      ctx.ui.notify(
        [
          `Refreshed verification suggestions for ${task.id}:`,
          formatVerificationSuggestions(strategy, 12),
        ].join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("verify:remediate", {
    description: "Show or advance the opt-in verification remediation loop",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const parsed = parseVerificationRemediationArgs(args);
      const task = await getTaskFromArgsOrActive(root, parsed.query, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      if (parsed.action === "start") {
        const result = await startVerificationRemediationAttempt(root, task.id, parsed.note);
        await writeTaskInfo(root, task, "verification_remediation_started", { refreshRemediation: true });
        await writeTaskSnapshot(root, task, "verification_remediation_started");
        await writeTaskHandoff(root, task, "verification_remediation_started");
        ctx.ui.notify(result.plan ? formatVerificationRemediationSummary(result.plan) : `Could not start remediation for ${task.id}.`, result.status === "limit_reached" ? "warning" : "info");
        return;
      }
      if (parsed.action === "pass" || parsed.action === "fail" || parsed.action === "stop") {
        const status = parsed.action === "pass" ? "passed" : parsed.action === "fail" ? "failed" : "stopped";
        const result = await finishVerificationRemediationAttempt(root, task.id, status, parsed.note);
        await writeTaskInfo(root, task, "verification_remediation_finished", { refreshRemediation: true });
        await writeTaskSnapshot(root, task, "verification_remediation_finished");
        await writeTaskHandoff(root, task, "verification_remediation_finished");
        ctx.ui.notify(result.plan ? formatVerificationRemediationSummary(result.plan) : `Could not update remediation for ${task.id}.`, result.status === "no_active_attempt" || status !== "passed" ? "warning" : "info");
        return;
      }
      const remediation = parsed.action === "refresh"
        ? await writeVerificationRemediationPlan(root, task, "command_refresh")
        : (await readVerificationRemediationPlan(root, task.id)) || await writeVerificationRemediationPlan(root, task, "command");
      if (parsed.action === "refresh") {
        await writeTaskInfo(root, task, "verification_remediation_refreshed", { refreshRemediation: true });
        await writeTaskSnapshot(root, task, "verification_remediation_refreshed");
        await writeTaskHandoff(root, task, "verification_remediation_refreshed");
      }
      ctx.ui.notify(formatVerificationRemediationSummary(remediation), remediation.status === "stopped" ? "warning" : "info");
    },
  });

  pi.registerCommand("acceptance:status", {
    description: "Show acceptance criteria for the active Project Flow task",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const task = await getTaskFromArgsOrActive(root, args, activeTaskScopeFromContext(ctx));
      if (!task) {
        ctx.ui.notify("No matching Project Flow task. Use /task:list to inspect tasks.", "warning");
        return;
      }
      const acceptance = await readAcceptance(root, task.id);
      ctx.ui.notify(`Acceptance for ${task.id}:\n${formatAcceptanceSummary(acceptance, 20)}`, "info");
    },
  });

  pi.registerCommand("acceptance:done", {
    description: "Mark an acceptance criterion done: /acceptance:done A1 [evidence]",
    handler: async (args, ctx) => {
      await updateAcceptanceFromCommand(ctx, args, "done");
    },
  });

  pi.registerCommand("acceptance:block", {
    description: "Mark an acceptance criterion blocked: /acceptance:block A1 [reason]",
    handler: async (args, ctx) => {
      await updateAcceptanceFromCommand(ctx, args, "blocked");
    },
  });

  pi.registerCommand("acceptance:open", {
    description: "Reopen an acceptance criterion: /acceptance:open A1 [note]",
    handler: async (args, ctx) => {
      await updateAcceptanceFromCommand(ctx, args, "open");
    },
  });

  pi.registerCommand("sources:check", {
    description: "Show upstream inspiration sources tracked by this plugin",
    handler: async (_args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const report = await writeUpstreamSyncReport(root, "sources_check");
      ctx.ui.notify(
        [
          "Project Flow source policy:",
          "- Project specs: durable rules and acceptance context",
          "- OMO: task state and resume workflow inspiration",
          "- ECC: hooks, skills, and audit pack inspiration",
          "- Upstream packs are not executed automatically",
          "",
          formatUpstreamSyncSummary(report, 4),
        ].join("\n"),
        "info",
      );
    },
  });

  pi.registerCommand("upstream:status", {
    description: "Refresh and show Project Flow upstream sync status",
    handler: async (_args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const report = await writeUpstreamSyncReport(root, "command");
      ctx.ui.notify(formatUpstreamSyncSummary(report), report.totals.needsReview > 0 ? "warning" : "info");
    },
  });

  pi.registerCommand("upstream:report", {
    description: "Refresh and show the full Project Flow upstream sync report",
    handler: async (_args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const report = await writeUpstreamSyncReport(root, "command");
      ctx.ui.notify(trimForNotice(formatUpstreamSyncReport(report), 5000), report.totals.needsReview > 0 ? "warning" : "info");
    },
  });

  pi.registerCommand("upstream:review", {
    description: "Mark an upstream source reviewed: /upstream:review <source-id> <reference> [note]",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const parsed = parseUpstreamReviewArgs(args);
      if (!parsed.sourceId || !parsed.reference) {
        ctx.ui.notify("Usage: /upstream:review <source-id> <reference> [note]", "warning");
        return;
      }
      const result = await updateUpstreamSource(root, parsed.sourceId, parsed.reference, parsed.note);
      if (result.status === "missing") {
        ctx.ui.notify(`No upstream source matched "${parsed.sourceId}".`, "warning");
        return;
      }
      ctx.ui.notify(
        [
          `Reviewed upstream source ${result.source?.id}: ${result.source?.reference}`,
          formatUpstreamSyncSummary(result.report, 4),
        ].join("\n"),
        result.report.totals.needsReview > 0 ? "warning" : "info",
      );
    },
  });

  pi.registerCommand("upstream:sync", {
    description: "Create a Project Flow task to review tracked upstream changes",
    handler: async (args, ctx) => {
      const root = await findProjectRoot(ctx.cwd);
      const report = await writeUpstreamSyncReport(root, "sync_task");
      const note = args.trim() || undefined;
      const task = await createTask(root, formatUpstreamTaskPrompt(report, note), {
        kind: "upstream-sync",
        source: "upstream_sync",
        labels: ["upstream"],
        risk: report.totals.missing > 0 ? "medium" : "low",
        origin: { note: note || "upstream sync command" },
        subtaskMode: await readProjectAutoSubtaskMode(root),
        activeScope: activeTaskScopeFromContext(ctx),
      });
      ctx.ui.notify(`Created upstream sync task ${task.id}`, "info");
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    await refreshStatus(ctx);
  });

  pi.on("before_agent_start", async (event, ctx) => {
    const root = await findProjectRoot(ctx.cwd);
    const prompt = event.prompt || "";
    const activeScope = activeTaskScopeFromContext(ctx);
    const active = await loadActiveTask(root, activeScope);
    const specs = await readSpecDocuments(root);
    const subtaskMode = await readProjectAutoSubtaskMode(root);

    let task = active;
    const activeClarification = task ? await readTaskClarification(root, task.id) : undefined;
    if (task && task.status === "active" && shouldCaptureClarificationAnswer(activeClarification, prompt)) {
      task = await getOrCreateActiveTask(root, prompt, { subtaskMode, activeScope });
      await answerTaskClarification(root, task.id, prompt, "user_prompt");
    } else if (!task && isCodeWorkPrompt(prompt)) {
      task = await getOrCreateActiveTask(root, prompt, { subtaskMode, activeScope });
      ctx.ui.notify(`Project Flow started ${task.id}`, "info");
    } else if (task && task.status === "active") {
      task = await getOrCreateActiveTask(root, prompt, { subtaskMode, activeScope });
    }

    if (!task && specs.length === 0) return undefined;

    const bundle = await buildContextBundle(root, prompt, task);
    await refreshStatus(ctx);

    return {
      message: {
        customType: "project-flow",
        content: bundle.content,
        display: false,
        details: {
          root,
          taskId: task?.id,
          specCount: bundle.specs.length,
          acceptanceCount: bundle.acceptance?.items.length,
          specs: bundle.specs.map(spec => spec.relativePath),
        },
      },
    };
  });

  pi.on("tool_execution_start", async (event, ctx) => {
    const root = await findProjectRoot(ctx.cwd);
    pendingToolArgs.set(event.toolCallId, event.args);
    await recordToolEvent(root, "tool_start", {
      toolName: event.toolName,
      toolCallId: event.toolCallId,
      args: event.args,
    }, activeTaskScopeFromContext(ctx));
  });

  pi.on("tool_execution_end", async (event, ctx) => {
    const root = await findProjectRoot(ctx.cwd);
    const args = pendingToolArgs.get(event.toolCallId);
    pendingToolArgs.delete(event.toolCallId);
    await recordToolEvent(root, "tool_end", {
      toolName: event.toolName,
      toolCallId: event.toolCallId,
      args,
      isError: event.isError,
      resultSummary: summarizeUnknown(event.result),
    }, activeTaskScopeFromContext(ctx));
    await refreshStatus(ctx);
  });

  pi.on("agent_end", async (_event, ctx) => {
    const root = await findProjectRoot(ctx.cwd);
    await writeTurnJournal(root, "agent_end", activeTaskScopeFromContext(ctx));
    await refreshStatus(ctx);
  });

  pi.on("session_before_compact", async (_event, ctx) => {
    const root = await findProjectRoot(ctx.cwd);
    await writeTurnJournal(root, "before_compact", activeTaskScopeFromContext(ctx));
    return undefined;
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    const root = await findProjectRoot(ctx.cwd);
    await writeTurnJournal(root, "shutdown", activeTaskScopeFromContext(ctx));
  });

  async function refreshStatus(ctx: ExtensionContext): Promise<void> {
    const root = await findProjectRoot(ctx.cwd);
    const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
    if (!task || task.status !== "active") {
      ctx.ui.setStatus("project-flow", undefined);
      return;
    }
    ctx.ui.setStatus("project-flow", `flow ${task.phase}`);
  }

  async function getTaskFromArgsOrActive(root: string, args: string, scope?: ActiveTaskScope) {
    const query = args.trim();
    if (!query) return loadActiveTask(root, scope);
    const result = await resolveTask(root, query);
    if (result.status === "found") return result.task;
    return undefined;
  }

  function activeTaskScopeFromContext(ctx: ExtensionContext): ActiveTaskScope {
    const raw = ctx as ExtensionContext & {
      sessionId?: string;
      sessionPath?: string;
      sessionManager?: { getSessionId?: () => string | undefined; getSessionFile?: () => string | undefined; getSessionDir?: () => string | undefined };
    };
    const id = raw.sessionManager?.getSessionId?.() || raw.sessionId || raw.sessionPath || raw.sessionManager?.getSessionFile?.() || raw.sessionManager?.getSessionDir?.();
    return id ? { kind: "session", id } : { kind: "project" };
  }

  async function handleTaskClarifyCommand(pi: ExtensionAPI, ctx: ExtensionContext, args: string): Promise<void> {
    const root = await findProjectRoot(ctx.cwd);
    const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
    if (!task) {
      ctx.ui.notify("No active Project Flow task. Use /task:new or /task:switch first.", "warning");
      return;
    }

    const trimmed = args.trim();
    if (!trimmed || trimmed === "--status") {
      const state = await readTaskClarification(root, task.id);
      if (!state) {
        ctx.ui.notify(`No clarification artifact recorded for ${task.id}. Use /clarify:start or /prd:refine to enable one.`, "info");
        return;
      }
      ctx.ui.notify(formatClarificationSummary(state, 12), "info");
      if (state.status === "collecting") sendClarificationPrompt(pi, task, state);
      return;
    }

    if (trimmed === "--start") {
      const state = await startTaskClarification(root, task.id);
      if (!state) {
        ctx.ui.notify(`Could not start clarification for ${task.id}.`, "warning");
        return;
      }
      ctx.ui.notify(formatClarificationSummary(state, 12), "info");
      sendClarificationPrompt(pi, task, state);
      return;
    }

    if (trimmed === "--refine") {
      const state = await startPrdRefinement(root, task.id);
      if (!state) {
        ctx.ui.notify(`Could not start PRD refinement for ${task.id}.`, "warning");
        return;
      }
      ctx.ui.notify(formatClarificationSummary(state, 12), state.status === "collecting" ? "warning" : "info");
      sendClarificationPrompt(pi, task, state);
      return;
    }

    if (/^--skip(?:\s|$)/i.test(trimmed)) {
      const note = trimmed.replace(/^--skip\s*/i, "").trim() || undefined;
      const result = await skipTaskClarification(root, task.id, note);
      notifyClarificationResult(pi, ctx, task, result);
      return;
    }

    if (/^(--ready|--finish)(?:\s|$)/i.test(trimmed)) {
      const force = /(?:^|\s)--force(?:\s|$)/i.test(trimmed);
      const note = trimmed.replace(/^(--ready|--finish)\s*/i, "").replace(/(?:^|\s)--force(?:\s|$)/i, " ").trim() || undefined;
      const result = await finishTaskClarification(root, task.id, { force, note });
      notifyClarificationResult(pi, ctx, task, result);
      return;
    }

    const result = await answerTaskClarification(root, task.id, trimmed);
    notifyClarificationResult(pi, ctx, task, result);
  }

  function notifyClarificationResult(
    pi: ExtensionAPI,
    ctx: ExtensionContext,
    task: TaskState,
    result: Awaited<ReturnType<typeof answerTaskClarification>>,
  ): void {
    if (result.status === "missing") {
      ctx.ui.notify("No active Project Flow task matched the clarification update.", "warning");
      return;
    }
    if (result.status === "blocked") {
      const open = result.openQuestions.map(question => `- ${question.id}: ${question.text}`).join("\n");
      ctx.ui.notify(
        open ? `Clarification is blocked until open questions are handled:\n${open}` : "No current clarification question is available.",
        "warning",
      );
      return;
    }
    if (!result.state) {
      ctx.ui.notify("Clarification did not return an updated state.", "warning");
      return;
    }
    ctx.ui.notify(formatClarificationSummary(result.state, 12), result.state.status === "collecting" ? "warning" : "info");
    sendClarificationPrompt(pi, task, result.state);
  }

  function sendClarificationPrompt(
    pi: ExtensionAPI,
    task: TaskState,
    state: ClarificationState,
  ): void {
    if (state.status !== "collecting") return;
    pi.sendMessage(
      {
        customType: "project-flow-clarify",
        content: formatClarificationPrompt(task, state),
        display: true,
      },
      { triggerTurn: true },
    );
  }

  async function updateAcceptanceFromCommand(
    ctx: ExtensionContext,
    args: string,
    status: "open" | "done" | "blocked",
  ): Promise<void> {
    const root = await findProjectRoot(ctx.cwd);
    const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
    if (!task) {
      ctx.ui.notify("No active Project Flow task. Use /task:switch or ask for code work first.", "warning");
      return;
    }

    const { query, evidence } = parseAcceptanceArgs(args);
    if (!query) {
      ctx.ui.notify("Provide an acceptance id or text fragment, for example /acceptance:done A1 verified by bun test.", "warning");
      return;
    }

    const result = await updateAcceptanceItem(root, task.id, query, status, evidence);
    if (result.status === "missing") {
      ctx.ui.notify(`No acceptance item matched "${query}".`, "warning");
      return;
    }
    if (result.status === "ambiguous") {
      ctx.ui.notify(
        [
          "More than one acceptance item matched:",
          ...result.matches.slice(0, 8).map(item => `- ${item.id}: ${item.text}`),
        ].join("\n"),
        "warning",
      );
      return;
    }

    ctx.ui.notify(`Acceptance ${result.item?.id} marked ${status}.`, "info");
  }

  async function updatePlanFromCommand(
    ctx: ExtensionContext,
    args: string,
    status: "active" | "done" | "blocked",
  ): Promise<void> {
    const root = await findProjectRoot(ctx.cwd);
    const task = await loadActiveTask(root, activeTaskScopeFromContext(ctx));
    if (!task) {
      ctx.ui.notify("No active Project Flow task. Use /task:switch or ask for code work first.", "warning");
      return;
    }

    const { query, evidence } = parsePlanArgs(args);
    const result = query
      ? await setPlanStepStatus(root, task.id, query, status, evidence)
      : status === "done"
        ? await advancePlan(root, task.id, evidence)
        : await setPlanStepStatus(root, task.id, (nextPlanStep(await readPlan(root, task.id))?.id || ""), status, evidence);

    if (result.status === "missing") {
      ctx.ui.notify(query ? `No plan step matched "${query}".` : "No active or pending plan step.", "warning");
      return;
    }
    if (result.status === "ambiguous") {
      ctx.ui.notify(
        [
          "More than one plan step matched:",
          ...result.matches.slice(0, 8).map(step => `- ${step.id}: ${step.text}`),
        ].join("\n"),
        "warning",
      );
      return;
    }

    const next = nextPlanStep(result.state);
    ctx.ui.notify(
      [
        `Plan ${result.step?.id} marked ${status}.`,
        next ? `Next: ${next.id} - ${next.text}` : "Plan is complete.",
      ].join("\n"),
      "info",
    );
  }

  function parseAcceptanceArgs(args: string): { query: string; evidence?: string } {
    const trimmed = args.trim();
    if (!trimmed) return { query: "" };
    const parts = trimmed.split(/\s+/);
    const query = parts.shift() || "";
    const evidence = parts.join(" ").trim() || undefined;
    return { query, evidence };
  }

  function parsePlanArgs(args: string): { query: string; evidence?: string } {
    const trimmed = args.trim();
    if (!trimmed) return { query: "" };
    const parts = trimmed.split(/\s+/);
    const first = parts[0] || "";
    if (/^(p?\d+)$/i.test(first) || /^p\d+$/i.test(first)) {
      return { query: parts.shift() || "", evidence: parts.join(" ").trim() || undefined };
    }
    return { query: "", evidence: trimmed };
  }

  function parseSubtaskPlanArgs(args: string): { action: "show" | "refresh" | "apply"; query: string; mode?: AutoSubtaskMode } {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    let action: "show" | "refresh" | "apply" = "show";
    let mode: AutoSubtaskMode | undefined;
    const queryParts: string[] = [];
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part === "--apply" || part === "apply") {
        action = "apply";
        continue;
      }
      if (part === "--refresh" || part === "refresh") {
        action = "refresh";
        continue;
      }
      if (part === "--auto") {
        mode = "auto";
        continue;
      }
      if (part === "--suggest") {
        mode = "suggest";
        continue;
      }
      if (part === "--off") {
        mode = "off";
        continue;
      }
      if (part === "--mode" && isSubtaskModeArg(parts[i + 1])) {
        mode = parts[i + 1];
        i += 1;
        continue;
      }
      const modeMatch = part.match(/^--mode=(off|suggest|auto)$/);
      if (modeMatch) {
        mode = modeMatch[1] as AutoSubtaskMode;
        continue;
      }
      queryParts.push(part);
    }
    return { action, mode, query: queryParts.join(" ") };
  }

  function parseRoleOrchestrationArgs(args: string): { action: "show" | "refresh" | "start" | "done" | "block"; query: string; role?: TaskRoleId; note?: string } {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    let action: "show" | "refresh" | "start" | "done" | "block" = "show";
    let role: TaskRoleId | undefined;
    const queryParts: string[] = [];
    const noteParts: string[] = [];
    let collectingNote = false;
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (collectingNote) {
        noteParts.push(part);
        continue;
      }
      if (part === "--refresh" || part === "refresh") {
        action = "refresh";
        continue;
      }
      if (part === "--start" || part === "start" || part === "--done" || part === "done" || part === "--block" || part === "block") {
        action = part.replace(/^--/, "") as "start" | "done" | "block";
        if (isTaskRoleArg(parts[i + 1])) {
          role = parts[i + 1];
          i += 1;
          collectingNote = true;
        }
        continue;
      }
      queryParts.push(part);
    }
    return { action, query: queryParts.join(" "), role, note: noteParts.join(" ").trim() || undefined };
  }

  function isTaskRoleArg(value: string | undefined): value is TaskRoleId {
    return value === "research" || value === "implement" || value === "check";
  }

  function isSubtaskModeArg(value: string | undefined): value is AutoSubtaskMode {
    return value === "off" || value === "suggest" || value === "auto";
  }

  function parseVerificationRemediationArgs(args: string): { action: "show" | "refresh" | "start" | "pass" | "fail" | "stop"; query: string; note?: string } {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    let action: "show" | "refresh" | "start" | "pass" | "fail" | "stop" = "show";
    const queryParts: string[] = [];
    const noteParts: string[] = [];
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i];
      if (part === "--refresh" || part === "refresh") {
        action = "refresh";
        continue;
      }
      if (part === "--start" || part === "start" || part === "--pass" || part === "pass" || part === "--fail" || part === "fail" || part === "--stop" || part === "stop") {
        action = part.includes("start") ? "start" : part.includes("pass") ? "pass" : part.includes("fail") ? "fail" : "stop";
        noteParts.push(...parts.slice(i + 1));
        break;
      }
      queryParts.push(part);
    }
    return { action, query: queryParts.join(" "), note: noteParts.join(" ").trim() || undefined };
  }


  function parseFinishArgs(args: string): { note?: string; force: boolean } {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    const force = parts.some(part => part === "--force");
    const note = parts.filter(part => part !== "--force").join(" ").trim();
    return { note: note || undefined, force };
  }

  function parseClarifyStartArgs(args: string): { query: string; maxQuestions?: number } {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    let maxQuestions: number | undefined;
    const queryParts: string[] = [];
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part === "--max") {
        const next = Number(parts[index + 1]);
        if (Number.isFinite(next)) maxQuestions = next;
        index += 1;
        continue;
      }
      if (part.startsWith("--max=")) {
        const next = Number(part.slice("--max=".length));
        if (Number.isFinite(next)) maxQuestions = next;
        continue;
      }
      queryParts.push(part);
    }
    return { query: queryParts.join(" "), maxQuestions };
  }

  function parsePrdRefineArgs(args: string): { query: string; maxQuestions?: number; requiredAxes?: ClarificationAxis[] } {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    let maxQuestions: number | undefined;
    const axes: ClarificationAxis[] = [];
    const queryParts: string[] = [];
    for (let index = 0; index < parts.length; index += 1) {
      const part = parts[index];
      if (part === "--max") {
        const next = Number(parts[index + 1]);
        if (Number.isFinite(next)) maxQuestions = next;
        index += 1;
        continue;
      }
      if (part.startsWith("--max=")) {
        const next = Number(part.slice("--max=".length));
        if (Number.isFinite(next)) maxQuestions = next;
        continue;
      }
      if ((part === "--axes" || part === "--axis") && parts[index + 1]) {
        axes.push(...parseClarificationAxes(parts[index + 1]));
        index += 1;
        continue;
      }
      if (part.startsWith("--axes=") || part.startsWith("--axis=")) {
        axes.push(...parseClarificationAxes(part.slice(part.indexOf("=") + 1)));
        continue;
      }
      queryParts.push(part);
    }
    return { query: queryParts.join(" "), maxQuestions, requiredAxes: axes.length > 0 ? axes : undefined };
  }

  function parseClarificationAxes(value: string): ClarificationAxis[] {
    return value.split(",").map(item => item.trim()).filter(isClarificationAxisArg);
  }

  function isClarificationAxisArg(value: string): value is ClarificationAxis {
    return value === "goal" ||
      value === "scope" ||
      value === "users" ||
      value === "acceptance" ||
      value === "constraints" ||
      value === "non_goals" ||
      value === "verification" ||
      value === "risk";
  }

  function parseClarifyFinishArgs(args: string): { force?: boolean; note?: string } {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    const force = parts.some(part => part === "--force");
    const note = parts.filter(part => part !== "--force").join(" ").trim();
    return { force, note: note || undefined };
  }

  function parseUpstreamReviewArgs(args: string): { sourceId: string; reference: string; note?: string } {
    const parts = args.trim().split(/\s+/).filter(Boolean);
    const sourceId = parts.shift() || "";
    const reference = parts.shift() || "";
    const note = parts.join(" ").trim() || undefined;
    return { sourceId, reference, note };
  }

  function formatAmbiguousTasks(tasks: Array<{ id: string; status: string; phase: string; title: string }>): string {
    return [
      "More than one Project Flow task matched:",
      ...tasks.slice(0, 8).map(task => `- ${task.id} [${task.status}/${task.phase}] ${task.title}`),
    ].join("\n");
  }

  function trimForNotice(content: string, max = 3000): string {
    if (content.length <= max) return content;
    return `${content.slice(0, max)}\n\n[Project Flow notice truncated]`;
  }
}
