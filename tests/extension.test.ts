import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import projectFlowExtension from "../src/index";
import { createTask, listSpecProposals, loadActiveTask, readAcceptance, readPlan, readSubtaskPlan, readTaskClarification, readTaskResearch, readVerification } from "../src/core";

type Handler = (event: any, ctx: any) => unknown | Promise<unknown>;

function createFakePi() {
  const commands = new Map<string, any>();
  const handlers = new Map<string, Handler[]>();
  const status = new Map<string, string | undefined>();
  const notifications: Array<{ message: string; level?: string }> = [];
  const sentMessages: Array<{ message: any; options?: any }> = [];

  const pi = {
    setLabel: () => undefined,
    registerCommand: (name: string, options: any) => commands.set(name, options),
    on: (event: string, handler: Handler) => {
      const list = handlers.get(event) ?? [];
      list.push(handler);
      handlers.set(event, list);
    },
    sendMessage: (message: any, options?: any) => sentMessages.push({ message, options }),
    appendEntry: () => undefined,
  } as any;

  const ctx = (cwd: string) => ({
    cwd,
    hasUI: true,
    ui: {
      notify: (message: string, level?: string) => notifications.push({ message, level }),
      setStatus: (key: string, text: string | undefined) => status.set(key, text),
    },
    sessionManager: {
      getEntries: () => [],
    },
  });

  return { pi, commands, handlers, status, notifications, sentMessages, ctx };
}

