import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { ClarificationAxis } from "../src/core";
import {
  buildContextBundle,
  addTaskResearchNote,
  addTaskResearchSourcePack,
  addTaskResearchQuestion,
  answerTaskResearchQuestion,
  addTaskResearchDecision,
  answerTaskClarification,
  applySpecProposal,
  applySubtaskPlan,
  buildSubtaskTree,
  createSpecProposal,
  createChildTask,
  createTask,
  ensureProject,
  extractTaskResearchSourcePack,
  finishActiveTask,
  getProjectPaths,
  isCodeWorkPrompt,
  linkParentChildTask,
  listTasks,
  listSpecProposals,
  loadActiveTask,
  loadTask,
  readProjectOverview,
  readProjectAutoSubtaskMode,
  readPlan,
  readAcceptance,
  refreshSubtaskPlanArtifacts,
  readActiveTaskScopes,
  readRoleOrchestration,
  readVerificationRemediationPlan,
  readSubtaskPlan,
  readTaskReadiness,
  readTaskResume,
  readTaskSnapshot,
  readTaskHandoff,
  readTaskClarification,
  readTaskEvents,
  readTaskInfo,
  readTaskResearch,
  readUpstreamSyncReport,
  readVerification,
  readVerificationStrategy,
  recordVerification,
  refreshVerificationStrategy,
  writeVerificationRemediationPlan,
  startVerificationRemediationAttempt,
  finishVerificationRemediationAttempt,
  recordToolEvent,
  readSpecDocuments,
  resolveTask,
  resolveSpecProposal,
  reviewTaskResearchSourcePack,
  saveTask,
  setActiveTask,
  setPlanStepStatus,
  skipTaskClarification,
  startTaskClarification,
  startPrdRefinement,
  advancePlan,
  updateAcceptanceItem,
  updateRoleOrchestrationStatus,
  updateUpstreamSource,
  finishTaskClarification,
  writeProjectOverview,
  writeTaskReadiness,
  writeTaskResume,
  writeTaskSnapshot,
  writeUpstreamSyncReport,
  formatTaskMetadataSummary,
  formatSubtaskPlanSummary,
  formatSubtaskTree,
  writeSubtaskPlan,
} from "../src/core";

