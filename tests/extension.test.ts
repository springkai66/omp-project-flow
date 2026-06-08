import { describe, expect, test } from "bun:test";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import projectFlowExtension from "../src/index";
import { createTask, listSpecProposals, loadActiveTask, readAcceptance, readPlan } from "../src/core";

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
      expect(fake.notifications.at(-1)?.message).toContain("Created upstream sync task");
    });
  });
});
