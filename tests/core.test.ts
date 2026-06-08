import { describe, expect, test } from "bun:test";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  buildContextBundle,
  addTaskResearchNote,
  applySpecProposal,
  createSpecProposal,
  createTask,
  ensureProject,
  finishActiveTask,
  getProjectPaths,
  isCodeWorkPrompt,
  listTasks,
  listSpecProposals,
  loadActiveTask,
  readProjectOverview,
  readPlan,
  readAcceptance,
  readTaskReadiness,
  readTaskResume,
  readTaskSnapshot,
  readTaskHandoff,
  readTaskEvents,
  readTaskInfo,
  readTaskResearch,
  readUpstreamSyncReport,
  readVerification,
  readVerificationStrategy,
  refreshVerificationStrategy,
  recordToolEvent,
  readSpecDocuments,
  resolveTask,
  resolveSpecProposal,
  setActiveTask,
  advancePlan,
  updateAcceptanceItem,
  updateUpstreamSource,
  writeProjectOverview,
  writeTaskReadiness,
  writeTaskResume,
  writeTaskSnapshot,
  writeUpstreamSyncReport,
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

      const active = await loadActiveTask(root);
      expect(active?.id).toBe(task.id);

      const finished = await finishActiveTask(root, "done", { force: true });
      expect(finished?.status).toBe("finished");

      const activeAfterFinish = await loadActiveTask(root);
      expect(activeAfterFinish).toBeUndefined();
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

      const info = await readTaskInfo(root, task.id);
      expect(info).toContain("# Task Info");
      expect(info).toContain("## Research");
      expect(info).toContain("## Manual Notes");
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
      expect(snapshot.resume.nextAction).toBeTruthy();
      expect(snapshot.readiness.status).toBe("blocked");
      expect(snapshot.verification.checks[0]?.command).toBe("bun test tests/snapshot.test.ts");

      const saved = await readTaskSnapshot(root, task.id);
      expect(saved?.taskId).toBe(task.id);

      const snapshotJson = await readFile(path.join(paths.tasksDir, task.id, "snapshot.json"), "utf8");
      expect(snapshotJson).toContain("\"verification\"");

      const snapshotMd = await readFile(path.join(paths.tasksDir, task.id, "snapshot.md"), "utf8");
      expect(snapshotMd).toContain("# Task Snapshot");
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