async function withTempProject<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "omp-project-flow-"));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("project flow core", () => {
  test("detects code work prompts conservatively", () => {
    expect(isCodeWorkPrompt("帮我实现登录功能")).toBe(true);
    expect(isCodeWorkPrompt("检查中文硬编码")).toBe(true);
    expect(isCodeWorkPrompt("排查 hook 没有触发的问题")).toBe(true);
    expect(isCodeWorkPrompt("fix the auth tests")).toBe(true);
    expect(isCodeWorkPrompt("如何理解这个设计")).toBe(false);
  });

  test("creates and finishes a task", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "implement refresh token support");
      expect(task.id).toStartWith("T-");
      expect(task.metadata?.schemaVersion).toBe(1);
      expect(task.metadata?.kind).toBe("feature");
      expect(task.metadata?.source).toBe("user");
      expect(task.metadata?.priority).toBe("normal");

      const active = await loadActiveTask(root);
      expect(active?.id).toBe(task.id);

      const finished = await finishActiveTask(root, "done", { force: true });
      expect(finished?.status).toBe("finished");

      const activeAfterFinish = await loadActiveTask(root);
      expect(activeAfterFinish).toBeUndefined();
    });
  });

  test("normalizes task metadata for legacy task files", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(root, "implement metadata compatibility for plugin docs");
      const taskPath = path.join(paths.tasksDir, task.id, "task.json");
      const raw = JSON.parse(await readFile(taskPath, "utf8"));
      delete raw.metadata;
      await writeFile(taskPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");

      const loaded = await loadActiveTask(root);
      expect(loaded?.metadata?.schemaVersion).toBe(1);
      expect(loaded?.metadata?.kind).toBe("feature");
      expect(loaded?.metadata?.labels).toContain("plugin");
      expect(loaded?.metadata?.labels).toContain("docs");
      expect(loaded?.metadata?.origin.prompt).toBe("implement metadata compatibility for plugin docs");
      expect(formatTaskMetadataSummary(loaded!.metadata!)).toContain("source: user");
    });
  });

  test("keeps metadata stable during ordinary task saves", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "implement stable metadata");
      const originalMetadataUpdatedAt = task.metadata?.updatedAt;

      const active = await loadActiveTask(root);
      active!.counters.turns += 1;
      await saveTask(root, active!);

      const reloaded = await loadActiveTask(root);
      expect(reloaded?.updatedAt).not.toBe(task.updatedAt);
      expect(reloaded?.metadata?.updatedAt).toBe(originalMetadataUpdatedAt);
    });
  });

  test("lists, resolves, and switches tasks", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const first = await createTask(root, "implement alpha workflow");
      const second = await createTask(root, "implement beta workflow");

      const tasks = await listTasks(root);
      expect(tasks.map(task => task.id)).toContain(first.id);
      expect(tasks.map(task => task.id)).toContain(second.id);

      const resolved = await resolveTask(root, first.id.slice(0, 28));
      expect(resolved.status).toBe("found");
      expect(resolved.task?.id).toBe(first.id);

      const active = await setActiveTask(root, first.id);
      expect(active?.id).toBe(first.id);
      expect(active?.status).toBe("active");

      const activeAfterSwitch = await loadActiveTask(root);
      expect(activeAfterSwitch?.id).toBe(first.id);
    });
  });

  test("tracks active tasks per session scope with project fallback", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const sessionA = { kind: "session", id: "window-a" } as const;
      const sessionB = { kind: "session", id: "window-b" } as const;
      const first = await createTask(root, "implement window A task", { activeScope: sessionA });
      const second = await createTask(root, "implement window B task", { activeScope: sessionB });

      expect((await loadActiveTask(root, sessionA))?.id).toBe(first.id);
      expect((await loadActiveTask(root, sessionB))?.id).toBe(second.id);
      expect((await loadActiveTask(root))?.id).toBe(second.id);
      const missingSession = { kind: "session", id: "window-c" } as const;
      expect(await loadActiveTask(root, missingSession)).toBeUndefined();
      expect((await loadActiveTask(root, missingSession, { fallbackToProject: true }))?.id).toBe(second.id);
      const scopes = await readActiveTaskScopes(root);
      expect(scopes.scopes["session:window-a"]?.taskId).toBe(first.id);
      expect(scopes.scopes["session:window-b"]?.taskId).toBe(second.id);
    });
  });

  test("creates child tasks and summarizes a subtask tree", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const parent = await createTask(root, "implement parent workflow\n- 验收: children are tracked");
      const child = await createChildTask(root, parent.id, "implement child workflow\n- 验收: child is done");
      expect(child?.metadata?.relationships.parentTaskId).toBe(parent.id);
      expect(child?.status).toBe("paused");

      const reloadedParent = await loadTask(root, parent.id);
      expect(reloadedParent?.metadata?.relationships.childTaskIds).toContain(child!.id);
      expect((await loadActiveTask(root))?.id).toBe(parent.id);
      const parentInfo = await readTaskInfo(root, parent.id);
      expect(parentInfo).toContain("## Subtasks");
      expect(parentInfo).toContain(child!.id);
      const overview = await readProjectOverview(root);
      expect(overview?.totals.active).toBe(1);
      expect(overview?.totals.paused).toBe(1);

      const tree = await buildSubtaskTree(root, parent.id);
      expect(tree?.totalTasks).toBe(2);
      expect(formatSubtaskTree(tree!)).toContain(child!.id);
      expect(await linkParentChildTask(root, parent.id, parent.id)).toBe(false);
      expect(await linkParentChildTask(root, child!.id, parent.id)).toBe(false);
      const readinessBeforeMove = await writeTaskReadiness(root, parent, "test");
      expect(readinessBeforeMove.status).toBe("blocked");
      expect(readinessBeforeMove.blockers.join("\n")).toContain("child task");

      const nextParent = await createTask(root, "implement next parent workflow\n- 验收: child can move");
      expect(await linkParentChildTask(root, nextParent.id, child!.id)).toBe(true);
      const oldParentAfterMove = await loadTask(root, parent.id);
      const nextParentAfterMove = await loadTask(root, nextParent.id);
      expect(oldParentAfterMove?.metadata?.relationships.childTaskIds).not.toContain(child!.id);
      expect(nextParentAfterMove?.metadata?.relationships.childTaskIds).toContain(child!.id);

      const readiness = await writeTaskReadiness(root, parent, "test");
      expect(readiness.blockers.join("\n")).not.toContain("child task");

      const snapshot = await writeTaskSnapshot(root, nextParent, "test");
      expect(snapshot.subtasks).toContain("subtasks: 1");
      const bundle = await buildContextBundle(root, "continue parent workflow", nextParent);
      expect(bundle.content).toContain("Subtasks:");
      expect(bundle.content).toContain(child!.id);

      await setActiveTask(root, child!.id);
      const finishedChild = await finishActiveTask(root, "child complete", { force: true });
      expect(finishedChild?.status).toBe("finished");
      const nextParentInfo = await readTaskInfo(root, nextParent.id);
      expect(nextParentInfo).toContain(`${child!.id} [finished/finished]`);
    });
  });

  test("creates and applies an automatic subtask plan", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, [
        "implement full project workflow automation",
        "- Acceptance: generate PRD artifacts",
        "- Acceptance: create child task suggestions",
        "- Acceptance: verify generated workflow state",
        "必须保持现有命令兼容",
      ].join("\n"));

      const plan = await readSubtaskPlan(root, task.id);
      expect(plan?.mode).toBe("suggest");
      expect(plan?.items.length).toBeGreaterThanOrEqual(3);
      expect(formatSubtaskPlanSummary(plan!)).toContain("suggested");

      const info = await readTaskInfo(root, task.id);
      expect(info).toContain("## Subtask Plan");
      expect(info).toContain("subtask plan:");

      const bundle = await buildContextBundle(root, "continue workflow automation", task);
      expect(bundle.content).toContain("Subtask plan:");

      const result = await applySubtaskPlan(root, task.id);
      expect(result.status).toBe("applied");
      expect(result.created.length).toBeGreaterThanOrEqual(1);
      expect(result.created.every(child => child.status === "paused")).toBe(true);
      const applied = await readSubtaskPlan(root, task.id);
      expect(applied?.items.some(item => item.status === "created" && !!item.childTaskId)).toBe(true);
      const tree = await buildSubtaskTree(root, task.id);
      expect(tree?.totalTasks).toBeGreaterThan(1);

      const childPlan = await readSubtaskPlan(root, result.created[0].id);
      expect(childPlan).toBeUndefined();

      const refreshed = await writeSubtaskPlan(root, task, "suggest", "test_refresh");
      expect(refreshed.items.some(item => item.status === "created")).toBe(true);
    });
  });

  test("builds nested subtask plans with templates, ordering, and tree rollups", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, [
        "implement nested workflow split",
        "- Acceptance: research the target workflow",
        "- Acceptance: implement the target workflow",
        "- Acceptance: verify the target workflow",
        "must keep parent task active",
      ].join("\n"), { subtaskMode: "off" });

      const plan = await writeSubtaskPlan(root, task, "suggest", "test_template", { template: "workflow", maxDepth: 2 });
      expect(plan.template).toBe("workflow");
      expect(plan.maxDepth).toBe(2);
      expect(plan.items.map(item => item.order)).toEqual(plan.items.map((_, index) => index + 1));
      expect(plan.items.some(item => item.depth === 2 && item.parentItemId)).toBe(true);
      expect(plan.items.find(item => item.id === "S2")?.dependsOn).toContain("S1");
      expect(formatSubtaskPlanSummary(plan)).toContain("template: workflow");

      const result = await applySubtaskPlan(root, task.id);
      expect(result.status).toBe("applied");
      const applied = await readSubtaskPlan(root, task.id);
      const nestedItem = applied?.items.find(item => item.depth === 2 && item.childTaskId);
      expect(nestedItem?.parentItemId).toBeTruthy();
      const parentItem = applied?.items.find(item => item.id === nestedItem?.parentItemId);
      const nestedTask = nestedItem?.childTaskId ? await loadTask(root, nestedItem.childTaskId) : undefined;
      expect(nestedTask?.metadata?.relationships.parentTaskId).toBe(parentItem?.childTaskId);

      const tree = await buildSubtaskTree(root, task.id, 4);
      expect(tree?.rollup.maxDepth).toBeGreaterThanOrEqual(2);
      expect(tree?.rollup.byDepth["2"]).toBeGreaterThan(0);
      expect(tree?.rollup.leafTasks).toBeGreaterThan(0);
      expect(formatSubtaskTree(tree!)).toContain("## Rollup");
    });
  });

  test("auto subtask mode creates linked child tasks immediately", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, [
        "implement automatic child task creation",
        "- Acceptance: create child task suggestions",
        "- Acceptance: apply suggestions without a second command",
        "- Acceptance: preserve the parent as the active task",
      ].join("\n"), { subtaskMode: "auto" });

      const plan = await readSubtaskPlan(root, task.id);
      expect(plan?.mode).toBe("auto");
      expect(plan?.complexity.level).toBe("complex");
      expect(plan?.items.some(item => item.status === "created" && !!item.childTaskId)).toBe(true);
      const tree = await buildSubtaskTree(root, task.id);
      expect(tree?.totalTasks).toBeGreaterThan(1);
      expect((await loadActiveTask(root))?.id).toBe(task.id);
    });
  });

  test("reads project override for automatic subtask mode", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      await mkdir(path.join(root, ".omp"), { recursive: true });
      await writeFile(path.join(root, ".omp", "plugin-overrides.json"), JSON.stringify({
        settings: {
          "omp-project-flow": {
            autoSubtaskMode: "off",
          },
        },
      }, null, 2));

      expect(await readProjectAutoSubtaskMode(root)).toBe("off");
    });
  });

  test("creates role orchestration handoffs for new tasks", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, [
        "implement role orchestration packets",
        "- Acceptance: research handoff exists",
        "- Acceptance: implementation handoff exists",
        "- Acceptance: check handoff exists",
      ].join("\n"));

      const roles = await readRoleOrchestration(root, task.id);
      expect(roles?.roles.map(role => role.id)).toEqual(["research", "implement", "check"]);
      expect(roles?.roles.every(role => role.status === "pending")).toBe(true);
      const researchPrompt = await readFile(path.join(root, ".project-flow", "tasks", task.id, "roles", "research.md"), "utf8");
      expect(researchPrompt).toContain("Role: research");
      const info = await readTaskInfo(root, task.id);
      expect(info).toContain("## Role Orchestration");
    });
  });

  test("updates role status and refreshes role artifacts", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "verify role status updates\n- Acceptance: status persists");

      const result = await updateRoleOrchestrationStatus(root, task.id, "research", "in_progress", "gathering upstream sources");
      expect(result.status).toBe("updated");
      const roles = await readRoleOrchestration(root, task.id);
      expect(roles?.roles.find(role => role.id === "research")?.status).toBe("in_progress");
      expect(roles?.roles.find(role => role.id === "research")?.note).toBe("gathering upstream sources");
      const snapshot = await readTaskSnapshot(root, task.id);
      expect(snapshot?.roles?.roles.find(role => role.id === "research")?.status).toBe("in_progress");
    });
  });

  test("keeps subtask plan off mode empty and refreshes generated artifacts", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, [
        "implement legacy workflow split",
        "- Acceptance: suggest child tasks",
        "- Acceptance: sync task info",
      ].join("\n"), { subtaskMode: "off" });

      const disabled = await readSubtaskPlan(root, task.id);
      expect(disabled).toBeUndefined();

      const offPlan = await writeSubtaskPlan(root, task, "off", "test_off");
      expect(offPlan.items).toHaveLength(0);
      const skipped = await applySubtaskPlan(root, task.id);
      expect(skipped.status).toBe("empty");
      expect(skipped.created).toHaveLength(0);

      const suggested = await writeSubtaskPlan(root, task, "suggest", "test_refresh");
      expect(suggested.items.length).toBeGreaterThan(0);
      await refreshSubtaskPlanArtifacts(root, task.id, "test_refresh");
      const info = await readTaskInfo(root, task.id);
      expect(info).toContain("## Subtask Plan");
      expect(info).toContain("suggested");
      const snapshot = await readTaskSnapshot(root, task.id);
      expect(snapshot?.subtaskPlan?.items.length).toBeGreaterThan(0);
    });
  });

  test("does not suggest subtasks for simple root tasks by default", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "fix typo in readme");
      const plan = await readSubtaskPlan(root, task.id);
      expect(plan?.items).toHaveLength(0);
    });
  });

  test("writes a structured PRD from the initial request", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(
        root,
        [
          "实现任务状态面板",
          "必须保持现有命令兼容",
          "- 验收: 支持查看最近验证记录",
          "是否需要迁移旧数据？",
        ].join("\n"),
      );

      const prd = await readFile(path.join(paths.tasksDir, task.id, "prd.md"), "utf8");
      expect(prd).toContain("## Goal");
      expect(prd).toContain("- 必须保持现有命令兼容");
      expect(prd).toContain("- [ ] 验收: 支持查看最近验证记录");
      expect(prd).toContain("- 是否需要迁移旧数据？");

      const research = await readTaskResearch(root, task.id);
      expect(research?.openQuestions).toContain("是否需要迁移旧数据？");
      const researchNotes = await readFile(path.join(paths.tasksDir, task.id, "research", "notes.md"), "utf8");
      expect(researchNotes).toContain("# Research Notes");
      expect(researchNotes).toContain("是否需要迁移旧数据？");

      const clarification = await readTaskClarification(root, task.id);
      expect(clarification?.status).toBe("collecting");
      expect(clarification?.currentQuestionId).toBe("C1");
      expect(clarification?.questions[0]?.text).toBe("是否需要迁移旧数据？");
      const clarificationMd = await readFile(path.join(paths.tasksDir, task.id, "clarification.md"), "utf8");
      expect(clarificationMd).toContain("# Clarification Loop");
      expect(clarificationMd).toContain("是否需要迁移旧数据？");

      const info = await readTaskInfo(root, task.id);
      expect(info).toContain("# Task Info");
      expect(info).toContain("## Clarification");
      expect(info).toContain("## Research");
      expect(info).toContain("## Manual Notes");
    });
  });

  test("runs clarification questions through answer, skip, context, readiness, and snapshot", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(root, "实现设置迁移\n- 验收: 新配置可用\n是否需要兼容旧配置？");

      const blocked = await writeTaskReadiness(root, task, "test");
      expect(blocked.blockers.join("\n")).toContain("required clarification");

      const answered = await answerTaskClarification(root, task.id, "需要兼容旧配置，并保留旧字段读取。");
      expect(answered.status).toBe("updated");
      expect(answered.state?.status).toBe("ready");
      expect(answered.state?.questions[0]?.status).toBe("answered");

      const readiness = await writeTaskReadiness(root, task, "test");
      expect(readiness.blockers.join("\n")).not.toContain("required clarification");
      expect(readiness.passes.join("\n")).toContain("Clarification ready");

      const bundle = await buildContextBundle(root, "继续设置迁移", task);
      expect(bundle.clarification?.status).toBe("ready");
      expect(bundle.content).toContain("Clarification loop:");
      expect(bundle.content).toContain("需要兼容旧配置");

      const snapshot = await writeTaskSnapshot(root, task, "test");
      expect(snapshot.clarification?.status).toBe("ready");
      expect(snapshot.summary).toContain("Clarification is ready");
      const snapshotMd = await readFile(path.join(paths.tasksDir, task.id, "snapshot.md"), "utf8");
      expect(snapshotMd).toContain("## Clarification");

      const prd = await readFile(path.join(paths.tasksDir, task.id, "prd.md"), "utf8");
      expect(prd).toContain("### Answers");
      expect(prd).toContain("需要兼容旧配置");
    });
  });

  test("starts optional clarification and can skip or force finish it", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "implement optional brainstorm");
      expect((await readTaskClarification(root, task.id))?.status).toBe("not_required");

      const started = await startTaskClarification(root, task.id, { maxQuestions: 2 });
      expect(started?.status).toBe("collecting");
      expect(started?.questions).toHaveLength(2);
      expect(started?.currentQuestionId).toBe("C1");

      const skipped = await skipTaskClarification(root, task.id, "already clear");
      expect(skipped.state?.questions[0]?.status).toBe("skipped");
      expect(skipped.state?.currentQuestionId).toBe("C2");

      const blockedFinish = await finishTaskClarification(root, task.id);
      expect(blockedFinish.status).toBe("blocked");
      expect(blockedFinish.openQuestions[0]?.id).toBe("C2");

      const forced = await finishTaskClarification(root, task.id, { force: true, note: "not needed now" });
      expect(forced.status).toBe("updated");
      expect(forced.state?.status).toBe("skipped");
      expect(forced.state?.questions[1]?.status).toBe("skipped");
    });
  });

  test("runs PRD refinement through required axes and updates draft PRD", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(root, "onboarding workflow request");
      const axes: ClarificationAxis[] = ["scope", "users", "acceptance", "verification"];

      const started = await startPrdRefinement(root, task.id, { requiredAxes: axes });
      expect(started?.mode).toBe("refine");
      expect(started?.status).toBe("collecting");
      expect(started?.requiredAxes).toEqual(axes);
      expect(started?.currentQuestionId).toBe("C1");
      expect(started?.questions[0]?.axis).toBe("scope");

      await answerTaskClarification(root, task.id, "Only the PRD artifact and command surface are in scope.");
      await answerTaskClarification(root, task.id, "Maintainers refining Project Flow tasks before implementation.");
      await answerTaskClarification(root, task.id, "The PRD records refined scope, users, and acceptance.");
      const finished = await answerTaskClarification(root, task.id, "Run bun run check and the focused clarification tests.");

      expect(finished.state?.status).toBe("ready");
      expect(finished.state?.draft.scope).toContain("Only the PRD artifact and command surface are in scope.");
      expect(finished.state?.draft.users).toContain("Maintainers refining Project Flow tasks before implementation.");
      expect(finished.state?.draft.acceptanceCriteria).toContain("The PRD records refined scope, users, and acceptance.");
      expect(finished.state?.draft.verification).toContain("Run bun run check and the focused clarification tests.");

      const prd = await readFile(path.join(paths.tasksDir, task.id, "prd.md"), "utf8");
      expect(prd).toContain("## Scope");
      expect(prd).toContain("Only the PRD artifact and command surface are in scope.");
      expect(prd).toContain("## Users");
      expect(prd).toContain("Maintainers refining Project Flow tasks before implementation.");
      expect(prd).toContain("## Verification");
      expect(prd).toContain("Run bun run check and the focused clarification tests.");
    });
  });

  test("creates acceptance state and handoff summaries", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(
        root,
        [
          "实现恢复摘要",
          "- 验收: 生成 handoff.md",
          "- 验收: 上下文包含验收状态",
        ].join("\n"),
      );

      const acceptance = await readAcceptance(root, task.id);
      expect(acceptance.items).toHaveLength(2);
      expect(acceptance.items[0]?.id).toBe("A1");
      expect(acceptance.items[0]?.status).toBe("open");

      const updated = await updateAcceptanceItem(root, task.id, "A1", "done", "covered by unit test");
      expect(updated.status).toBe("updated");
      expect(updated.item?.status).toBe("done");

      const handoff = await readTaskHandoff(root, task.id);
      expect(handoff).toContain("# Task Handoff");
      expect(handoff).toContain("A1");

      const acceptanceFile = await readFile(path.join(paths.tasksDir, task.id, "acceptance.json"), "utf8");
      expect(acceptanceFile).toContain("covered by unit test");
    });
  });

  test("links research notes into info, snapshots, context, and spec proposals", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "implement research artifacts\n- 验收: research notes appear in outputs");

      const research = await addTaskResearchNote(
        root,
        task.id,
        "Found that OMP tool_execution_end omits args; preserve start args by toolCallId.",
        "research",
      );
      expect(research?.items[0]?.summary).toContain("OMP tool_execution_end");

      const info = await readTaskInfo(root, task.id);
      expect(info).toContain("# Task Info");

      const researchNotes = await readFile(path.join(getProjectPaths(root).tasksDir, task.id, "research", "notes.md"), "utf8");
      expect(researchNotes).toContain("OMP tool_execution_end");

      const snapshot = await writeTaskSnapshot(root, task, "test");
      expect(snapshot.research?.items[0]?.summary).toContain("OMP tool_execution_end");
      expect(snapshot.info).toContain("# Task Info");

      const bundle = await buildContextBundle(root, "continue research artifacts", task);
      expect(bundle.content).toContain("Research info:");
      expect(bundle.content).toContain("OMP tool_execution_end");

      const proposal = await createSpecProposal(root, task.id, "include research evidence");
      expect(proposal?.content).toContain("Research info:");
    });
  });

  test("preserves human-edited task info on refresh", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(root, "preserve manual task info");
      const infoPath = path.join(paths.tasksDir, task.id, "info.md");
      await writeFile(
        infoPath,
        [
          "# Custom Task Info",
          "",
          "## Manual Notes",
          "",
          "Keep this design note.",
          "",
          "## Custom Section",
          "",
          "Do not overwrite this section.",
          "",
        ].join("\n"),
        "utf8",
      );

      await writeTaskSnapshot(root, task, "refresh");
      const info = await readTaskInfo(root, task.id);
      expect(info).toContain("# Custom Task Info");
      expect(info).toContain("Keep this design note.");
      expect(info).toContain("Do not overwrite this section.");
    });
  });

  test("creates and advances structured plan state", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(root, "add plan tracking");

      const plan = await readPlan(root, task.id);
      expect(plan.steps).toHaveLength(4);
      expect(plan.currentStepId).toBe("P1");
      expect(plan.steps[0]?.status).toBe("active");

      const advanced = await advancePlan(root, task.id, "inspection complete");
      expect(advanced.status).toBe("updated");
      expect(advanced.step?.status).toBe("done");

      const after = await readPlan(root, task.id);
      expect(after.currentStepId).toBe("P2");
      expect(after.steps[1]?.status).toBe("active");

      const planFile = await readFile(path.join(paths.tasksDir, task.id, "plan.json"), "utf8");
      expect(planFile).toContain("inspection complete");
    });
  });

  test("records verification checks from test-like tool calls", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "add verification tracking");
      await recordToolEvent(root, "tool_end", {
        toolName: "shell_command",
        toolCallId: "call-1",
        args: { command: "bun test" },
        isError: false,
        resultSummary: "5 pass",
      });

      const verification = await readVerification(root, task.id);
      expect(verification.checks).toHaveLength(1);
      expect(verification.checks[0]?.command).toBe("bun test");
      expect(verification.checks[0]?.success).toBe(true);

      const active = await loadActiveTask(root);
      expect(active?.phase).toBe("verifying");
      expect(active?.checkpoints.find(checkpoint => checkpoint.id === "verify")?.done).toBe(true);
      expect(active?.metadata?.source).toBe("user");

      const plan = await readPlan(root, task.id);
      expect(plan.steps.find(step => step.id === "P3")?.status).toBe("done");
      expect(plan.currentStepId).toBe("P4");
    });
  });

  test("infers an active task from mutating tool activity", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      expect(await loadActiveTask(root)).toBeUndefined();

      await recordToolEvent(root, "tool_end", {
        toolName: "edit",
        toolCallId: "call-edit",
        args: { path: "src/index.ts", oldString: "before", newString: "after" },
        isError: false,
        resultSummary: "edited src/index.ts",
      });

      const active = await loadActiveTask(root);
      expect(active?.title).toContain("Continue Project Flow for edit");
      expect(active?.phase).toBe("implementing");
      expect(active?.counters.toolCalls).toBe(1);
      expect(active?.checkpoints.find(checkpoint => checkpoint.id === "implement")?.done).toBe(true);
      expect(active?.metadata?.source).toBe("tool_activity");
      expect(active?.metadata?.origin.toolName).toBe("edit");
      expect(active?.metadata?.labels).toContain("tool-inferred");

      const events = await readTaskEvents(root, active!.id);
      expect(events.some(event => event.type === "task_inferred")).toBe(true);
      expect(events.some(event => event.type === "tool_end")).toBe(true);
    });
  });

  test("detects verification suggestions from project files", async () => {
    await withTempProject(async root => {
      await writeFile(
        path.join(root, "package.json"),
        `${JSON.stringify({ scripts: { test: "bun test", check: "bun --check src/index.ts", lint: "eslint ." } }, null, 2)}\n`,
        "utf8",
      );
      await ensureProject(root);
      const task = await createTask(root, "add verification suggestions");

      const strategy = await readVerificationStrategy(root, task.id);
      expect(strategy.sources).toContain("package.json");
      expect(strategy.suggestions.map(item => item.command)).toContain("bun run test");
      expect(strategy.suggestions.map(item => item.command)).toContain("bun run check");

      const refreshed = await refreshVerificationStrategy(root, task.id);
      expect(refreshed.suggestions[0]?.id).toBe("V1");
    });
  });

  test("builds verification policy coverage from touched files and recorded checks", async () => {
    await withTempProject(async root => {
      await writeFile(
        path.join(root, "package.json"),
        `${JSON.stringify({ scripts: { test: "bun test", check: "bun --check src/index.ts" } }, null, 2)}\n`,
        "utf8",
      );
      await ensureProject(root);
      const task = await createTask(root, "implement verification coverage policy");
      await recordToolEvent(root, "tool_end", {
        toolName: "edit",
        toolCallId: "edit-1",
        args: { input: "[src/core.ts#0000]\nreplace 1..1:\n+export const changed = true;" },
      });

      const strategy = await refreshVerificationStrategy(root, task.id);
      expect(strategy.policy.touchedFiles).toContain("src/core.ts");
      expect(strategy.policy.matrix.some(item => item.category === "source" && item.command === "bun run check")).toBe(true);
      expect(strategy.policy.coverageGaps.join("\n")).toContain("bun run check");

      await recordVerification(root, task.id, {
        id: "check-1",
        timestamp: "2026-06-09T00:00:00.000Z",
        toolName: "bash",
        command: "bun run check",
        success: true,
      });

      const covered = await readVerificationStrategy(root, task.id);
      expect(covered.policy.matrix.find(item => item.category === "source")?.status).toBe("covered");
      expect(covered.policy.coverageGaps).not.toContain("Run or record bun run check for source changes.");

      const resume = await writeTaskResume(root, task, "test");
      expect(resume.verificationCoverageGaps).not.toContain("Run or record bun run check for source changes.");
    });
  });

  test("persists research source packs and gates upstream parity readiness", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "implement parity research source packs\n- Acceptance: reviewed source packs exist");
      await updateAcceptanceItem(root, task.id, "A1", "done", "covered by source pack test");
      for (const stepId of ["P1", "P2", "P3", "P4"]) {
        await setPlanStepStatus(root, task.id, stepId, "done", "test complete");
      }
      await recordVerification(root, task.id, {
        id: "check-1",
        timestamp: "2026-06-09T00:00:00.000Z",
        toolName: "bash",
        command: "bun test tests/core.test.ts",
        success: true,
      });

      const warned = await writeTaskReadiness(root, task, "test");
      expect(warned.blockers).not.toContain("No reviewed research source pack recorded for upstream/parity work.");
      expect(warned.warnings).toContain("No reviewed research source pack recorded for upstream/parity work.");

      const research = await addTaskResearchSourcePack(root, task.id, {
        source: "docs/gaps.md:51-55",
        claim: "Research artifacts need structured source packs and confidence tracking.",
        excerpt: "Target behavior: add structured source packs, research questions, findings, decisions, confidence levels.",
        confidence: "high",
        openRisks: ["Still no autonomous research agent."],
      });
      expect(research?.sourcePacks[0]?.kind).toBe("doc");
      expect(research?.sourcePacks[0]?.confidence).toBe("high");
      expect(research?.findings).toContain("Research artifacts need structured source packs and confidence tracking.");

      const sourcePackFile = await readFile(path.join(root, ".project-flow", "tasks", task.id, "research", "source-packs.json"), "utf8");
      expect(sourcePackFile).toContain("docs/gaps.md:51-55");

      const stored = await readTaskResearch(root, task.id);
      expect(stored?.sourcePacks).toHaveLength(1);

      const info = await readTaskInfo(root, task.id);
      expect(info).toContain("source packs: 1");
      expect(info).toContain("docs/gaps.md:51-55");

      const handoff = await readTaskHandoff(root, task.id);
      expect(handoff).toContain("## Research");
      expect(handoff).toContain("docs/gaps.md:51-55");

      const snapshot = await readTaskSnapshot(root, task.id);
      expect(snapshot?.research?.sourcePacks[0]?.source).toBe("docs/gaps.md:51-55");

      const bundle = await buildContextBundle(root, "continue parity research", task);
      expect(bundle.content).toContain("source packs: 1");
      expect(bundle.content).toContain("docs/gaps.md:51-55");

      const ready = await writeTaskReadiness(root, task, "test");
      expect(ready.warnings).not.toContain("No reviewed research source pack recorded for upstream/parity work.");
    });
  });

  test("closes local research workflow with questions extraction review decisions and handoff", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      await mkdir(path.join(root, "docs"), { recursive: true });
      await writeFile(path.join(root, "docs", "source.md"), ["# Source", "Research claim line", "Implementation detail line"].join("\n"), "utf8");
      const task = await createTask(root, "implement ECC parity research workflow\n- Acceptance: local research workflow closes");
      await updateAcceptanceItem(root, task.id, "A1", "done", "workflow covered");
      for (const stepId of ["P1", "P2", "P3", "P4"]) {
        await setPlanStepStatus(root, task.id, stepId, "done", "test complete");
      }
      await recordVerification(root, task.id, {
        id: "check-1",
        timestamp: "2026-06-09T00:00:00.000Z",
        toolName: "bash",
        command: "bun test tests/core.test.ts",
        success: true,
      });

      const withQuestion = await addTaskResearchQuestion(root, task.id, "Which evidence supports this workflow?", { priority: "high" });
      expect(withQuestion?.questions[0]?.status).toBe("open");

      const extracted = await extractTaskResearchSourcePack(root, task.id, {
        source: "docs/source.md:2-3",
        claim: "Local source extraction can create draft evidence without pretending review.",
        confidence: "low",
        questionIds: ["Q1"],
      });
      expect(extracted?.sourcePacks[0]?.reviewStatus).toBe("draft");
      expect(extracted?.sourcePacks[0]?.excerpt).toContain("2:Research claim line");

      const warned = await writeTaskReadiness(root, task, "test");
      expect(warned.warnings).toContain("No reviewed research source pack recorded for upstream/parity work.");
      expect(warned.warnings).toContain("1 draft research source pack(s) still need review.");
      expect(warned.warnings).toContain("Low-confidence research evidence has no second reviewed source.");
      expect(warned.warnings.some(item => item.includes("research question"))).toBe(true);

      await reviewTaskResearchSourcePack(root, task.id, "S1");
      await addTaskResearchSourcePack(root, task.id, {
        source: "docs/gaps.md:51-55",
        claim: "Second reviewed source corroborates the local workflow requirement.",
        excerpt: "Research artifacts require source packs and confidence review workflow.",
        confidence: "high",
        questionIds: ["Q1"],
      });
      await answerTaskResearchQuestion(root, task.id, "Q1", "Reviewed sources support the local workflow closure.", { sourcePackIds: ["S1", "S2"] });
      await addTaskResearchDecision(root, task.id, "Use review-first local workflow", "It avoids hidden autonomous research while closing local state and handoff behavior.", { sourcePackIds: ["S1", "S2"], alternatives: ["hidden agent", "manual notes only"] });

      const ready = await writeTaskReadiness(root, task, "test");
      expect(ready.warnings).not.toContain("No reviewed research source pack recorded for upstream/parity work.");
      expect(ready.warnings).not.toContain("1 draft research source pack(s) still need review.");
      expect(ready.warnings).not.toContain("Low-confidence research evidence has no second reviewed source.");
      expect(ready.warnings.some(item => item.includes("research question"))).toBe(false);

      const research = await readTaskResearch(root, task.id);
      expect(research?.questions[0]?.status).toBe("answered");
      expect(research?.decisionRecords[0]?.decision).toBe("Use review-first local workflow");
      expect(research?.sourcePacks.map(pack => pack.reviewStatus)).toEqual(["reviewed", "reviewed"]);

      const handoff = await readFile(path.join(root, ".project-flow", "tasks", task.id, "research", "handoff.md"), "utf8");
      expect(handoff).toContain("## Implementation Handoff");
      expect(handoff).toContain("Use review-first local workflow");
      expect(handoff).toContain("## Check Handoff");

      const bundle = await buildContextBundle(root, "continue research workflow", task);
      expect(bundle.content).toContain("questions:");
      expect(bundle.content).toContain("reviewed sources");
    });
  });

  test("builds an opt-in remediation plan from failed verification", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "fix failed verification loop\n- Acceptance: plan remediation attempts");
      await recordVerification(root, task.id, {
        id: "fail-1",
        timestamp: "2026-06-09T00:00:00.000Z",
        toolName: "bash",
        command: "bun test",
        success: false,
        summary: "one assertion failed",
      });

      const plan = await writeVerificationRemediationPlan(root, task, "test");
      expect(plan.status).toBe("planned");
      expect(plan.maxAttempts).toBe(3);
      expect(plan.failedChecks[0]?.command).toBe("bun test");
      expect(plan.nextActions.some(action => action.includes("rerun"))).toBe(true);
      const stored = await readVerificationRemediationPlan(root, task.id);
      expect(stored?.summary).toContain("1 failed check");
    });
  });

  test("tracks remediation attempts and stops at the attempt limit", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "limit verification remediation attempts");
      await recordVerification(root, task.id, {
        id: "fail-1",
        timestamp: "2026-06-09T00:00:00.000Z",
        toolName: "bash",
        command: "bun run check",
        success: false,
      });

      const first = await startVerificationRemediationAttempt(root, task.id, "first fix attempt");
      expect(first.status).toBe("started");
      expect(first.plan?.status).toBe("active");
      expect(first.attempt?.commands).toContain("bun run check");
      await finishVerificationRemediationAttempt(root, task.id, "failed", "still failing");
      await startVerificationRemediationAttempt(root, task.id);
      await finishVerificationRemediationAttempt(root, task.id, "failed", "still failing");
      await startVerificationRemediationAttempt(root, task.id);
      const stopped = await finishVerificationRemediationAttempt(root, task.id, "failed", "third failure");
      expect(stopped.plan?.status).toBe("stopped");
      expect(stopped.plan?.attempts).toHaveLength(3);
    });
  });

  test("creates and applies spec proposals", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(
        root,
        [
          "document auth convention",
          "- 验收: Auth specs mention refresh token rotation",
        ].join("\n"),
      );
      await updateAcceptanceItem(root, task.id, "A1", "done", "captured in proposal");

      const proposal = await createSpecProposal(root, task.id, "promote durable auth rule");
      expect(proposal?.id).toStartWith("S-");
      expect(proposal?.status).toBe("proposed");
      expect(proposal?.content).toContain("## Proposed Spec");

      const proposals = await listSpecProposals(root);
      expect(proposals).toHaveLength(1);

      const resolved = await resolveSpecProposal(root, proposal?.id.slice(0, 12) || "");
      expect(resolved.status).toBe("found");

      const applied = await applySpecProposal(root, proposal?.id || "");
      expect(applied?.status).toBe("applied");

      const specFiles = await readSpecDocuments(root);
      expect(specFiles.some(spec => spec.content.includes("Auth specs mention refresh token rotation"))).toBe(true);
      const proposalFile = await readFile(path.join(paths.specProposalsDir, `${proposal?.id}.md`), "utf8");
      expect(proposalFile).toContain("status: applied");
    });
  });

  test("reads project specs", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      await writeFile(path.join(paths.specDir, "backend.md"), "# Backend\n\nUse service boundaries.\n", "utf8");

      const specs = await readSpecDocuments(root);
      expect(specs.some(spec => spec.title === "Backend")).toBe(true);
    });
  });

  test("builds a hidden context bundle", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      await writeFile(path.join(paths.specDir, "auth.md"), "# Auth\n\nRefresh tokens must be rotated.\n", "utf8");
      const task = await createTask(root, "add refresh token rotation");
      const bundle = await buildContextBundle(root, "add refresh token rotation", task);
      expect(bundle.content).toContain("[PROJECT FLOW ACTIVE]");
      expect(bundle.content).toContain("Active task:");
      expect(bundle.content).toContain("metadata:");
      expect(bundle.content).toContain("Acceptance:");
      expect(bundle.content).toContain("Plan:");
      expect(bundle.content).toContain("Next plan step:");
      expect(bundle.content).toContain("Verification suggestions:");
      expect(bundle.content).toContain("Resume:");
      expect(bundle.content).toContain("Finish readiness:");
      expect(bundle.content).toContain("Latest handoff:");
      expect(bundle.content).toContain("Auth");
    });
  });

  test("adds upstream sync context only for upstream-oriented work", async () => {
    await withTempProject(async root => {
      await ensureProject(root);
      const task = await createTask(root, "review upstream ECC and OMO sync gaps");
      const bundle = await buildContextBundle(root, "继续上游同步升级", task);
      expect(bundle.upstreamReport?.totals.sources).toBe(2);
      expect(bundle.content).toContain("Upstream sync:");
    });
  });

  test("writes resume packs with next action and recent task signals", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(root, "implement resume pack\n- 验收: resume records next action");

      await recordToolEvent(root, "tool_end", {
        toolName: "shell_command",
        toolCallId: "call-edit",
        args: { command: "Set-Content src/resume.ts value" },
        isError: false,
        resultSummary: "changed src/resume.ts",
      });
      await recordToolEvent(root, "tool_end", {
        toolName: "shell_command",
        toolCallId: "call-test",
        args: { command: "bun test" },
        isError: true,
        resultSummary: "1 fail in tests/resume.test.ts",
      });

      const resume = await writeTaskResume(root, task, "test");
      expect(resume.taskId).toBe(task.id);
      expect(resume.nextAction).toContain("Resolve failed verification");
      expect(resume.touchedFiles).toContain("src/resume.ts");
      expect(resume.touchedFiles).toContain("tests/resume.test.ts");
      expect(resume.openAcceptance[0]).toContain("A1");
      expect(resume.failedChecks[0]).toContain("bun test");

      const savedResume = await readTaskResume(root, task.id);
      expect(savedResume?.taskId).toBe(task.id);

      const resumeMd = await readFile(path.join(paths.tasksDir, task.id, "resume.md"), "utf8");
      expect(resumeMd).toContain("# Resume Pack");
      expect(resumeMd).toContain("## Next Action");
      expect(resumeMd).toContain("bun test");
    });
  });

  test("writes finish readiness and blocks premature finish", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(root, "implement finish gate\n- 验收: finish requires checks");

      const blocked = await writeTaskReadiness(root, task, "test");
      expect(blocked.status).toBe("blocked");
      expect(blocked.blockers.join("\n")).toContain("acceptance");
      expect(blocked.blockers.join("\n")).toContain("No verification checks");

      const blockedFinish = await finishActiveTask(root, "too soon");
      expect(blockedFinish).toBeUndefined();
      expect((await loadActiveTask(root))?.id).toBe(task.id);

      await updateAcceptanceItem(root, task.id, "A1", "done", "covered by bun test");
      await recordToolEvent(root, "tool_end", {
        toolName: "shell_command",
        toolCallId: "call-pass",
        args: { command: "bun test" },
        isError: false,
        resultSummary: "all pass",
      });
      await advancePlan(root, task.id, "summary complete");

      const ready = await writeTaskReadiness(root, task, "test");
      expect(ready.status).toBe("ready");
      expect(ready.passes.join("\n")).toContain("Latest verification passed");

      const readinessMd = await readFile(path.join(paths.tasksDir, task.id, "readiness.md"), "utf8");
      expect(readinessMd).toContain("# Finish Readiness");
      expect(readinessMd).toContain("Status: ready");

      const saved = await readTaskReadiness(root, task.id);
      expect(saved?.status).toBe("ready");
    });
  });

  test("writes task snapshots for review and handoff", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const task = await createTask(root, "implement snapshot pack\n- 验收: snapshot includes task state");
      await recordToolEvent(root, "tool_end", {
        toolName: "shell_command",
        toolCallId: "call-snapshot",
        args: { command: "bun test tests/snapshot.test.ts" },
        isError: false,
        resultSummary: "snapshot tests pass",
      });

      const snapshot = await writeTaskSnapshot(root, task, "test");
      expect(snapshot.taskId).toBe(task.id);
      expect(snapshot.summary).toContain("Acceptance");
      expect(snapshot.summary).toContain("Metadata");
      expect(snapshot.resume.nextAction).toBeTruthy();
      expect(snapshot.readiness.status).toBe("blocked");
      expect(snapshot.verification.checks[0]?.command).toBe("bun test tests/snapshot.test.ts");

      const saved = await readTaskSnapshot(root, task.id);
      expect(saved?.taskId).toBe(task.id);

      const snapshotJson = await readFile(path.join(paths.tasksDir, task.id, "snapshot.json"), "utf8");
      expect(snapshotJson).toContain("\"verification\"");

      const snapshotMd = await readFile(path.join(paths.tasksDir, task.id, "snapshot.md"), "utf8");
      expect(snapshotMd).toContain("# Task Snapshot");
      expect(snapshotMd).toContain("## Metadata");
      expect(snapshotMd).toContain("## Finish Readiness");
      expect(snapshotMd).toContain("snapshot tests pass");
    });
  });

  test("writes project overview across tasks and proposals", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);
      const first = await createTask(root, "implement overview alpha\n- 验收: alpha is tracked");
      await updateAcceptanceItem(root, first.id, "A1", "done", "alpha verified");
      await recordToolEvent(root, "tool_end", {
        toolName: "shell_command",
        toolCallId: "call-overview",
        args: { command: "bun test" },
        isError: false,
        resultSummary: "overview pass",
      });
      await createSpecProposal(root, first.id, "overview proposal");
      const second = await createTask(root, "implement overview beta\n- 验收: beta remains open");

      const overview = await writeProjectOverview(root);
      expect(overview.totals.tasks).toBe(2);
      expect(overview.activeTaskId).toBe(second.id);
      expect(overview.totals.proposedSpecs).toBe(1);
      expect(overview.blockedTasks.some(item => item.includes(second.id))).toBe(true);
      expect(overview.tasks.map(task => task.id)).toContain(first.id);

      const saved = await readProjectOverview(root);
      expect(saved?.totals.tasks).toBe(2);

      const overviewMd = await readFile(path.join(paths.workspaceDir, "overview.md"), "utf8");
      expect(overviewMd).toContain("# Project Overview");
      expect(overviewMd).toContain("## Next Actions");
      expect(overviewMd).toContain("feature/user");
      expect(overviewMd).toContain(second.id);
    });
  });

  test("writes upstream sync reports and tracks reviewed sources", async () => {
    await withTempProject(async root => {
      const paths = await ensureProject(root);

      const report = await writeUpstreamSyncReport(root, "test");
      expect(report.totals.sources).toBe(2);
      expect(report.totals.needsReview).toBe(2);
      expect(report.totals.missing).toBeGreaterThan(0);
      expect(report.nextActions.some(item => item.includes("/upstream:review ecc"))).toBe(true);

      const saved = await readUpstreamSyncReport(root);
      expect(saved?.totals.sources).toBe(2);

      const reportMd = await readFile(path.join(paths.upstreamsDir, "sync-report.md"), "utf8");
      expect(reportMd).toContain("# Upstream Sync Report");
      expect(reportMd).toContain("session-active-task");

      const reviewed = await updateUpstreamSource(root, "ecc", "v1.2.3", "reviewed changelog");
      expect(reviewed.status).toBe("updated");
      expect(reviewed.source?.reference).toBe("v1.2.3");
      expect(reviewed.report.totals.needsReview).toBe(1);
    });
  });
});