async function withTempProject<T>(fn: (root: string) => Promise<T>): Promise<T> {
  const root = await mkdtemp(path.join(os.tmpdir(), "omp-project-flow-ext-"));
  try {
    return await fn(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("project flow extension", () => {
  test("registers commands and creates a task before agent start", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      expect(fake.commands.has("flow:init")).toBe(true);
      expect(fake.commands.has("flow:overview")).toBe(true);
      expect(fake.commands.has("task:finish")).toBe(true);
      expect(fake.commands.has("task:resume")).toBe(true);
      expect(fake.commands.has("task:list")).toBe(true);
      expect(fake.commands.has("task:status")).toBe(true);
      expect(fake.commands.has("task:readiness")).toBe(true);
      expect(fake.commands.has("task:snapshot")).toBe(true);
      expect(fake.commands.has("task:show")).toBe(true);
      expect(fake.commands.has("task:switch")).toBe(true);
      expect(fake.commands.has("task:handoff")).toBe(true);
      expect(fake.commands.has("task:info")).toBe(true);
      expect(fake.commands.has("task:metadata")).toBe(true);
      expect(fake.commands.has("task:child")).toBe(true);
      expect(fake.commands.has("task:tree")).toBe(true);
      expect(fake.commands.has("task:subtasks")).toBe(true);
      expect(fake.commands.has("task:clarify")).toBe(true);
      expect(fake.commands.has("clarify:start")).toBe(true);
      expect(fake.commands.has("clarify:status")).toBe(true);
      expect(fake.commands.has("clarify:answer")).toBe(true);
      expect(fake.commands.has("clarify:skip")).toBe(true);
      expect(fake.commands.has("clarify:finish")).toBe(true);
      expect(fake.commands.has("research:status")).toBe(true);
      expect(fake.commands.has("research:add")).toBe(true);
      expect(fake.commands.has("verify:status")).toBe(true);
      expect(fake.commands.has("verify:suggest")).toBe(true);
      expect(fake.commands.has("verify:refresh")).toBe(true);
      expect(fake.commands.has("plan:status")).toBe(true);
      expect(fake.commands.has("plan:next")).toBe(true);
      expect(fake.commands.has("plan:done")).toBe(true);
      expect(fake.commands.has("plan:block")).toBe(true);
      expect(fake.commands.has("plan:open")).toBe(true);
      expect(fake.commands.has("acceptance:status")).toBe(true);
      expect(fake.commands.has("acceptance:done")).toBe(true);
      expect(fake.commands.has("acceptance:block")).toBe(true);
      expect(fake.commands.has("acceptance:open")).toBe(true);
      expect(fake.commands.has("spec:update")).toBe(true);
      expect(fake.commands.has("spec:proposals")).toBe(true);
      expect(fake.commands.has("spec:show")).toBe(true);
      expect(fake.commands.has("spec:apply")).toBe(true);
      expect(fake.commands.has("upstream:status")).toBe(true);
      expect(fake.commands.has("upstream:report")).toBe(true);
      expect(fake.commands.has("upstream:review")).toBe(true);
      expect(fake.commands.has("upstream:sync")).toBe(true);
      expect(fake.handlers.has("before_agent_start")).toBe(true);

      const beforeAgentStart = fake.handlers.get("before_agent_start")?.[0];
      expect(beforeAgentStart).toBeDefined();

      const result = await beforeAgentStart?.(
        {
          type: "before_agent_start",
          prompt: "帮我实现一个测试功能",
          systemPrompt: [],
        },
        fake.ctx(root),
      );

      const active = await loadActiveTask(root);
      expect(active?.title).toBe("帮我实现一个测试功能");
      expect(result?.message?.customType).toBe("project-flow");
      expect(result?.message?.display).toBe(false);
      expect(result?.message?.content).toContain("[PROJECT FLOW ACTIVE]");
    });
  });

  test("recovers tool args from start events and infers a task from tool execution", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const toolStart = fake.handlers.get("tool_execution_start")?.[0];
      const toolEnd = fake.handlers.get("tool_execution_end")?.[0];
      expect(toolStart).toBeDefined();
      expect(toolEnd).toBeDefined();

      await toolStart?.(
        {
          type: "tool_execution_start",
          toolCallId: "call-test",
          toolName: "bash",
          args: { command: "bun test" },
        },
        fake.ctx(root),
      );
      await toolEnd?.(
        {
          type: "tool_execution_end",
          toolCallId: "call-test",
          toolName: "bash",
          result: "3 pass",
          isError: false,
        },
        fake.ctx(root),
      );

      const active = await loadActiveTask(root);
      expect(active?.title).toContain("bun test");
      expect(active?.phase).toBe("verifying");

      const verification = await readVerification(root, active!.id);
      expect(verification.checks[0]?.command).toBe("bun test");
      expect(verification.checks[0]?.success).toBe(true);
    });
  });

  test("switches tasks through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const first = await createTask(root, "implement first workflow");
      const second = await createTask(root, "implement second workflow");
      expect((await loadActiveTask(root))?.id).toBe(second.id);

      await fake.commands.get("task:switch").handler(first.id, fake.ctx(root));
      const active = await loadActiveTask(root);
      expect(active?.id).toBe(first.id);
      expect(fake.notifications.at(-1)?.message).toContain(first.id);
    });
  });

  test("updates acceptance criteria through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "实现命令验收\n- 验收: 可以标记完成");
      await fake.commands.get("acceptance:done").handler("A1 verified", fake.ctx(root));

      const acceptance = await readAcceptance(root, task.id);
      expect(acceptance.items[0]?.status).toBe("done");
      expect(acceptance.items[0]?.evidence).toBe("verified");
      expect(fake.notifications.at(-1)?.message).toContain("A1");
    });
  });

  test("advances the plan through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "implement plan command");
      await fake.commands.get("plan:done").handler("inspection complete", fake.ctx(root));

      const plan = await readPlan(root, task.id);
      expect(plan.steps[0]?.status).toBe("done");
      expect(plan.currentStepId).toBe("P2");
      expect(fake.notifications.at(-1)?.message).toContain("Next: P2");
    });
  });

  test("shows verification suggestions through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);
      await writeFile(
        path.join(root, "package.json"),
        `${JSON.stringify({ scripts: { test: "bun test" } }, null, 2)}\n`,
        "utf8",
      );

      await createTask(root, "implement verification command");
      await fake.commands.get("verify:suggest").handler("", fake.ctx(root));

      expect(fake.notifications.at(-1)?.message).toContain("bun run test");
    });
  });

  test("creates spec proposals through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      await createTask(root, "document command proposal\n- 验收: proposal is created");
      await fake.commands.get("spec:update").handler("proposal note", fake.ctx(root));

      const proposals = await listSpecProposals(root);
      expect(proposals).toHaveLength(1);
      expect(fake.notifications.at(-1)?.message).toContain("Created spec proposal");
    });
  });

  test("resumes a task through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "implement resume command\n- 验收: resume command triggers a turn");
      await fake.commands.get("task:resume").handler("", fake.ctx(root));

      expect(fake.sentMessages).toHaveLength(1);
      expect(fake.sentMessages[0]?.message.customType).toBe("project-flow-resume");
      expect(fake.sentMessages[0]?.message.content).toContain(task.id);
      expect(fake.sentMessages[0]?.message.content).toContain("# Resume Pack");
      expect(fake.sentMessages[0]?.options?.triggerTurn).toBe(true);
    });
  });

  test("updates research artifacts through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "implement research command\n- 验收: research command records notes");
      await fake.commands.get("research:add").handler("Found a useful API detail", fake.ctx(root));

      const research = await readTaskResearch(root, task.id);
      expect(research?.items[0]?.summary).toBe("Found a useful API detail");
      expect(fake.notifications.at(-1)?.message).toContain("research items: 1");

      await fake.commands.get("research:status").handler("", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain(`Research for ${task.id}`);
      expect(fake.notifications.at(-1)?.message).toContain("Found a useful API detail");

      await fake.commands.get("task:info").handler("", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("# Task Info");
      expect(fake.notifications.at(-1)?.message).toContain("## Manual Notes");
    });
  });

  test("shows task metadata through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "implement metadata command\n- 验收: metadata is visible");
      await fake.commands.get("task:metadata").handler("", fake.ctx(root));

      expect(fake.notifications.at(-1)?.message).toContain(`Metadata for ${task.id}`);
      expect(fake.notifications.at(-1)?.message).toContain("kind: feature");
      expect(fake.notifications.at(-1)?.message).toContain("source: user");
    });
  });

  test("creates and shows child tasks through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const parent = await createTask(root, "implement parent command\n- 验收: children are visible");
      await fake.commands.get("task:child").handler("implement child command\n- 验收: child exists", fake.ctx(root));

      const active = await loadActiveTask(root);
      expect(active?.id).toBe(parent.id);
      expect(active?.metadata?.relationships.childTaskIds).toHaveLength(1);
      expect(fake.notifications.at(-1)?.message).toContain("Created child task");

      await fake.commands.get("task:tree").handler("", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("# Subtask Tree");
      expect(fake.notifications.at(-1)?.message).toContain(active?.metadata?.relationships.childTaskIds[0] || "");
    });
  });

  test("shows and applies subtask plans through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, [
        "implement command subtask planning",
        "- Acceptance: show subtask suggestions",
        "- Acceptance: create child tasks from suggestions",
        "- Acceptance: preserve parent active task",
      ].join("\n"));

      await fake.commands.get("task:subtasks").handler("", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("subtask plan:");
      expect(fake.notifications.at(-1)?.message).toContain("suggested");

      await fake.commands.get("task:subtasks").handler("--apply", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("Created");
      const plan = await readSubtaskPlan(root, task.id);
      expect(plan?.items.some(item => item.status === "created")).toBe(true);
      const active = await loadActiveTask(root);
      expect(active?.id).toBe(task.id);
    });
  });

  test("uses project subtask mode setting on automatic task creation", async () => {
    await withTempProject(async root => {
      await mkdir(path.join(root, ".omp"), { recursive: true });
      await writeFile(path.join(root, ".omp", "plugin-overrides.json"), JSON.stringify({
        settings: {
          "omp-project-flow": {
            autoSubtaskMode: "auto",
          },
        },
      }, null, 2));
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const beforeAgentStart = fake.handlers.get("before_agent_start")?.[0];
      await beforeAgentStart?.(
        {
          type: "before_agent_start",
          prompt: [
            "implement configured automatic subtask planning",
            "- Acceptance: generate subtask suggestions",
            "- Acceptance: create child tasks automatically",
            "- Acceptance: preserve parent task as active",
          ].join("\n"),
          systemPrompt: [],
        },
        fake.ctx(root),
      );

      const active = await loadActiveTask(root);
      expect(active).toBeDefined();
      const plan = await readSubtaskPlan(root, active!.id);
      expect(plan?.mode).toBe("auto");
      expect(plan?.items.some(item => item.status === "created" && !!item.childTaskId)).toBe(true);
    });
  });

  test("runs clarification through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "实现澄清命令\n- 验收: 可以回答问题\n是否需要兼容旧配置？");
      await fake.commands.get("task:clarify").handler("", fake.ctx(root));

      expect(fake.notifications.at(-1)?.message).toContain("current: C1");
      expect(fake.sentMessages.at(-1)?.message.customType).toBe("project-flow-clarify");
      expect(fake.sentMessages.at(-1)?.message.content).toContain("Question C1");

      await fake.commands.get("task:clarify").handler("需要兼容旧配置", fake.ctx(root));
      const clarification = await readTaskClarification(root, task.id);
      expect(clarification?.status).toBe("ready");
      expect(clarification?.questions[0]?.answer).toBe("需要兼容旧配置");
      expect(fake.notifications.at(-1)?.message).toContain("status: ready");
    });
  });

  test("does not capture the internal clarification prompt as an answer", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "实现澄清提示\n- 验收: 内部提示不会自答\n是否需要保留旧行为？");
      await fake.commands.get("task:clarify").handler("", fake.ctx(root));
      const prompt = fake.sentMessages.at(-1)?.message.content;
      expect(prompt).toContain("Continue Project Flow clarification");

      const beforeAgentStart = fake.handlers.get("before_agent_start")?.[0];
      await beforeAgentStart?.(
        {
          type: "before_agent_start",
          prompt,
          systemPrompt: [],
        },
        fake.ctx(root),
      );

      const clarification = await readTaskClarification(root, task.id);
      expect(clarification?.status).toBe("collecting");
      expect(clarification?.questions[0]?.status).toBe("asking");
      expect(clarification?.questions[0]?.answer).toBeUndefined();
    });
  });

  test("task clarify status does not mutate old tasks without clarification artifacts", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "implement legacy task");
      const taskDir = path.join(root, ".project-flow", "tasks", task.id);
      await rm(path.join(taskDir, "clarification.json"), { force: true });
      await rm(path.join(taskDir, "clarification.md"), { force: true });

      await fake.commands.get("task:clarify").handler("", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("No clarification artifact");
      expect(await readTaskClarification(root, task.id)).toBeUndefined();
    });
  });

  test("compact clarification treats skip and finish words as answers unless they are flags", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "实现澄清答案解析\n- 验收: 普通答案不被命令吞掉\n是否跳过迁移？");
      await fake.commands.get("task:clarify").handler("skip migration is not allowed", fake.ctx(root));

      const clarification = await readTaskClarification(root, task.id);
      expect(clarification?.status).toBe("ready");
      expect(clarification?.questions[0]?.status).toBe("answered");
      expect(clarification?.questions[0]?.answer).toBe("skip migration is not allowed");
    });
  });

  test("captures the next user prompt as a clarification answer before agent start", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "实现自动澄清\n- 验收: 下一轮回答会被记录\n是否需要迁移旧数据？");
      const beforeAgentStart = fake.handlers.get("before_agent_start")?.[0];
      const result = await beforeAgentStart?.(
        {
          type: "before_agent_start",
          prompt: "需要迁移旧数据，并保留旧字段读取。",
          systemPrompt: [],
        },
        fake.ctx(root),
      );

      const active = await loadActiveTask(root);
      expect(active?.id).toBe(task.id);
      const clarification = await readTaskClarification(root, task.id);
      expect(clarification?.status).toBe("ready");
      expect(clarification?.questions[0]?.answer).toContain("需要迁移旧数据");
      expect(result?.message?.content).toContain("Clarification loop:");
      expect(result?.message?.content).toContain("status: ready");
    });
  });

  test("shows readiness and blocks finish until forced", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "implement finish command gate\n- 验收: force can override");
      await fake.commands.get("task:status").handler("", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("readiness: blocked");

      await fake.commands.get("task:readiness").handler("", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("status: blocked");

      await fake.commands.get("task:finish").handler("too soon", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("Finish blocked");
      expect((await loadActiveTask(root))?.id).toBe(task.id);

      await fake.commands.get("task:finish").handler("--force accepted risk", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("Finished task");
      expect(fake.notifications.at(-1)?.message).toContain("--force");
      expect(await loadActiveTask(root)).toBeUndefined();
    });
  });

  test("shows task snapshots through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      const task = await createTask(root, "implement snapshot command\n- 验收: snapshot command works");
      await fake.commands.get("task:snapshot").handler("", fake.ctx(root));

      expect(fake.notifications.at(-1)?.message).toContain(task.id);
      expect(fake.notifications.at(-1)?.message).toContain("next action:");
      expect(fake.notifications.at(-1)?.message).toContain("readiness:");
    });
  });

  test("shows project overview through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      await createTask(root, "implement overview command\n- 验收: overview command works");
      await fake.commands.get("flow:overview").handler("", fake.ctx(root));

      expect(fake.notifications.at(-1)?.message).toContain("Project Flow overview");
      expect(fake.notifications.at(-1)?.message).toContain("tasks: 1");
      expect(fake.notifications.at(-1)?.message).toContain("blocked tasks:");
    });
  });

  test("shows and starts upstream sync through the command surface", async () => {
    await withTempProject(async root => {
      const fake = createFakePi();
      projectFlowExtension(fake.pi);

      await fake.commands.get("upstream:status").handler("", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("Upstream sync");
      expect(fake.notifications.at(-1)?.message).toContain("needs review");

      await fake.commands.get("upstream:review").handler("ecc v1.2.3 checked release notes", fake.ctx(root));
      expect(fake.notifications.at(-1)?.message).toContain("Reviewed upstream source ecc");

      await fake.commands.get("upstream:sync").handler("follow up on missing coverage", fake.ctx(root));
      const active = await loadActiveTask(root);
      expect(active?.title).toBe("Continue Project Flow upstream sync review.");
      expect(active?.metadata?.kind).toBe("upstream-sync");
      expect(active?.metadata?.source).toBe("upstream_sync");
      expect(active?.metadata?.labels).toContain("upstream");
      expect(fake.notifications.at(-1)?.message).toContain("Created upstream sync task");
    });
  });
});
