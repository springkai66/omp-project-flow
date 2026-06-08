import { mkdir, readFile, readdir, realpath, rm, stat, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type TaskStatus = "active" | "paused" | "finished";
export type TaskPhase = "intake" | "planning" | "implementing" | "verifying" | "finished";

export interface ProjectPaths {
  root: string;
  flowDir: string;
  specDir: string;
  specProposalsDir: string;
  upstreamsDir: string;
  workspaceDir: string;
  tasksDir: string;
  workflowDir: string;
  journalsDir: string;
  activeTaskPath: string;
}

export interface Checkpoint {
  id: string;
  label: string;
  done: boolean;
}

export interface TaskState {
  id: string;
  title: string;
  status: TaskStatus;
  phase: TaskPhase;
  createdAt: string;
  updatedAt: string;
  cwd: string;
  initialPrompt: string;
  lastPrompt?: string;
  counters: {
    toolCalls: number;
    failedToolCalls: number;
    turns: number;
  };
  checkpoints: Checkpoint[];
}

export interface SpecDocument {
  source: "project-flow";
  path: string;
  relativePath: string;
  title: string;
  content: string;
  tags: string[];
  scope: string[];
  score: number;
}

export interface ContextBundle {
  root: string;
  task?: TaskState;
  specs: SpecDocument[];
  acceptance?: AcceptanceState;
  plan?: PlanState;
  verificationStrategy?: VerificationStrategy;
  handoff?: string;
  resume?: ResumeState;
  readiness?: ReadinessState;
  snapshot?: TaskSnapshot;
  research?: ResearchState;
  info?: string;
  upstreamReport?: UpstreamSyncReport;
  content: string;
}

export interface TaskEvent {
  type: string;
  timestamp: string;
  data?: unknown;
}

export interface ResumeState {
  taskId: string;
  updatedAt: string;
  nextAction: string;
  generatedFrom?: string;
  recentEvents: Array<{
    type: string;
    timestamp: string;
    summary: string;
  }>;
  touchedFiles: string[];
  openAcceptance: string[];
  failedChecks: string[];
}

export type ReadinessStatus = "ready" | "warning" | "blocked";

export interface ReadinessState {
  taskId: string;
  updatedAt: string;
  status: ReadinessStatus;
  generatedFrom?: string;
  summary: string;
  blockers: string[];
  warnings: string[];
  passes: string[];
  nextActions: string[];
}

export interface TaskSnapshot {
  taskId: string;
  updatedAt: string;
  generatedFrom?: string;
  title: string;
  status: TaskStatus;
  phase: TaskPhase;
  summary: string;
  task: TaskState;
  acceptance: AcceptanceState;
  plan: PlanState;
  verification: VerificationState;
  verificationStrategy: VerificationStrategy;
  resume: ResumeState;
  readiness: ReadinessState;
  recentEvents: ResumeState["recentEvents"];
  touchedFiles: string[];
  research?: ResearchState;
  info?: string;
  handoff?: string;
}

export interface ResearchItem {
  id: string;
  timestamp: string;
  source?: string;
  summary: string;
  details?: string;
}

export interface ResearchState {
  taskId: string;
  updatedAt: string;
  generatedFrom?: string;
  openQuestions: string[];
  decisions: string[];
  items: ResearchItem[];
}

export interface ProjectOverviewTask {
  id: string;
  title: string;
  status: TaskStatus;
  phase: TaskPhase;
  updatedAt: string;
  readiness: ReadinessStatus;
  nextAction?: string;
  acceptanceDone: number;
  acceptanceTotal: number;
  verificationChecks: number;
  latestVerification?: "pass" | "fail";
}

export interface ProjectOverview {
  root: string;
  updatedAt: string;
  activeTaskId?: string;
  totals: {
    tasks: number;
    active: number;
    paused: number;
    finished: number;
    blockedReadiness: number;
    warningReadiness: number;
    readyReadiness: number;
    proposedSpecs: number;
  };
  tasks: ProjectOverviewTask[];
  nextActions: string[];
  blockedTasks: string[];
  specProposals: Array<{
    id: string;
    title: string;
    status: SpecProposalStatus;
    taskId: string;
  }>;
}

export type UpstreamSourceStatus = "tracked" | "needs-review" | "ignored";
export type UpstreamCapabilityStatus = "covered" | "partial" | "missing" | "watch";
export type UpstreamRisk = "low" | "medium" | "high";

export interface UpstreamSource {
  id: string;
  name: string;
  status: UpstreamSourceStatus;
  url?: string;
  reference?: string;
  referenceUpdatedAt?: string;
  lastReviewedAt?: string;
  focus: string[];
  notes: string[];
}

export interface UpstreamCapability {
  id: string;
  title: string;
  upstreams: string[];
  localStatus: UpstreamCapabilityStatus;
  risk: UpstreamRisk;
  localImplementation: string[];
  nextActions: string[];
}

export interface UpstreamSyncReport {
  root: string;
  updatedAt: string;
  generatedFrom?: string;
  sources: UpstreamSource[];
  capabilities: UpstreamCapability[];
  totals: {
    sources: number;
    needsReview: number;
    covered: number;
    partial: number;
    missing: number;
    watch: number;
  };
  staleSources: string[];
  watchItems: string[];
  nextActions: string[];
}

export interface UpstreamSourceUpdateResult {
  status: "updated" | "missing";
  source?: UpstreamSource;
  report: UpstreamSyncReport;
}

export interface VerificationCheck {
  id: string;
  timestamp: string;
  toolName: string;
  toolCallId?: string;
  command?: string;
  success: boolean;
  summary?: string;
}

export interface VerificationState {
  checks: VerificationCheck[];
  updatedAt: string;
}

export interface VerificationSuggestion {
  id: string;
  command: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  source: string;
}

export interface VerificationStrategy {
  suggestions: VerificationSuggestion[];
  updatedAt: string;
  sources: string[];
}

export type AcceptanceStatus = "open" | "done" | "blocked";

export interface AcceptanceItem {
  id: string;
  text: string;
  status: AcceptanceStatus;
  evidence?: string;
  updatedAt: string;
}

export interface AcceptanceState {
  items: AcceptanceItem[];
  updatedAt: string;
}

export interface AcceptanceUpdateResult {
  status: "updated" | "missing" | "ambiguous";
  state: AcceptanceState;
  item?: AcceptanceItem;
  matches: AcceptanceItem[];
}

export type PlanStepStatus = "pending" | "active" | "done" | "blocked";

export interface PlanStep {
  id: string;
  text: string;
  status: PlanStepStatus;
  evidence?: string;
  updatedAt: string;
}

export interface PlanState {
  steps: PlanStep[];
  currentStepId?: string;
  updatedAt: string;
}

export interface PlanUpdateResult {
  status: "updated" | "missing" | "ambiguous";
  state: PlanState;
  step?: PlanStep;
  matches: PlanStep[];
}

export type SpecProposalStatus = "proposed" | "applied" | "rejected";

export interface SpecProposal {
  id: string;
  title: string;
  status: SpecProposalStatus;
  taskId: string;
  createdAt: string;
  updatedAt: string;
  proposalPath: string;
  targetPath: string;
  summary: string;
  content: string;
}

export interface SpecProposalResolution {
  status: "found" | "missing" | "ambiguous";
  proposal?: SpecProposal;
  matches: SpecProposal[];
}

export interface TaskResolution {
  status: "found" | "missing" | "ambiguous";
  task?: TaskState;
  matches: TaskState[];
}

const DEFAULT_CHECKPOINTS: Checkpoint[] = [
  { id: "intake", label: "Capture PRD and acceptance criteria", done: true },
  { id: "plan", label: "Build or refine implementation plan", done: false },
  { id: "implement", label: "Apply code changes", done: false },
  { id: "verify", label: "Run relevant checks", done: false },
  { id: "finish", label: "Write journal and archive task", done: false },
];

const CODE_WORK_PATTERNS = [
  /\b(add|build|change|check|create|debug|delete|diagnose|fix|implement|inspect|install|integrate|modify|refactor|remove|repair|scan|test|troubleshoot|update|verify)\b/i,
  /\b(bug|code|config|error|file|hook|plugin|project|test|workflow)\b.*\b(broken|failing|issue|not working|problem|trigger)\b/i,
  /\b(broken|failing|issue|not working|problem|trigger)\b.*\b(bug|code|config|error|file|hook|plugin|project|test|workflow)\b/i,
  /帮我.*(写|做|改|修|加|删|开发|实现|集成|安装|移除|重构|清理|检查|排查|查找|扫描|分析|审查|定位|验证|测试|补充|完善)/,
  /(写|做|改|修|加|删|开发|实现|集成|安装|移除|重构|清理|检查|排查|查找|扫描|分析|审查|定位|验证|测试|补充|完善).*(代码|插件|功能|项目|文件|配置|hook|硬编码|bug|错误|问题|测试|流程)/,
];

const QUESTION_ONLY_PATTERNS = [
  /^(how|what|why|when|where|who)\b/i,
  /^(如何|什么|为什么|怎么理解|能否解释|解释一下)/,
];

const VERIFY_TOOL_PATTERNS = /\b(bash|cmd|command|powershell|shell|terminal)\b/i;

const VERIFY_COMMAND_PATTERNS = [
  /\b(bun|npm|pnpm|yarn)\s+(run\s+)?(test|check|lint|typecheck|build)\b/i,
  /\b(bun|node)\s+--check\b/i,
  /\b(npx\s+)?(vitest|jest|mocha|eslint|tsc|prettier)\b/i,
  /\bpytest\b/i,
  /\bpython(?:3)?\s+-m\s+(pytest|unittest|mypy|ruff)\b/i,
  /\b(cargo|go|dotnet)\s+test\b/i,
  /\bgradle(w)?\s+test\b/i,
  /\bmvn\s+test\b/i,
  /\bmake\s+(test|check|lint)\b/i,
  /\bomp\s+plugin\s+doctor\b/i,
];

const IMPLEMENTATION_TOOL_NAMES = new Set(["delete", "edit", "move", "write"]);
const COMMAND_TOOL_NAMES = new Set(["bash", "cmd", "powershell", "shell", "shell_command", "terminal"]);

const MUTATING_COMMAND_PATTERNS = [
  /\b(apply_patch|git\s+apply|patch)\b/i,
  /\b(Set-Content|Add-Content|Out-File|New-Item|Remove-Item|Move-Item|Copy-Item|Rename-Item)\b/i,
  /\b(cat|echo|printf)\b[\s\S]{0,200}>\s*[^\s&|]+/i,
  /\b(rm|mv|cp|mkdir|touch)\b/i,
  /\b(bun|npm|pnpm|yarn)\s+(add|install|remove|uninstall)\b/i,
  /\b(pip|pipx|uv|poetry)\s+(add|install|remove|uninstall)\b/i,
  /\b(cargo|go)\s+(add|get|install|mod\s+tidy)\b/i,
];

const DEFAULT_UPSTREAM_SOURCES: UpstreamSource[] = [
  {
    id: "ecc",
    name: "Everything Claude Code",
    status: "tracked",
    reference: "manual-review-required",
    focus: [
      "agent orchestration patterns",
      "hook and skill composition",
      "audit and verification packs",
      "marketplace-style extension ideas",
    ],
    notes: [
      "Use as design inspiration only; do not copy upstream code directly.",
      "Prefer local Project Flow state and OMP command/event surfaces.",
    ],
  },
  {
    id: "omo",
    name: "Oh My OpenAgent",
    status: "tracked",
    reference: "manual-review-required",
    focus: [
      "resumable task state",
      "workspace memory",
      "context assembly",
      "workflow status conventions",
    ],
    notes: [
      "Use as design inspiration only; preserve Project Flow runtime paths.",
      "Map useful changes into reviewable local capabilities before implementation.",
    ],
  },
];

const DEFAULT_UPSTREAM_CAPABILITIES: UpstreamCapability[] = [
  {
    id: "session-active-task",
    title: "Session-scoped active task selection",
    upstreams: ["omo"],
    localStatus: "missing",
    risk: "medium",
    localImplementation: [
      "Project Flow currently uses one project-level active task in workflow/active-task.json.",
    ],
    nextActions: [
      "Inspect whether OMP exposes a stable session id in ExtensionContext.",
      "Add a session active-task map with project active-task fallback.",
      "Update hidden context and task commands to prefer the current session binding.",
    ],
  },
  {
    id: "subtask-tree",
    title: "Parent and child task breakdown",
    upstreams: ["omo", "ecc"],
    localStatus: "missing",
    risk: "medium",
    localImplementation: [
      "Project Flow stores flat task records with structured plan steps.",
    ],
    nextActions: [
      "Add optional parentTaskId and child task indexes.",
      "Keep existing flat task commands compatible.",
      "Summarize child readiness in task snapshots and project overview.",
    ],
  },
  {
    id: "research-artifacts",
    title: "Research and implementation evidence packs",
    upstreams: ["ecc"],
    localStatus: "covered",
    risk: "low",
    localImplementation: [
      "Project Flow writes PRD, handoff, resume, readiness, snapshot, and verification strategy files.",
      "Project Flow writes research/research.json, research/notes.md, and info.md for each task.",
      "Research artifacts are linked from task snapshots, hidden context, and spec proposals.",
    ],
    nextActions: [
      "Watch ECC/Superpowers patterns for richer research sections and source extraction.",
    ],
  },
  {
    id: "verification-loop",
    title: "Automatic verification remediation loop",
    upstreams: ["ecc", "omo"],
    localStatus: "partial",
    risk: "high",
    localImplementation: [
      "Project Flow detects verification commands, records pass/fail, and blocks finish on failed or missing checks.",
      "It does not automatically re-enter a fix-and-rerun loop after failed verification.",
    ],
    nextActions: [
      "Design an opt-in loop that creates next actions instead of silently running commands.",
      "Track rerun attempts and stop conditions in verification.json.",
    ],
  },
  {
    id: "extension-marketplace",
    title: "External hook, skill, and extension catalog tracking",
    upstreams: ["ecc"],
    localStatus: "watch",
    risk: "low",
    localImplementation: [
      "Project Flow ships as one local OMP plugin and records source policy with /sources:check.",
    ],
    nextActions: [
      "Watch upstream extension catalog patterns.",
      "Only add a catalog if Project Flow gains multiple optional modules.",
    ],
  },
];

export async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

export function getProjectPaths(root: string): ProjectPaths {
  const flowDir = path.join(root, ".project-flow");
  const workspaceDir = path.join(flowDir, "workspace");
  const workflowDir = path.join(flowDir, "workflow");
  return {
    root,
    flowDir,
    specDir: path.join(flowDir, "spec"),
    specProposalsDir: path.join(flowDir, "spec-proposals"),
    upstreamsDir: path.join(flowDir, "upstreams"),
    workspaceDir,
    tasksDir: path.join(flowDir, "tasks"),
    workflowDir,
    journalsDir: path.join(workspaceDir, "journals"),
    activeTaskPath: path.join(workflowDir, "active-task.json"),
  };
}

export async function findProjectRoot(start: string): Promise<string> {
  const original = path.resolve(start);
  const home = await pathIdentity(path.resolve(process.env.USERPROFILE || process.env.HOME || ""));
  let current = original;
  while (true) {
    const markers = [".git", ".project-flow", ".omp", "package.json", "pyproject.toml", "Cargo.toml"];
    for (const marker of markers) {
      // ~/.omp is the global agent config, not a project marker.
      if (marker === ".omp" && home && (await pathIdentity(current)).toLowerCase() === home.toLowerCase()) {
        continue;
      }
      if (await pathExists(path.join(current, marker))) {
        return current;
      }
    }
    const parent = path.dirname(current);
    if (parent === current) return original;
    current = parent;
  }
}

async function pathIdentity(target: string): Promise<string> {
  try {
    return await realpath(target);
  } catch {
    return path.resolve(target);
  }
}

export async function ensureProject(root: string): Promise<ProjectPaths> {
  const paths = getProjectPaths(root);
  await mkdir(paths.specDir, { recursive: true });
  await mkdir(paths.specProposalsDir, { recursive: true });
  await mkdir(paths.upstreamsDir, { recursive: true });
  await mkdir(paths.tasksDir, { recursive: true });
  await mkdir(paths.workflowDir, { recursive: true });
  await mkdir(paths.journalsDir, { recursive: true });

  const readme = path.join(paths.specDir, "README.md");
  if (!(await pathExists(readme))) {
    await writeFile(
      readme,
      [
        "# Project Specs",
        "",
        "Put durable project rules here. The Project Flow extension selects relevant specs automatically.",
        "",
        "Example frontmatter:",
        "",
        "---",
        "tags: [backend, testing]",
        "scope: [src/api/**, tests/**]",
        "---",
        "",
      ].join("\n"),
      "utf8",
    );
  }

  return paths;
}

export function isCodeWorkPrompt(prompt: string): boolean {
  const trimmed = prompt.trim();
  if (!trimmed) return false;
  if (QUESTION_ONLY_PATTERNS.some(pattern => pattern.test(trimmed)) && !CODE_WORK_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return false;
  }
  return CODE_WORK_PATTERNS.some(pattern => pattern.test(trimmed));
}

export function shouldInferTaskFromTool(data: { toolName: string; args?: unknown; resultSummary?: string }): boolean {
  if (IMPLEMENTATION_TOOL_NAMES.has(data.toolName)) return true;
  if (isVerificationToolCall(data)) return true;
  if (!COMMAND_TOOL_NAMES.has(data.toolName)) return false;
  const command = extractCommand(data.args);
  if (!command) return false;
  return MUTATING_COMMAND_PATTERNS.some(pattern => pattern.test(command));
}

export function inferTaskPromptFromTool(data: { toolName: string; args?: unknown; resultSummary?: string }): string {
  const command = extractCommand(data.args);
  const files = extractFilePaths(data.args).slice(0, 4);
  const target = files.length > 0 ? ` touching ${files.join(", ")}` : "";
  if (command) return `Continue Project Flow for ${data.toolName}: ${summarizeUnknown(command, 140)}`;
  return `Continue Project Flow for ${data.toolName}${target}`;
}

export function safeSlug(input: string): string {
  const ascii = input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .replace(/[_\s]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  if (ascii) return ascii;
  return crypto.createHash("sha1").update(input).digest("hex").slice(0, 10);
}

export function taskIdFromPrompt(prompt: string, now = new Date()): string {
  const date = now.toISOString().slice(0, 10).replaceAll("-", "");
  return `T-${date}-${safeSlug(prompt)}`;
}

export async function loadActiveTask(root: string): Promise<TaskState | undefined> {
  const paths = getProjectPaths(root);
  if (!(await pathExists(paths.activeTaskPath))) return undefined;
  try {
    const active = JSON.parse(await readFile(paths.activeTaskPath, "utf8")) as { id?: string };
    if (!active.id) return undefined;
    return await loadTask(root, active.id);
  } catch {
    return undefined;
  }
}

export async function loadTask(root: string, taskId: string): Promise<TaskState | undefined> {
  const taskPath = path.join(getProjectPaths(root).tasksDir, taskId, "task.json");
  if (!(await pathExists(taskPath))) return undefined;
  try {
    return JSON.parse(await readFile(taskPath, "utf8")) as TaskState;
  } catch {
    return undefined;
  }
}

export async function listTasks(root: string): Promise<TaskState[]> {
  const paths = getProjectPaths(root);
  if (!(await pathExists(paths.tasksDir))) return [];
  const entries = await readdir(paths.tasksDir, { withFileTypes: true });
  const tasks: TaskState[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const task = await loadTask(root, entry.name);
    if (task) tasks.push(task);
  }
  return tasks.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function resolveTask(root: string, query: string): Promise<TaskResolution> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return { status: "missing", matches: [] };

  const tasks = await listTasks(root);
  const exact = tasks.find(task => task.id.toLowerCase() === normalized);
  if (exact) return { status: "found", task: exact, matches: [exact] };

  const matches = tasks.filter(task => task.id.toLowerCase().startsWith(normalized));
  if (matches.length === 1) return { status: "found", task: matches[0], matches };
  if (matches.length > 1) return { status: "ambiguous", matches };

  const titleMatches = tasks.filter(task => task.title.toLowerCase().includes(normalized));
  if (titleMatches.length === 1) return { status: "found", task: titleMatches[0], matches: titleMatches };
  if (titleMatches.length > 1) return { status: "ambiguous", matches: titleMatches };

  return { status: "missing", matches: [] };
}

export async function setActiveTask(root: string, taskId: string): Promise<TaskState | undefined> {
  const paths = await ensureProject(root);
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const previous = await loadActiveTask(root);
  if (previous && previous.id !== task.id && previous.status === "active") {
    previous.status = "paused";
    await saveTask(root, previous);
    await appendTaskEvent(root, previous.id, {
      type: "task_paused",
      timestamp: previous.updatedAt,
      data: { reason: "switched_active_task", nextTaskId: task.id },
    });
    await writeTaskResume(root, previous, "switched_active_task");
  }
  task.status = "active";
  task.updatedAt = new Date().toISOString();
  await saveTask(root, task);
  await writeFile(paths.activeTaskPath, `${JSON.stringify({ id: task.id, updatedAt: task.updatedAt }, null, 2)}\n`, "utf8");
  await appendTaskEvent(root, task.id, { type: "task_activated", timestamp: task.updatedAt, data: { taskId: task.id } });
  await writeTaskHandoff(root, task, "activated");
  return task;
}

export function formatTaskSummary(
  task: TaskState,
  verification?: VerificationState,
  acceptance?: AcceptanceState,
  plan?: PlanState,
  verificationStrategy?: VerificationStrategy,
  readiness?: ReadinessState,
): string {
  const checks = verification?.checks ?? [];
  const lastCheck = checks.at(-1);
  const acceptanceItems = acceptance?.items ?? [];
  const doneAcceptance = acceptanceItems.filter(item => item.status === "done").length;
  const blockedAcceptance = acceptanceItems.filter(item => item.status === "blocked").length;
  const nextStep = plan ? nextPlanStep(plan) : undefined;
  const suggestionCount = verificationStrategy?.suggestions.length ?? 0;
  const readinessLine = readiness ? `readiness: ${readiness.status} - ${readiness.summary}` : undefined;
  const checkpointText = task.checkpoints
    .map(checkpoint => `[${checkpoint.done ? "x" : " "}] ${checkpoint.id}`)
    .join(" ");
  return [
    `${task.id}`,
    `${task.title}`,
    `status: ${task.status}`,
    `phase: ${task.phase}`,
    `updated: ${task.updatedAt}`,
    `turns: ${task.counters.turns}`,
    `tools: ${task.counters.toolCalls} (${task.counters.failedToolCalls} failed)`,
    `verification: ${checks.length}${lastCheck ? `, last ${lastCheck.success ? "passed" : "failed"}` : ""}`,
    `acceptance: ${doneAcceptance}/${acceptanceItems.length} done${blockedAcceptance ? `, ${blockedAcceptance} blocked` : ""}`,
    `plan: ${nextStep ? `${nextStep.id} ${nextStep.status} - ${nextStep.text}` : "complete"}`,
    `verification suggestions: ${suggestionCount}`,
    readinessLine,
    `checkpoints: ${checkpointText}`,
  ].filter(line => line !== undefined).join("\n");
}

export async function saveTask(root: string, task: TaskState): Promise<void> {
  task.updatedAt = new Date().toISOString();
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  await writeFile(path.join(taskDir, "task.json"), `${JSON.stringify(task, null, 2)}\n`, "utf8");
}

export async function appendTaskEvent(root: string, taskId: string, event: TaskEvent): Promise<void> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, taskId);
  await mkdir(taskDir, { recursive: true });
  const line = JSON.stringify({ ...event, timestamp: event.timestamp || new Date().toISOString() });
  await appendFile(path.join(taskDir, "events.jsonl"), `${line}\n`, "utf8");
}

export async function readTaskEvents(root: string, taskId: string): Promise<TaskEvent[]> {
  const eventsPath = path.join(getProjectPaths(root).tasksDir, taskId, "events.jsonl");
  if (!(await pathExists(eventsPath))) return [];
  const content = await readFile(eventsPath, "utf8").catch(() => "");
  const events: TaskEvent[] = [];
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const parsed = JSON.parse(line) as TaskEvent;
      if (typeof parsed.type === "string" && typeof parsed.timestamp === "string") events.push(parsed);
    } catch {
      // Ignore malformed historical event lines.
    }
  }
  return events;
}

export async function readTaskResearch(root: string, taskId: string): Promise<ResearchState | undefined> {
  const researchPath = path.join(getProjectPaths(root).tasksDir, taskId, "research", "research.json");
  if (!(await pathExists(researchPath))) return undefined;
  try {
    const parsed = JSON.parse(await readFile(researchPath, "utf8")) as Partial<ResearchState>;
    if (typeof parsed.taskId !== "string" || typeof parsed.updatedAt !== "string") return undefined;
    return {
      taskId: parsed.taskId,
      updatedAt: parsed.updatedAt,
      generatedFrom: typeof parsed.generatedFrom === "string" ? parsed.generatedFrom : undefined,
      openQuestions: Array.isArray(parsed.openQuestions) ? parsed.openQuestions.filter(item => typeof item === "string") : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.filter(item => typeof item === "string") : [],
      items: Array.isArray(parsed.items) ? parsed.items.filter(isResearchItem) : [],
    };
  } catch {
    return undefined;
  }
}

export async function readTaskInfo(root: string, taskId: string): Promise<string | undefined> {
  const infoPath = path.join(getProjectPaths(root).tasksDir, taskId, "info.md");
  if (!(await pathExists(infoPath))) return undefined;
  return readFile(infoPath, "utf8");
}

export async function addTaskResearchNote(
  root: string,
  taskId: string,
  note: string,
  source = "manual",
): Promise<ResearchState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const now = new Date().toISOString();
  const existing = await readTaskResearch(root, taskId);
  const researchPath = path.join(getProjectPaths(root).tasksDir, taskId, "research", "research.json");
  if (!existing && await pathExists(researchPath)) return undefined;
  const state = existing || createResearchState(taskId, [], now, "created_from_note");
  const trimmed = note.trim();
  if (!trimmed) return state;
  const id = `R${state.items.length + 1}`;
  state.items.push({
    id,
    timestamp: now,
    source,
    summary: trimmed.split(/\r?\n/)[0]?.slice(0, 180) || "Research note",
    details: trimmed,
  });
  state.updatedAt = now;
  state.generatedFrom = "research_note";
  await writeResearchFiles(root, task, state);
  await appendTaskEvent(root, task.id, {
    type: "research_added",
    timestamp: now,
    data: { id, source, summary: state.items.at(-1)?.summary },
  });
  await writeTaskInfo(root, task, "research_added");
  return state;
}

export async function writeTaskInfo(root: string, task: TaskState, reason = "update"): Promise<string> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  const infoPath = path.join(taskDir, "info.md");
  const existing = await readTaskInfo(root, task.id);
  if (existing !== undefined) return existing;
  const currentTask = await loadTask(root, task.id) || task;
  const [acceptance, plan, verificationStrategy, research] = await Promise.all([
    readAcceptance(root, currentTask.id),
    readPlan(root, currentTask.id),
    readVerificationStrategy(root, currentTask.id),
    readTaskResearch(root, currentTask.id),
  ]);
  const content = formatTaskInfo(currentTask, acceptance, plan, verificationStrategy, research, reason);
  await writeFile(infoPath, content, "utf8");
  return content;
}

export async function readTaskResume(root: string, taskId: string): Promise<ResumeState | undefined> {
  const resumePath = path.join(getProjectPaths(root).tasksDir, taskId, "resume.json");
  if (!(await pathExists(resumePath))) return undefined;
  try {
    const parsed = JSON.parse(await readFile(resumePath, "utf8")) as Partial<ResumeState>;
    if (typeof parsed.taskId !== "string" || typeof parsed.updatedAt !== "string" || typeof parsed.nextAction !== "string") {
      return undefined;
    }
    return {
      taskId: parsed.taskId,
      updatedAt: parsed.updatedAt,
      nextAction: parsed.nextAction,
      generatedFrom: typeof parsed.generatedFrom === "string" ? parsed.generatedFrom : undefined,
      recentEvents: Array.isArray(parsed.recentEvents) ? parsed.recentEvents.filter(isResumeEvent) : [],
      touchedFiles: Array.isArray(parsed.touchedFiles) ? parsed.touchedFiles.filter(item => typeof item === "string") : [],
      openAcceptance: Array.isArray(parsed.openAcceptance) ? parsed.openAcceptance.filter(item => typeof item === "string") : [],
      failedChecks: Array.isArray(parsed.failedChecks) ? parsed.failedChecks.filter(item => typeof item === "string") : [],
    };
  } catch {
    return undefined;
  }
}

export async function writeTaskResume(root: string, task: TaskState, reason = "update"): Promise<ResumeState> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  const currentTask = await loadTask(root, task.id) || task;
  const resume = await buildResumeState(root, currentTask, reason);
  await writeFile(path.join(taskDir, "resume.json"), `${JSON.stringify(resume, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "resume.md"), formatTaskResume(currentTask, resume), "utf8");
  return resume;
}

export async function readTaskReadiness(root: string, taskId: string): Promise<ReadinessState | undefined> {
  const readinessPath = path.join(getProjectPaths(root).tasksDir, taskId, "readiness.json");
  if (!(await pathExists(readinessPath))) return undefined;
  try {
    const parsed = JSON.parse(await readFile(readinessPath, "utf8")) as Partial<ReadinessState>;
    if (
      typeof parsed.taskId !== "string" ||
      typeof parsed.updatedAt !== "string" ||
      !isReadinessStatus(parsed.status) ||
      typeof parsed.summary !== "string"
    ) {
      return undefined;
    }
    return {
      taskId: parsed.taskId,
      updatedAt: parsed.updatedAt,
      status: parsed.status,
      generatedFrom: typeof parsed.generatedFrom === "string" ? parsed.generatedFrom : undefined,
      summary: parsed.summary,
      blockers: Array.isArray(parsed.blockers) ? parsed.blockers.filter(item => typeof item === "string") : [],
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings.filter(item => typeof item === "string") : [],
      passes: Array.isArray(parsed.passes) ? parsed.passes.filter(item => typeof item === "string") : [],
      nextActions: Array.isArray(parsed.nextActions) ? parsed.nextActions.filter(item => typeof item === "string") : [],
    };
  } catch {
    return undefined;
  }
}

export async function writeTaskReadiness(root: string, task: TaskState, reason = "update"): Promise<ReadinessState> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  const currentTask = await loadTask(root, task.id) || task;
  const readiness = await buildReadinessState(root, currentTask, reason);
  await writeFile(path.join(taskDir, "readiness.json"), `${JSON.stringify(readiness, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "readiness.md"), formatTaskReadiness(currentTask, readiness), "utf8");
  return readiness;
}

export async function readTaskSnapshot(root: string, taskId: string): Promise<TaskSnapshot | undefined> {
  const snapshotPath = path.join(getProjectPaths(root).tasksDir, taskId, "snapshot.json");
  if (!(await pathExists(snapshotPath))) return undefined;
  try {
    const parsed = JSON.parse(await readFile(snapshotPath, "utf8")) as Partial<TaskSnapshot>;
    if (
      typeof parsed.taskId !== "string" ||
      typeof parsed.updatedAt !== "string" ||
      typeof parsed.title !== "string" ||
      typeof parsed.summary !== "string" ||
      !parsed.task ||
      !parsed.acceptance ||
      !parsed.plan ||
      !parsed.verification ||
      !parsed.verificationStrategy ||
      !parsed.resume ||
      !parsed.readiness
    ) {
      return undefined;
    }
    return parsed as TaskSnapshot;
  } catch {
    return undefined;
  }
}

export async function writeTaskSnapshot(root: string, task: TaskState, reason = "update"): Promise<TaskSnapshot> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  const snapshot = await buildTaskSnapshot(root, task, reason);
  await writeFile(path.join(taskDir, "snapshot.json"), `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "snapshot.md"), formatTaskSnapshot(snapshot), "utf8");
  return snapshot;
}

export async function readProjectOverview(root: string): Promise<ProjectOverview | undefined> {
  const overviewPath = path.join(getProjectPaths(root).workspaceDir, "overview.json");
  if (!(await pathExists(overviewPath))) return undefined;
  try {
    const parsed = JSON.parse(await readFile(overviewPath, "utf8")) as Partial<ProjectOverview>;
    if (typeof parsed.root !== "string" || typeof parsed.updatedAt !== "string" || !parsed.totals || !Array.isArray(parsed.tasks)) {
      return undefined;
    }
    return parsed as ProjectOverview;
  } catch {
    return undefined;
  }
}

export async function writeProjectOverview(root: string): Promise<ProjectOverview> {
  const paths = await ensureProject(root);
  const overview = await buildProjectOverview(root);
  await writeFile(path.join(paths.workspaceDir, "overview.json"), `${JSON.stringify(overview, null, 2)}\n`, "utf8");
  await writeFile(path.join(paths.workspaceDir, "overview.md"), formatProjectOverview(overview), "utf8");
  return overview;
}

export async function readUpstreamSources(root: string): Promise<UpstreamSource[]> {
  const paths = await ensureProject(root);
  const sourcesPath = path.join(paths.upstreamsDir, "sources.json");
  if (!(await pathExists(sourcesPath))) {
    const sources = cloneDefaultUpstreamSources();
    await writeUpstreamSources(root, sources);
    return sources;
  }
  try {
    const parsed = JSON.parse(await readFile(sourcesPath, "utf8")) as { sources?: unknown };
    const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];
    const sources = mergeDefaultUpstreamSources(rawSources.map(normalizeUpstreamSource).filter(isDefined));
    await writeUpstreamSources(root, sources);
    return sources;
  } catch {
    const sources = cloneDefaultUpstreamSources();
    await writeUpstreamSources(root, sources);
    return sources;
  }
}

export async function writeUpstreamSources(root: string, sources: UpstreamSource[]): Promise<void> {
  const paths = await ensureProject(root);
  await writeFile(
    path.join(paths.upstreamsDir, "sources.json"),
    `${JSON.stringify({ updatedAt: new Date().toISOString(), sources }, null, 2)}\n`,
    "utf8",
  );
}

export async function readUpstreamCapabilities(root: string): Promise<UpstreamCapability[]> {
  const paths = await ensureProject(root);
  const capabilitiesPath = path.join(paths.upstreamsDir, "capabilities.json");
  if (!(await pathExists(capabilitiesPath))) {
    const capabilities = cloneDefaultUpstreamCapabilities();
    await writeUpstreamCapabilities(root, capabilities);
    return capabilities;
  }
  try {
    const parsed = JSON.parse(await readFile(capabilitiesPath, "utf8")) as { capabilities?: unknown };
    const rawCapabilities = Array.isArray(parsed.capabilities) ? parsed.capabilities : [];
    const capabilities = mergeDefaultUpstreamCapabilities(rawCapabilities.map(normalizeUpstreamCapability).filter(isDefined));
    await writeUpstreamCapabilities(root, capabilities);
    return capabilities;
  } catch {
    const capabilities = cloneDefaultUpstreamCapabilities();
    await writeUpstreamCapabilities(root, capabilities);
    return capabilities;
  }
}

export async function writeUpstreamCapabilities(root: string, capabilities: UpstreamCapability[]): Promise<void> {
  const paths = await ensureProject(root);
  await writeFile(
    path.join(paths.upstreamsDir, "capabilities.json"),
    `${JSON.stringify({ updatedAt: new Date().toISOString(), capabilities }, null, 2)}\n`,
    "utf8",
  );
}

export async function readUpstreamSyncReport(root: string): Promise<UpstreamSyncReport | undefined> {
  const reportPath = path.join(getProjectPaths(root).upstreamsDir, "sync-report.json");
  if (!(await pathExists(reportPath))) return undefined;
  try {
    const parsed = JSON.parse(await readFile(reportPath, "utf8")) as Partial<UpstreamSyncReport>;
    if (
      typeof parsed.root !== "string" ||
      typeof parsed.updatedAt !== "string" ||
      !parsed.totals ||
      !Array.isArray(parsed.sources) ||
      !Array.isArray(parsed.capabilities)
    ) {
      return undefined;
    }
    return parsed as UpstreamSyncReport;
  } catch {
    return undefined;
  }
}

export async function writeUpstreamSyncReport(root: string, reason = "update"): Promise<UpstreamSyncReport> {
  const paths = await ensureProject(root);
  const [sources, capabilities] = await Promise.all([
    readUpstreamSources(root),
    readUpstreamCapabilities(root),
  ]);
  const report = buildUpstreamSyncReport(root, sources, capabilities, reason);
  await writeFile(path.join(paths.upstreamsDir, "sync-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(paths.upstreamsDir, "sync-report.md"), formatUpstreamSyncReport(report), "utf8");
  return report;
}

export async function updateUpstreamSource(
  root: string,
  sourceId: string,
  reference: string,
  note?: string,
): Promise<UpstreamSourceUpdateResult> {
  const normalizedId = sourceId.trim().toLowerCase();
  const sources = await readUpstreamSources(root);
  const index = sources.findIndex(source => source.id.toLowerCase() === normalizedId);
  if (index < 0) {
    return { status: "missing", report: await writeUpstreamSyncReport(root, "source_missing") };
  }

  const now = new Date().toISOString();
  const source = sources[index];
  const updated: UpstreamSource = {
    ...source,
    status: "tracked",
    reference: reference.trim(),
    referenceUpdatedAt: now,
    lastReviewedAt: now,
    notes: dedupeStrings(note ? [...source.notes, note] : source.notes),
  };
  const nextSources = sources.map(candidate => candidate.id === source.id ? updated : candidate);
  await writeUpstreamSources(root, nextSources);
  return { status: "updated", source: updated, report: await writeUpstreamSyncReport(root, "source_reviewed") };
}

export function formatUpstreamSyncReport(report: UpstreamSyncReport): string {
  return [
    "# Upstream Sync Report",
    "",
    `Root: ${report.root}`,
    `Generated: ${report.updatedAt}`,
    report.generatedFrom ? `Reason: ${report.generatedFrom}` : undefined,
    "",
    "## Summary",
    "",
    `- Sources: ${report.totals.sources}`,
    `- Sources needing review: ${report.totals.needsReview}`,
    `- Capability coverage: ${report.totals.covered} covered, ${report.totals.partial} partial, ${report.totals.missing} missing, ${report.totals.watch} watch`,
    "",
    "## Sources",
    "",
    report.sources.map(formatUpstreamSourceLine).join("\n"),
    "",
    "## Capability Coverage",
    "",
    report.capabilities.map(formatUpstreamCapabilityBlock).join("\n\n"),
    "",
    "## Watch Items",
    "",
    formatResumeList(report.watchItems, "No watch items recorded."),
    "",
    "## Next Actions",
    "",
    formatResumeList(report.nextActions, "No upstream sync actions recorded."),
    "",
    "## Sync Policy",
    "",
    "- Review upstream changes before changing Project Flow behavior.",
    "- Reimplement useful workflow ideas in Project Flow's local state model.",
    "- Keep runtime data under `.project-flow/` and avoid OMP native config paths.",
    "- Run `bun run check`, `bun test`, and `omp plugin doctor` after behavior changes.",
    "",
  ].filter(line => line !== undefined).join("\n");
}

export function formatUpstreamSyncSummary(report: UpstreamSyncReport, max = 8): string {
  return [
    "Upstream sync",
    `root: ${report.root}`,
    `updated: ${report.updatedAt}`,
    `sources: ${report.totals.sources}, needs review: ${report.totals.needsReview}`,
    `coverage: ${report.totals.covered} covered, ${report.totals.partial} partial, ${report.totals.missing} missing, ${report.totals.watch} watch`,
    report.staleSources.length > 0 ? ["stale sources:", ...report.staleSources.slice(0, max).map(item => `- ${item}`)].join("\n") : "stale sources: none",
    report.nextActions.length > 0 ? ["next actions:", ...report.nextActions.slice(0, max).map(item => `- ${item}`)].join("\n") : "next actions: none",
  ].join("\n");
}

export function formatUpstreamTaskPrompt(report: UpstreamSyncReport, note?: string): string {
  return [
    "Continue Project Flow upstream sync review.",
    note ? `User note: ${note}` : undefined,
    "",
    "Goal: review tracked upstream changes, decide which workflow ideas should be adapted, and update this plugin through the existing project loop.",
    "",
    "- Acceptance: upstream sources are reviewed or explicitly marked as still pending.",
    "- Acceptance: missing or partial capabilities are converted into concrete Project Flow implementation tasks or documented as watch items.",
    "- Acceptance: any code changes preserve `.project-flow/` runtime paths and local plugin independence.",
    "- Acceptance: targeted checks pass or verification gaps are documented.",
    "",
    "Current upstream sync report:",
    "",
    formatUpstreamSyncReport(report),
  ].filter(line => line !== undefined).join("\n");
}

export async function createTask(root: string, prompt: string): Promise<TaskState> {
  const paths = await ensureProject(root);
  const previous = await loadActiveTask(root);
  if (previous && previous.status === "active") {
    previous.status = "paused";
    await saveTask(root, previous);
    await appendTaskEvent(root, previous.id, {
      type: "task_paused",
      timestamp: previous.updatedAt,
      data: { reason: "created_new_task" },
    });
  }
  let id = taskIdFromPrompt(prompt);
  let suffix = 2;
  while (await pathExists(path.join(paths.tasksDir, id))) {
    id = `${taskIdFromPrompt(prompt)}-${suffix}`;
    suffix += 1;
  }

  const now = new Date().toISOString();
  const title = prompt.trim().split(/\r?\n/)[0]?.slice(0, 96) || id;
  const task: TaskState = {
    id,
    title,
    status: "active",
    phase: "intake",
    createdAt: now,
    updatedAt: now,
    cwd: root,
    initialPrompt: prompt,
    lastPrompt: prompt,
    counters: { toolCalls: 0, failedToolCalls: 0, turns: 0 },
    checkpoints: DEFAULT_CHECKPOINTS.map(item => ({ ...item })),
  };

  const taskDir = path.join(paths.tasksDir, id);
  await mkdir(taskDir, { recursive: true });
  const prd = extractPrd(task.initialPrompt);
  await writeFile(path.join(taskDir, "task.json"), `${JSON.stringify(task, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "prd.md"), formatPrd(task, prd), "utf8");
  await writeFile(path.join(taskDir, "acceptance.json"), `${JSON.stringify(createAcceptanceState(prd, now), null, 2)}\n`, "utf8");
  const plan = createPlanState(now);
  await writePlan(root, id, plan);
  await writeFile(path.join(taskDir, "verification.json"), `${JSON.stringify({ checks: [], updatedAt: now }, null, 2)}\n`, "utf8");
  await refreshVerificationStrategy(root, id);
  await writeInitialTaskResearch(root, task, prd, now);
  await writeFile(paths.activeTaskPath, `${JSON.stringify({ id, updatedAt: now }, null, 2)}\n`, "utf8");
  await appendTaskEvent(root, id, { type: "task_created", timestamp: now, data: { prompt } });
  await writeTaskHandoff(root, task, "created");
  return task;
}

export async function getOrCreateActiveTask(root: string, prompt: string): Promise<TaskState> {
  const active = await loadActiveTask(root);
  if (active && active.status === "active") {
    active.lastPrompt = prompt;
    active.counters.turns += 1;
    await saveTask(root, active);
    await appendTaskEvent(root, active.id, { type: "user_prompt", timestamp: new Date().toISOString(), data: { prompt } });
    await writeTaskHandoff(root, active, "user_prompt");
    return active;
  }
  return createTask(root, prompt);
}

export async function finishActiveTask(root: string, note?: string, options: { force?: boolean } = {}): Promise<TaskState | undefined> {
  const paths = getProjectPaths(root);
  const task = await loadActiveTask(root);
  if (!task) return undefined;
  const readiness = await writeTaskReadiness(root, task, "finish_check");
  if (readiness.status === "blocked" && !options.force) {
    await appendTaskEvent(root, task.id, {
      type: "task_finish_blocked",
      timestamp: new Date().toISOString(),
      data: { blockers: readiness.blockers, nextActions: readiness.nextActions },
    });
    await writeTaskResume(root, task, "finish_blocked");
    return undefined;
  }
  task.status = "finished";
  task.phase = "finished";
  const verification = await readVerification(root, task.id);
  task.checkpoints = task.checkpoints.map(checkpoint =>
    checkpoint.id === "finish" ? { ...checkpoint, done: true } :
      checkpoint.id === "verify" && verification.checks.length > 0 ? { ...checkpoint, done: true } :
        checkpoint,
  );
  await saveTask(root, task);
  await appendTaskEvent(root, task.id, { type: "task_finished", timestamp: new Date().toISOString(), data: { note } });
  await createSpecProposal(root, task.id, note || "generated on task finish");
  await writeJournal(root, task, "finish", note);
  await writeTaskHandoff(root, task, "finish");
  await writeTaskReadiness(root, task, "finish");
  await rm(paths.activeTaskPath, { force: true });
  return task;
}

export async function pauseActiveTask(root: string, note?: string): Promise<TaskState | undefined> {
  const paths = getProjectPaths(root);
  const task = await loadActiveTask(root);
  if (!task) return undefined;
  task.status = "paused";
  await saveTask(root, task);
  await appendTaskEvent(root, task.id, { type: "task_paused", timestamp: new Date().toISOString(), data: { note } });
  await writeTaskHandoff(root, task, "pause");
  await rm(paths.activeTaskPath, { force: true });
  return task;
}

export async function recordToolEvent(
  root: string,
  kind: "tool_start" | "tool_end",
  data: { toolName: string; toolCallId?: string; args?: unknown; isError?: boolean; resultSummary?: string },
): Promise<void> {
  let task = await loadActiveTask(root);
  if (!task || task.status !== "active") {
    if (kind !== "tool_end" || !shouldInferTaskFromTool(data)) return;
    task = await createTask(root, inferTaskPromptFromTool(data));
    await appendTaskEvent(root, task.id, {
      type: "task_inferred",
      timestamp: new Date().toISOString(),
      data: { reason: "tool_activity", toolName: data.toolName, toolCallId: data.toolCallId },
    });
  }
  if (kind === "tool_end") {
    task.counters.toolCalls += 1;
    if (data.isError) task.counters.failedToolCalls += 1;
    const verification = isVerificationToolCall(data);
    if (shouldInferTaskFromTool(data) || verification) {
      task.phase = verification ? "verifying" : "implementing";
      task.checkpoints = task.checkpoints.map(checkpoint =>
        checkpoint.id === "implement" ? { ...checkpoint, done: true } :
          checkpoint.id === "verify" && verification ? { ...checkpoint, done: true } :
            checkpoint,
      );
    }
    await saveTask(root, task);
    if (verification) {
      await recordVerification(root, task.id, {
        id: data.toolCallId || `${Date.now()}`,
        timestamp: new Date().toISOString(),
        toolName: data.toolName,
        toolCallId: data.toolCallId,
        command: extractCommand(data.args),
        success: !data.isError,
        summary: data.resultSummary,
      });
    }
    await updatePlanFromTool(root, task.id, data.toolName, verification);
  }
  await appendTaskEvent(root, task.id, { type: kind, timestamp: new Date().toISOString(), data });
  if (kind === "tool_end") {
    await writeTaskHandoff(root, task, "tool_end");
  }
}

export async function readVerification(root: string, taskId: string): Promise<VerificationState> {
  const verificationPath = path.join(getProjectPaths(root).tasksDir, taskId, "verification.json");
  const fallback = { checks: [], updatedAt: new Date().toISOString() };
  if (!(await pathExists(verificationPath))) return fallback;
  try {
    const parsed = JSON.parse(await readFile(verificationPath, "utf8")) as Partial<VerificationState>;
    return {
      checks: Array.isArray(parsed.checks) ? parsed.checks as VerificationCheck[] : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return fallback;
  }
}

export async function recordVerification(root: string, taskId: string, check: VerificationCheck): Promise<VerificationState> {
  const paths = getProjectPaths(root);
  const taskDir = path.join(paths.tasksDir, taskId);
  await mkdir(taskDir, { recursive: true });
  const state = await readVerification(root, taskId);
  state.checks.push(check);
  state.updatedAt = check.timestamp;
  await writeFile(path.join(taskDir, "verification.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await appendTaskEvent(root, taskId, { type: "verification_recorded", timestamp: check.timestamp, data: check });
  return state;
}

export async function readVerificationStrategy(root: string, taskId: string): Promise<VerificationStrategy> {
  const strategyPath = path.join(getProjectPaths(root).tasksDir, taskId, "verification-strategy.json");
  if (!(await pathExists(strategyPath))) return refreshVerificationStrategy(root, taskId);
  try {
    const parsed = JSON.parse(await readFile(strategyPath, "utf8")) as Partial<VerificationStrategy>;
    return {
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(isVerificationSuggestion) : [],
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
      sources: Array.isArray(parsed.sources) ? parsed.sources.filter(item => typeof item === "string") : [],
    };
  } catch {
    return refreshVerificationStrategy(root, taskId);
  }
}

export async function refreshVerificationStrategy(root: string, taskId: string): Promise<VerificationStrategy> {
  const strategy = await detectVerificationStrategy(root);
  const taskDir = path.join(getProjectPaths(root).tasksDir, taskId);
  await mkdir(taskDir, { recursive: true });
  await writeFile(path.join(taskDir, "verification-strategy.json"), `${JSON.stringify(strategy, null, 2)}\n`, "utf8");
  await appendTaskEvent(root, taskId, {
    type: "verification_strategy_refreshed",
    timestamp: strategy.updatedAt,
    data: { suggestions: strategy.suggestions.length, sources: strategy.sources },
  });
  return strategy;
}

export async function detectVerificationStrategy(root: string): Promise<VerificationStrategy> {
  const suggestions: VerificationSuggestion[] = [];
  const sources: string[] = [];

  await addPackageJsonSuggestions(root, suggestions, sources);
  await addPythonSuggestions(root, suggestions, sources);
  await addCargoSuggestions(root, suggestions, sources);
  await addGoSuggestions(root, suggestions, sources);
  await addDotnetSuggestions(root, suggestions, sources);
  await addMakeSuggestions(root, suggestions, sources);

  return {
    suggestions: dedupeSuggestions(suggestions).map((suggestion, index) => ({ ...suggestion, id: `V${index + 1}` })),
    updatedAt: new Date().toISOString(),
    sources,
  };
}

export function formatVerificationSuggestions(strategy: VerificationStrategy, max = 8): string {
  if (strategy.suggestions.length === 0) return "No verification commands suggested yet.";
  const lines = strategy.suggestions.slice(0, max).map(item =>
    `- ${item.id}: ${item.command} (${item.confidence}, ${item.reason}; ${item.source})`,
  );
  if (strategy.suggestions.length > max) lines.push(`...and ${strategy.suggestions.length - max} more`);
  return lines.join("\n");
}

export async function readAcceptance(root: string, taskId: string): Promise<AcceptanceState> {
  const acceptancePath = path.join(getProjectPaths(root).tasksDir, taskId, "acceptance.json");
  const fallback = { items: [], updatedAt: new Date().toISOString() };
  if (!(await pathExists(acceptancePath))) {
    const task = await loadTask(root, taskId);
    if (!task) return fallback;
    const state = createAcceptanceState(extractPrd(task.initialPrompt), task.createdAt);
    await writeAcceptance(root, taskId, state);
    return state;
  }
  try {
    const parsed = JSON.parse(await readFile(acceptancePath, "utf8")) as Partial<AcceptanceState>;
    const items = Array.isArray(parsed.items) ? parsed.items.filter(isAcceptanceItem) : [];
    return {
      items,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt,
    };
  } catch {
    return fallback;
  }
}

export async function updateAcceptanceItem(
  root: string,
  taskId: string,
  query: string,
  status: AcceptanceStatus,
  evidence?: string,
): Promise<AcceptanceUpdateResult> {
  const state = await readAcceptance(root, taskId);
  const matches = resolveAcceptanceItems(state.items, query);
  if (matches.length === 0) return { status: "missing", state, matches };
  if (matches.length > 1) return { status: "ambiguous", state, matches };

  const now = new Date().toISOString();
  const item = matches[0];
  const updated = { ...item, status, evidence: evidence || item.evidence, updatedAt: now };
  const nextState = {
    items: state.items.map(candidate => candidate.id === item.id ? updated : candidate),
    updatedAt: now,
  };
  await writeAcceptance(root, taskId, nextState);
  await appendTaskEvent(root, taskId, {
    type: "acceptance_updated",
    timestamp: now,
    data: { id: updated.id, status: updated.status, evidence: updated.evidence },
  });

  const task = await loadTask(root, taskId);
  if (task) await writeTaskHandoff(root, task, "acceptance_updated");
  return { status: "updated", state: nextState, item: updated, matches: [updated] };
}

export async function readPlan(root: string, taskId: string): Promise<PlanState> {
  const planPath = path.join(getProjectPaths(root).tasksDir, taskId, "plan.json");
  if (!(await pathExists(planPath))) {
    const task = await loadTask(root, taskId);
    const state = createPlanState(task?.createdAt || new Date().toISOString());
    await writePlan(root, taskId, state);
    return state;
  }
  try {
    const parsed = JSON.parse(await readFile(planPath, "utf8")) as Partial<PlanState>;
    const steps = Array.isArray(parsed.steps) ? parsed.steps.filter(isPlanStep) : [];
    const state = normalizePlanState({
      steps,
      currentStepId: typeof parsed.currentStepId === "string" ? parsed.currentStepId : undefined,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    });
    return state;
  } catch {
    return createPlanState(new Date().toISOString());
  }
}

export async function setPlanStepStatus(
  root: string,
  taskId: string,
  query: string,
  status: PlanStepStatus,
  evidence?: string,
): Promise<PlanUpdateResult> {
  const state = await readPlan(root, taskId);
  const matches = resolvePlanSteps(state.steps, query);
  if (matches.length === 0) return { status: "missing", state, matches };
  if (matches.length > 1) return { status: "ambiguous", state, matches };

  const now = new Date().toISOString();
  const step = matches[0];
  const nextSteps = state.steps.map(candidate => {
    if (candidate.id === step.id) {
      return { ...candidate, status, evidence: evidence || candidate.evidence, updatedAt: now };
    }
    if (status === "active" && candidate.status === "active") {
      return { ...candidate, status: "pending" as const, updatedAt: now };
    }
    return candidate;
  });

  const nextState = normalizePlanState({
    steps: nextSteps,
    currentStepId: status === "active" ? step.id : state.currentStepId,
    updatedAt: now,
  });
  await writePlan(root, taskId, nextState);
  await appendTaskEvent(root, taskId, {
    type: "plan_step_updated",
    timestamp: now,
    data: { id: step.id, status, evidence },
  });

  const task = await loadTask(root, taskId);
  if (task) await writeTaskHandoff(root, task, "plan_updated");
  const updated = nextState.steps.find(candidate => candidate.id === step.id);
  return { status: "updated", state: nextState, step: updated, matches: updated ? [updated] : [] };
}

export async function advancePlan(root: string, taskId: string, evidence?: string): Promise<PlanUpdateResult> {
  const state = await readPlan(root, taskId);
  const current = state.steps.find(step => step.id === state.currentStepId) ||
    state.steps.find(step => step.status === "active") ||
    state.steps.find(step => step.status === "pending");
  if (!current) return { status: "missing", state, matches: [] };
  return setPlanStepStatus(root, taskId, current.id, "done", evidence);
}

export function formatPlanSummary(plan: PlanState, max = 8): string {
  if (plan.steps.length === 0) return "No plan steps recorded.";
  const lines = plan.steps.slice(0, max).map(step => {
    const marker = step.status === "done" ? "x" : step.status === "blocked" ? "!" : step.status === "active" ? ">" : " ";
    return `- [${marker}] ${step.id}: ${step.text}${step.evidence ? ` (${step.evidence})` : ""}`;
  });
  if (plan.steps.length > max) lines.push(`...and ${plan.steps.length - max} more`);
  return lines.join("\n");
}

export function nextPlanStep(plan: PlanState): PlanStep | undefined {
  return plan.steps.find(step => step.id === plan.currentStepId) ||
    plan.steps.find(step => step.status === "active") ||
    plan.steps.find(step => step.status === "pending");
}

export function formatAcceptanceSummary(acceptance: AcceptanceState, max = 8): string {
  if (acceptance.items.length === 0) return "No acceptance criteria recorded.";
  const lines = acceptance.items.slice(0, max).map(item => {
    const marker = item.status === "done" ? "x" : item.status === "blocked" ? "!" : " ";
    return `- [${marker}] ${item.id}: ${item.text}${item.evidence ? ` (${item.evidence})` : ""}`;
  });
  if (acceptance.items.length > max) lines.push(`...and ${acceptance.items.length - max} more`);
  return lines.join("\n");
}

export async function readTaskHandoff(root: string, taskId: string): Promise<string | undefined> {
  const handoffPath = path.join(getProjectPaths(root).tasksDir, taskId, "handoff.md");
  if (!(await pathExists(handoffPath))) return undefined;
  try {
    return await readFile(handoffPath, "utf8");
  } catch {
    return undefined;
  }
}

export async function writeTaskHandoff(root: string, task: TaskState, reason = "update"): Promise<string> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  const verification = await readVerification(root, task.id);
  const acceptance = await readAcceptance(root, task.id);
  const plan = await readPlan(root, task.id);
  const strategy = await readVerificationStrategy(root, task.id);
  const content = formatTaskHandoff(task, verification, acceptance, plan, strategy, reason);
  await writeFile(path.join(taskDir, "handoff.md"), content, "utf8");
  await writeTaskInfo(root, task, reason);
  await writeTaskResume(root, task, reason);
  await writeTaskReadiness(root, task, reason);
  await writeTaskSnapshot(root, task, reason);
  await writeProjectOverview(root);
  return content;
}

export async function writeTurnJournal(root: string, reason = "turn"): Promise<void> {
  const task = await loadActiveTask(root);
  if (!task) return;
  await writeJournal(root, task, reason);
  await writeTaskHandoff(root, task, reason);
  await writeProjectOverview(root);
}

export async function writeJournal(root: string, task: TaskState, reason: string, note?: string): Promise<void> {
  const paths = await ensureProject(root);
  const date = new Date().toISOString().slice(0, 10);
  const content = [
    `## ${new Date().toISOString()} - ${reason}`,
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Phase: ${task.phase}`,
    `Status: ${task.status}`,
    note ? `Note: ${note}` : undefined,
    "",
  ].filter(Boolean).join("\n");

  await appendFile(path.join(paths.journalsDir, `${date}.md`), content, "utf8");

}

export async function readSpecDocuments(root: string): Promise<SpecDocument[]> {
  const paths = getProjectPaths(root);
  const specs: SpecDocument[] = [];
  const sources: Array<{ source: "project-flow"; dir: string }> = [{ source: "project-flow", dir: paths.specDir }];

  for (const source of sources) {
    if (!(await pathExists(source.dir))) continue;
    for (const filePath of await listMarkdownFiles(source.dir)) {
      const content = await readFile(filePath, "utf8");
      const metadata = parseSpecMetadata(content);
      specs.push({
        source: source.source,
        path: filePath,
        relativePath: path.relative(root, filePath).replaceAll("\\", "/"),
        title: metadata.title || path.basename(filePath, path.extname(filePath)),
        content,
        tags: metadata.tags,
        scope: metadata.scope,
        score: 0,
      });
    }
  }
  return specs;
}

export async function createSpecProposal(root: string, taskId: string, note?: string): Promise<SpecProposal | undefined> {
  const paths = await ensureProject(root);
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const acceptance = await readAcceptance(root, taskId);
  const verification = await readVerification(root, taskId);
  const plan = await readPlan(root, taskId);
  const research = await readTaskResearch(root, taskId);
  const now = new Date().toISOString();
  const id = `S-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${safeSlug(task.title)}`;
  const proposalPath = path.join(paths.specProposalsDir, `${id}.md`);
  const targetPath = path.join(paths.specDir, `${safeSlug(task.title)}.md`);
  const summary = summarizeSpecProposal(task, acceptance, verification, plan, note);
  const content = formatSpecProposal(root, {
    id,
    title: task.title,
    status: "proposed",
    taskId,
    createdAt: now,
    updatedAt: now,
    proposalPath,
    targetPath,
    summary,
    content: "",
  }, acceptance, verification, plan, note, research);
  await writeFile(proposalPath, content, "utf8");
  await appendTaskEvent(root, taskId, {
    type: "spec_proposal_created",
    timestamp: now,
    data: { id, proposalPath: path.relative(root, proposalPath).replaceAll("\\", "/"), targetPath: path.relative(root, targetPath).replaceAll("\\", "/") },
  });
  await writeTaskHandoff(root, task, "spec_proposal");
  return parseSpecProposal(root, proposalPath, content);
}

export async function listSpecProposals(root: string): Promise<SpecProposal[]> {
  const paths = await ensureProject(root);
  const files = await listMarkdownFiles(paths.specProposalsDir);
  const proposals: SpecProposal[] = [];
  for (const file of files) {
    const content = await readFile(file, "utf8").catch(() => "");
    const proposal = parseSpecProposal(root, file, content);
    if (proposal) proposals.push(proposal);
  }
  return proposals.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function resolveSpecProposal(root: string, query: string): Promise<SpecProposalResolution> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return { status: "missing", matches: [] };
  const proposals = await listSpecProposals(root);
  const exact = proposals.find(item => item.id.toLowerCase() === normalized);
  if (exact) return { status: "found", proposal: exact, matches: [exact] };
  const idMatches = proposals.filter(item => item.id.toLowerCase().startsWith(normalized));
  if (idMatches.length === 1) return { status: "found", proposal: idMatches[0], matches: idMatches };
  if (idMatches.length > 1) return { status: "ambiguous", matches: idMatches };
  const titleMatches = proposals.filter(item => item.title.toLowerCase().includes(normalized));
  if (titleMatches.length === 1) return { status: "found", proposal: titleMatches[0], matches: titleMatches };
  if (titleMatches.length > 1) return { status: "ambiguous", matches: titleMatches };
  return { status: "missing", matches: [] };
}

export async function applySpecProposal(root: string, proposalId: string): Promise<SpecProposal | undefined> {
  const resolved = await resolveSpecProposal(root, proposalId);
  if (!resolved.proposal) return undefined;
  const proposal = resolved.proposal;
  const specBody = extractProposedSpecBody(proposal.content);
  await mkdir(path.dirname(proposal.targetPath), { recursive: true });
  await writeFile(proposal.targetPath, specBody, "utf8");
  const updated = updateSpecProposalStatus(proposal.content, "applied", new Date().toISOString());
  await writeFile(proposal.proposalPath, updated, "utf8");
  await appendTaskEvent(root, proposal.taskId, {
    type: "spec_proposal_applied",
    timestamp: new Date().toISOString(),
    data: { id: proposal.id, targetPath: path.relative(root, proposal.targetPath).replaceAll("\\", "/") },
  });
  return parseSpecProposal(root, proposal.proposalPath, updated);
}

export function formatSpecProposalSummary(proposals: SpecProposal[], max = 8): string {
  if (proposals.length === 0) return "No spec proposals recorded.";
  const lines = proposals.slice(0, max).map(item =>
    `- ${item.id} [${item.status}] ${item.title} -> ${path.basename(item.targetPath)}`,
  );
  if (proposals.length > max) lines.push(`...and ${proposals.length - max} more`);
  return lines.join("\n");
}

export async function buildContextBundle(root: string, prompt: string, task?: TaskState): Promise<ContextBundle> {
  const specs = await readSpecDocuments(root);
  const scored = specs
    .map(spec => ({ ...spec, score: scoreSpec(spec, prompt, task) }))
    .filter(spec => spec.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const acceptance = task ? await readAcceptance(root, task.id) : undefined;
  const plan = task ? await readPlan(root, task.id) : undefined;
  const verificationStrategy = task ? await readVerificationStrategy(root, task.id) : undefined;
  const handoff = task ? (await readTaskHandoff(root, task.id)) || await writeTaskHandoff(root, task, "context") : undefined;
  const resume = task ? await writeTaskResume(root, task, "context") : undefined;
  const readiness = task ? await writeTaskReadiness(root, task, "context") : undefined;
  const snapshot = task ? await writeTaskSnapshot(root, task, "context") : undefined;
  const research = snapshot?.research;
  const info = snapshot?.info;
  const upstreamReport = shouldIncludeUpstreamSyncContext(prompt, task) ? await writeUpstreamSyncReport(root, "context") : undefined;
  const content = formatContextBundle(root, scored, task, acceptance, plan, verificationStrategy, handoff, resume, readiness, snapshot, research, info, upstreamReport);
  return { root, task, specs: scored, acceptance, plan, verificationStrategy, handoff, resume, readiness, snapshot, research, info, upstreamReport, content };
}

export function formatContextBundle(
  root: string,
  specs: SpecDocument[],
  task?: TaskState,
  acceptance?: AcceptanceState,
  plan?: PlanState,
  verificationStrategy?: VerificationStrategy,
  handoff?: string,
  resume?: ResumeState,
  readiness?: ReadinessState,
  snapshot?: TaskSnapshot,
  research?: ResearchState,
  info?: string,
  upstreamReport?: UpstreamSyncReport,
): string {
  const lines: string[] = [
    "[PROJECT FLOW ACTIVE]",
    "",
    `Project root: ${root}`,
  ];

  if (task) {
    lines.push(
      "",
      "Active task:",
      `- id: ${task.id}`,
      `- title: ${task.title}`,
      `- phase: ${task.phase}`,
      `- status: ${task.status}`,
      "- checkpoints:",
      ...task.checkpoints.map(checkpoint => `  - [${checkpoint.done ? "x" : " "}] ${checkpoint.id}: ${checkpoint.label}`),
    );
    if (acceptance) {
      lines.push("", "Acceptance:", formatAcceptanceSummary(acceptance, 6));
    }
    if (plan) {
      const next = nextPlanStep(plan);
      lines.push("", "Plan:", formatPlanSummary(plan, 6));
      if (next) lines.push(`Next plan step: ${next.id} - ${next.text}`);
    }
    if (verificationStrategy) {
      lines.push("", "Verification suggestions:", formatVerificationSuggestions(verificationStrategy, 6));
    }
    if (resume) {
      lines.push("", "Resume:", formatResumeContext(resume));
    }
    if (readiness) {
      lines.push("", "Finish readiness:", formatReadinessContext(readiness));
    }
    if (snapshot) {
      lines.push("", "Task snapshot:", formatSnapshotContext(snapshot));
    }
    if (research) {
      lines.push("", "Research info:", formatResearchContext(research, info));
    }
    if (handoff) {
      lines.push("", "Latest handoff:", trimHandoffContent(handoff));
    }
  }

  if (upstreamReport && upstreamReport.nextActions.length > 0) {
    lines.push("", "Upstream sync:", formatUpstreamContext(upstreamReport));
  }

  lines.push(
    "",
    "Workflow guidance:",
    "- Follow a structured project loop: understand specs, plan briefly, implement, verify, then summarize.",
    "- Treat specs below as durable project rules.",
    "- If work changes reusable conventions, propose a spec patch instead of silently rewriting specs.",
    "- When code is changed, run or recommend the smallest relevant verification.",
    "- Do not finish a task while finish readiness is blocked unless the user explicitly asks to force finish.",
  );

  if (specs.length > 0) {
    lines.push("", "Relevant specs:");
    for (const spec of specs) {
      lines.push("", `### ${spec.title}`, `Source: ${spec.relativePath}`, trimSpecContent(spec.content));
    }
  } else {
    lines.push("", "No project specs were found yet.");
  }

  return `${lines.join("\n")}\n`;
}

export function summarizeUnknown(value: unknown, max = 500): string {
  try {
    const text = typeof value === "string" ? value : JSON.stringify(value);
    return text.length > max ? `${text.slice(0, max)}...` : text;
  } catch {
    return String(value);
  }
}

function formatPrd(task: TaskState, prd: ReturnType<typeof extractPrd>): string {
  return [
    `# ${task.title}`,
    "",
    `Task ID: ${task.id}`,
    `Created: ${task.createdAt}`,
    "",
    "## Goal",
    "",
    prd.goal,
    "",
    "## Original Request",
    "",
    task.initialPrompt,
    "",
    "## Constraints",
    "",
    ...prd.constraints.map(item => `- ${item}`),
    "",
    "## Acceptance Criteria",
    "",
    ...prd.acceptanceCriteria.map(item => `- [ ] ${item}`),
    "",
    "## Open Questions",
    "",
    ...prd.openQuestions.map(item => `- ${item}`),
    "",
  ].join("\n");
}

function extractPrd(prompt: string): {
  goal: string;
  constraints: string[];
  acceptanceCriteria: string[];
  openQuestions: string[];
} {
  const lines = prompt.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const firstLine = lines[0] || "Complete the requested project work.";
  const goal = firstLine.replace(/^(帮我|请|please)\s*/i, "").trim() || firstLine;

  const constraints = lines
    .filter(line => /(必须|不要|不能|保持|避免|先|must|should|without|avoid|keep|preserve|before)/i.test(line))
    .map(line => stripListPrefix(line))
    .slice(0, 6);

  const explicitAcceptance = lines
    .filter(line => /(\[ \]|\[x\]|验收|acceptance|criteria)/i.test(line))
    .map(line => stripListPrefix(line).replace(/^\[[ x]\]\s*/i, ""))
    .filter(line => line.length > 0)
    .slice(0, 8);

  const inferredAcceptance = lines
    .filter(line => /(完成|实现|支持|通过|works?|passes?|verify|test)/i.test(line))
    .map(line => stripListPrefix(line).replace(/^\[[ x]\]\s*/i, ""))
    .filter(line => line.length > 0)
    .slice(0, 8);

  const acceptanceCriteria = explicitAcceptance.length > 0 ? explicitAcceptance : inferredAcceptance;

  if (acceptanceCriteria.length === 0) {
    acceptanceCriteria.push(
      "The requested behavior is implemented.",
      "Relevant project specs are respected.",
      "Targeted verification is run or clearly documented.",
    );
  }

  const openQuestions = lines
    .filter(line => /[?？]$/.test(line) || /(\bunknown\b|待确认|不确定|是否|能否)/i.test(line))
    .map(line => stripListPrefix(line))
    .slice(0, 6);

  if (constraints.length === 0) constraints.push("Keep changes scoped to the requested workflow.");
  if (openQuestions.length === 0) openQuestions.push("None captured from the initial request.");

  return { goal, constraints, acceptanceCriteria, openQuestions };
}

function createResearchState(
  taskId: string,
  openQuestions: string[],
  now: string,
  generatedFrom = "created",
): ResearchState {
  return {
    taskId,
    updatedAt: now,
    generatedFrom,
    openQuestions: openQuestions.filter(item => item && item !== "None captured from the initial request."),
    decisions: [],
    items: [],
  };
}

async function writeInitialTaskResearch(
  root: string,
  task: TaskState,
  prd: ReturnType<typeof extractPrd>,
  now: string,
): Promise<ResearchState> {
  const state = createResearchState(task.id, prd.openQuestions, now);
  await writeResearchFiles(root, task, state);
  return state;
}

async function writeResearchFiles(root: string, task: TaskState, state: ResearchState): Promise<void> {
  const researchDir = path.join(getProjectPaths(root).tasksDir, task.id, "research");
  await mkdir(researchDir, { recursive: true });
  await writeFile(path.join(researchDir, "research.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await writeFile(path.join(researchDir, "notes.md"), formatResearchNotes(task, state), "utf8");
}

function formatResearchNotes(task: TaskState, state: ResearchState): string {
  return [
    "# Research Notes",
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Updated: ${state.updatedAt}`,
    state.generatedFrom ? `Reason: ${state.generatedFrom}` : undefined,
    "",
    "## Open Questions",
    "",
    formatResumeList(state.openQuestions, "No open research questions recorded."),
    "",
    "## Decisions",
    "",
    formatResumeList(state.decisions, "No research decisions recorded."),
    "",
    "## Items",
    "",
    state.items.length === 0 ? "No research items recorded yet." : state.items.map(formatResearchItem).join("\n\n"),
    "",
  ].filter(line => line !== undefined).join("\n");
}

export function formatResearchSummary(state: ResearchState, max = 8): string {
  return [
    `research items: ${state.items.length}`,
    `open questions: ${state.openQuestions.length}`,
    `decisions: ${state.decisions.length}`,
    state.items.length > 0 ? ["recent research:", ...state.items.slice(-max).map(item => `- ${item.id}: ${item.summary}`)].join("\n") : "recent research: none",
  ].join("\n");
}

function formatResearchItem(item: ResearchItem): string {
  return [
    `### ${item.id}: ${item.summary}`,
    "",
    `- timestamp: ${item.timestamp}`,
    item.source ? `- source: ${item.source}` : undefined,
    item.details && item.details !== item.summary ? ["", item.details].join("\n") : undefined,
  ].filter(line => line !== undefined).join("\n");
}

function formatTaskInfo(
  task: TaskState,
  acceptance: AcceptanceState,
  plan: PlanState,
  strategy: VerificationStrategy,
  research: ResearchState | undefined,
  reason: string,
): string {
  return [
    "# Task Info",
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Status: ${task.status}`,
    `Phase: ${task.phase}`,
    `Updated: ${new Date().toISOString()}`,
    `Reason: ${reason}`,
    "",
    "## Technical Direction",
    "",
    task.initialPrompt,
    "",
    "## Research",
    "",
    research ? formatResearchSummary(research, 12) : "No research artifact recorded yet.",
    "",
    "## Acceptance",
    "",
    formatAcceptanceSummary(acceptance, 12),
    "",
    "## Implementation Plan",
    "",
    formatPlanSummary(plan, 12),
    "",
    "## Verification Strategy",
    "",
    formatVerificationSuggestions(strategy, 8),
    "",
    "## Open Questions",
    "",
    research && research.openQuestions.length > 0 ? formatResumeList(research.openQuestions, "") : "No open questions recorded.",
    "",
    "## Manual Notes",
    "",
    "Add human technical notes here. Project Flow creates this file once and does not overwrite it on refresh.",
    "",
  ].join("\n");
}

function isResearchItem(value: unknown): value is ResearchItem {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" &&
    typeof record.timestamp === "string" &&
    typeof record.summary === "string" &&
    (record.source === undefined || typeof record.source === "string") &&
    (record.details === undefined || typeof record.details === "string");
}

function createAcceptanceState(prd: ReturnType<typeof extractPrd>, now: string): AcceptanceState {
  return {
    items: prd.acceptanceCriteria.map((text, index) => ({
      id: `A${index + 1}`,
      text,
      status: "open",
      updatedAt: now,
    })),
    updatedAt: now,
  };
}

async function writeAcceptance(root: string, taskId: string, state: AcceptanceState): Promise<void> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, taskId);
  await mkdir(taskDir, { recursive: true });
  await writeFile(path.join(taskDir, "acceptance.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function createPlanState(now: string): PlanState {
  return normalizePlanState({
    steps: [
      { id: "P1", text: "Inspect the relevant code and project specs.", status: "active", updatedAt: now },
      { id: "P2", text: "Implement the smallest coherent change.", status: "pending", updatedAt: now },
      { id: "P3", text: "Run targeted verification and record the result.", status: "pending", updatedAt: now },
      { id: "P4", text: "Summarize outcome and update handoff.", status: "pending", updatedAt: now },
    ],
    currentStepId: "P1",
    updatedAt: now,
  });
}

async function writePlan(root: string, taskId: string, state: PlanState): Promise<void> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, taskId);
  await mkdir(taskDir, { recursive: true });
  await writeFile(path.join(taskDir, "plan.json"), `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "plan.md"), formatPlanMarkdown(state), "utf8");
}

function formatPlanMarkdown(plan: PlanState): string {
  return [
    "# Plan",
    "",
    ...plan.steps.map(step => {
      const marker = step.status === "done" ? "x" : " ";
      const suffix = step.status === "active" ? " (current)" : step.status === "blocked" ? " (blocked)" : "";
      return `- [${marker}] ${step.id}: ${step.text}${suffix}`;
    }),
    "",
  ].join("\n");
}

function normalizePlanState(state: PlanState): PlanState {
  const now = state.updatedAt || new Date().toISOString();
  const steps = state.steps.length > 0 ? state.steps : createPlanState(now).steps;
  let currentStepId = state.currentStepId;
  if (!currentStepId || !steps.some(step => step.id === currentStepId && step.status !== "done")) {
    currentStepId = steps.find(step => step.status === "active")?.id ||
      steps.find(step => step.status === "pending")?.id ||
      steps.find(step => step.status === "blocked")?.id;
  }

  let activated = false;
  const normalizedSteps = steps.map(step => {
    if (currentStepId && step.id === currentStepId && step.status === "pending") {
      activated = true;
      return { ...step, status: "active" as const, updatedAt: now };
    }
    if (step.status === "active") {
      if (!currentStepId || step.id === currentStepId) {
        activated = true;
        currentStepId = step.id;
        return step;
      }
      return { ...step, status: "pending" as const, updatedAt: now };
    }
    return step;
  });

  if (!activated && currentStepId) {
    const index = normalizedSteps.findIndex(step => step.id === currentStepId);
    if (index >= 0 && normalizedSteps[index].status !== "done") {
      normalizedSteps[index] = { ...normalizedSteps[index], status: "active", updatedAt: now };
    }
  }

  return { steps: normalizedSteps, currentStepId, updatedAt: now };
}

function isPlanStep(value: unknown): value is PlanStep {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" &&
    typeof record.text === "string" &&
    (record.status === "pending" || record.status === "active" || record.status === "done" || record.status === "blocked") &&
    typeof record.updatedAt === "string";
}

function resolvePlanSteps(steps: PlanStep[], query: string): PlanStep[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const numbered = normalized.match(/^\d+$/)?.[0];
  if (numbered) {
    const step = steps[Number(numbered) - 1];
    return step ? [step] : [];
  }

  const exact = steps.find(step => step.id.toLowerCase() === normalized);
  if (exact) return [exact];

  const prefix = steps.filter(step => step.id.toLowerCase().startsWith(normalized));
  if (prefix.length > 0) return prefix;

  return steps.filter(step => step.text.toLowerCase().includes(normalized));
}

async function updatePlanFromTool(root: string, taskId: string, toolName: string, verification: boolean): Promise<void> {
  const plan = await readPlan(root, taskId);
  const current = nextPlanStep(plan);
  if (!current) return;

  if (verification) {
    if (current.id === "P1" || current.id === "P2") {
      await setPlanStepStatus(root, taskId, "P1", "done", "verification started");
      await setPlanStepStatus(root, taskId, "P2", "done", "verification started");
    }
    await setPlanStepStatus(root, taskId, "P3", "done", "verification recorded");
    return;
  }

  if (["edit", "write", "bash", "shell_command"].includes(toolName) && current.id === "P1") {
    await setPlanStepStatus(root, taskId, "P1", "done", "tool activity recorded");
  }
}

async function addPackageJsonSuggestions(
  root: string,
  suggestions: VerificationSuggestion[],
  sources: string[],
): Promise<void> {
  const file = path.join(root, "package.json");
  if (!(await pathExists(file))) return;
  sources.push("package.json");
  try {
    const pkg = JSON.parse(await readFile(file, "utf8")) as { scripts?: Record<string, unknown> };
    const scripts = pkg.scripts || {};
    for (const [name, value] of Object.entries(scripts)) {
      if (typeof value !== "string") continue;
      if (/^(test|check|lint|typecheck|build)$/i.test(name) || /(test|check|lint|typecheck|build)/i.test(name)) {
        suggestions.push({
          id: "",
          command: `bun run ${name}`,
          reason: `package.json script "${name}"`,
          confidence: name === "test" || name === "check" ? "high" : "medium",
          source: "package.json",
        });
      }
    }
    if (!suggestions.some(item => item.command === "bun test") && scripts.test) {
      suggestions.push({
        id: "",
        command: "bun test",
        reason: "package.json has a test script",
        confidence: "medium",
        source: "package.json",
      });
    }
  } catch {
    suggestions.push({
      id: "",
      command: "npm test",
      reason: "package.json exists but could not be parsed",
      confidence: "low",
      source: "package.json",
    });
  }
}

async function addPythonSuggestions(
  root: string,
  suggestions: VerificationSuggestion[],
  sources: string[],
): Promise<void> {
  const pyproject = path.join(root, "pyproject.toml");
  const pytestIni = path.join(root, "pytest.ini");
  const setupCfg = path.join(root, "setup.cfg");
  const requirements = path.join(root, "requirements.txt");
  const hasPyproject = await pathExists(pyproject);
  const hasPytest = await pathExists(pytestIni);
  if (!hasPyproject && !hasPytest && !(await pathExists(setupCfg)) && !(await pathExists(requirements))) return;
  if (hasPyproject) sources.push("pyproject.toml");
  if (hasPytest) sources.push("pytest.ini");
  const content = hasPyproject ? await readFile(pyproject, "utf8").catch(() => "") : "";
  if (hasPytest || /pytest|tool\.pytest/i.test(content)) {
    suggestions.push({ id: "", command: "python -m pytest", reason: "pytest configuration detected", confidence: "high", source: hasPytest ? "pytest.ini" : "pyproject.toml" });
  } else {
    suggestions.push({ id: "", command: "python -m unittest", reason: "Python project detected", confidence: "low", source: hasPyproject ? "pyproject.toml" : "requirements.txt" });
  }
  if (/ruff/i.test(content)) {
    suggestions.push({ id: "", command: "python -m ruff check .", reason: "ruff configuration detected", confidence: "medium", source: "pyproject.toml" });
  }
  if (/mypy/i.test(content)) {
    suggestions.push({ id: "", command: "python -m mypy .", reason: "mypy configuration detected", confidence: "medium", source: "pyproject.toml" });
  }
}

async function addCargoSuggestions(root: string, suggestions: VerificationSuggestion[], sources: string[]): Promise<void> {
  if (!(await pathExists(path.join(root, "Cargo.toml")))) return;
  sources.push("Cargo.toml");
  suggestions.push({ id: "", command: "cargo test", reason: "Cargo project detected", confidence: "high", source: "Cargo.toml" });
  suggestions.push({ id: "", command: "cargo check", reason: "Cargo project detected", confidence: "medium", source: "Cargo.toml" });
}

async function addGoSuggestions(root: string, suggestions: VerificationSuggestion[], sources: string[]): Promise<void> {
  if (!(await pathExists(path.join(root, "go.mod")))) return;
  sources.push("go.mod");
  suggestions.push({ id: "", command: "go test ./...", reason: "Go module detected", confidence: "high", source: "go.mod" });
}

async function addDotnetSuggestions(root: string, suggestions: VerificationSuggestion[], sources: string[]): Promise<void> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const dotnetFile = entries.find(entry =>
    entry.isFile() && (entry.name.toLowerCase().endsWith(".sln") || entry.name.toLowerCase().endsWith(".csproj")),
  );
  if (!dotnetFile) return;
  sources.push(dotnetFile.name);
  suggestions.push({ id: "", command: "dotnet test", reason: ".NET solution or project detected", confidence: "high", source: dotnetFile.name });
}

async function addMakeSuggestions(root: string, suggestions: VerificationSuggestion[], sources: string[]): Promise<void> {
  const makefile = path.join(root, "Makefile");
  if (!(await pathExists(makefile))) return;
  sources.push("Makefile");
  const content = await readFile(makefile, "utf8").catch(() => "");
  for (const target of ["test", "check", "lint"]) {
    if (new RegExp(`^${target}:`, "m").test(content)) {
      suggestions.push({ id: "", command: `make ${target}`, reason: `Makefile target "${target}"`, confidence: "medium", source: "Makefile" });
    }
  }
}

function dedupeSuggestions(suggestions: VerificationSuggestion[]): VerificationSuggestion[] {
  const seen = new Set<string>();
  const result: VerificationSuggestion[] = [];
  for (const suggestion of suggestions) {
    const key = suggestion.command.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(suggestion);
  }
  return result;
}

function isVerificationSuggestion(value: unknown): value is VerificationSuggestion {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" &&
    typeof record.command === "string" &&
    typeof record.reason === "string" &&
    (record.confidence === "high" || record.confidence === "medium" || record.confidence === "low") &&
    typeof record.source === "string";
}

function isAcceptanceItem(value: unknown): value is AcceptanceItem {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" &&
    typeof record.text === "string" &&
    (record.status === "open" || record.status === "done" || record.status === "blocked") &&
    typeof record.updatedAt === "string";
}

function resolveAcceptanceItems(items: AcceptanceItem[], query: string): AcceptanceItem[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  const numbered = normalized.match(/^\d+$/)?.[0];
  if (numbered) {
    const item = items[Number(numbered) - 1];
    return item ? [item] : [];
  }

  const exact = items.find(item => item.id.toLowerCase() === normalized);
  if (exact) return [exact];

  const prefix = items.filter(item => item.id.toLowerCase().startsWith(normalized));
  if (prefix.length > 0) return prefix;

  return items.filter(item => item.text.toLowerCase().includes(normalized));
}

function formatTaskHandoff(
  task: TaskState,
  verification: VerificationState,
  acceptance: AcceptanceState,
  plan: PlanState,
  strategy: VerificationStrategy,
  reason: string,
): string {
  const lastCheck = verification.checks.at(-1);
  const openItems = acceptance.items.filter(item => item.status !== "done");
  const nextStep = nextPlanStep(plan);
  return [
    "# Task Handoff",
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Status: ${task.status}`,
    `Phase: ${task.phase}`,
    `Reason: ${reason}`,
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Current State",
    "",
    `- Created: ${task.createdAt}`,
    `- Updated: ${task.updatedAt}`,
    `- Turns: ${task.counters.turns}`,
    `- Tool calls: ${task.counters.toolCalls} (${task.counters.failedToolCalls} failed)`,
    task.lastPrompt ? `- Last prompt: ${summarizeUnknown(task.lastPrompt, 260)}` : undefined,
    "",
    "## Checkpoints",
    "",
    ...task.checkpoints.map(checkpoint => `- [${checkpoint.done ? "x" : " "}] ${checkpoint.id}: ${checkpoint.label}`),
    "",
    "## Plan",
    "",
    formatPlanSummary(plan, 12),
    "",
    "## Acceptance",
    "",
    formatAcceptanceSummary(acceptance, 12),
    "",
    "## Verification",
    "",
    verification.checks.length === 0
      ? "No verification checks recorded yet."
      : `Last check: ${lastCheck?.success ? "pass" : "fail"} ${lastCheck?.command || lastCheck?.toolName}`,
    "",
    "## Verification Suggestions",
    "",
    formatVerificationSuggestions(strategy, 8),
    "",
    "## Next Step",
    "",
    nextStep
      ? `- Continue ${nextStep.id}: ${nextStep.text}`
      : openItems.length > 0
      ? `- Work through ${openItems[0]?.id}: ${openItems[0]?.text}`
      : "- All recorded acceptance criteria are done; finish or document remaining manual review.",
    "- Continue from plan.md and update verification before finishing.",
    "",
  ].filter(line => line !== undefined).join("\n");
}

function trimHandoffContent(content: string, max = 1600): string {
  const trimmed = content.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}\n\n[Handoff truncated by Project Flow]`;
}

function buildUpstreamSyncReport(
  root: string,
  sources: UpstreamSource[],
  capabilities: UpstreamCapability[],
  reason: string,
): UpstreamSyncReport {
  const activeSources = sources.filter(source => source.status !== "ignored");
  const staleSources = activeSources
    .filter(sourceNeedsReview)
    .map(source => `${source.id}: ${source.name}${source.reference ? ` (${source.reference})` : ""}`);
  const missingOrPartial = capabilities
    .filter(capability => capability.localStatus === "missing" || capability.localStatus === "partial")
    .sort(compareCapabilityPriority);
  const watchItems = capabilities
    .filter(capability => capability.localStatus === "watch" || capability.risk === "high")
    .map(capability => `${capability.id}: ${capability.title} [${capability.localStatus}/${capability.risk}]`);
  const nextActions = dedupeStrings([
    ...activeSources.filter(sourceNeedsReview).map(source => `Review ${source.id} upstream changes and run /upstream:review ${source.id} <reference> when done.`),
    ...missingOrPartial.flatMap(capability =>
      capability.nextActions.slice(0, 1).map(action => `Plan ${capability.id}: ${action}`),
    ),
  ]).slice(0, 12);

  return {
    root,
    updatedAt: new Date().toISOString(),
    generatedFrom: reason,
    sources,
    capabilities,
    totals: {
      sources: activeSources.length,
      needsReview: staleSources.length,
      covered: capabilities.filter(capability => capability.localStatus === "covered").length,
      partial: capabilities.filter(capability => capability.localStatus === "partial").length,
      missing: capabilities.filter(capability => capability.localStatus === "missing").length,
      watch: capabilities.filter(capability => capability.localStatus === "watch").length,
    },
    staleSources,
    watchItems,
    nextActions,
  };
}

function sourceNeedsReview(source: UpstreamSource): boolean {
  if (source.status === "ignored") return false;
  if (source.status === "needs-review") return true;
  if (!source.reference || source.reference === "manual-review-required") return true;
  if (!source.lastReviewedAt) return true;
  if (source.referenceUpdatedAt && source.lastReviewedAt && source.referenceUpdatedAt > source.lastReviewedAt) return true;
  return false;
}

function compareCapabilityPriority(a: UpstreamCapability, b: UpstreamCapability): number {
  const riskScore = (risk: UpstreamRisk) => risk === "high" ? 3 : risk === "medium" ? 2 : 1;
  const statusScore = (status: UpstreamCapabilityStatus) => status === "missing" ? 2 : status === "partial" ? 1 : 0;
  return (statusScore(b.localStatus) + riskScore(b.risk)) - (statusScore(a.localStatus) + riskScore(a.risk));
}

function formatUpstreamSourceLine(source: UpstreamSource): string {
  return [
    `- ${source.id} [${source.status}] ${source.name}`,
    source.url ? `url: ${source.url}` : undefined,
    `reference: ${source.reference || "unset"}`,
    `reviewed: ${source.lastReviewedAt || "never"}`,
    source.focus.length > 0 ? `focus: ${source.focus.join(", ")}` : undefined,
  ].filter(Boolean).join(" - ");
}

function formatUpstreamCapabilityBlock(capability: UpstreamCapability): string {
  return [
    `### ${capability.id} - ${capability.title}`,
    "",
    `- Status: ${capability.localStatus}`,
    `- Upstreams: ${capability.upstreams.join(", ") || "none"}`,
    `- Risk: ${capability.risk}`,
    "",
    "Local implementation:",
    "",
    formatResumeList(capability.localImplementation, "No local implementation recorded."),
    "",
    "Next actions:",
    "",
    formatResumeList(capability.nextActions, "No next actions recorded."),
  ].join("\n");
}

function cloneDefaultUpstreamSources(): UpstreamSource[] {
  return DEFAULT_UPSTREAM_SOURCES.map(source => ({
    ...source,
    focus: [...source.focus],
    notes: [...source.notes],
  }));
}

function cloneDefaultUpstreamCapabilities(): UpstreamCapability[] {
  return DEFAULT_UPSTREAM_CAPABILITIES.map(capability => ({
    ...capability,
    upstreams: [...capability.upstreams],
    localImplementation: [...capability.localImplementation],
    nextActions: [...capability.nextActions],
  }));
}

function mergeDefaultUpstreamSources(existing: UpstreamSource[]): UpstreamSource[] {
  const defaults = cloneDefaultUpstreamSources();
  const byId = new Map(existing.map(source => [source.id, source]));
  const defaultIds = new Set(defaults.map(source => source.id));
  const merged = defaults.map(source => {
    const override = byId.get(source.id);
    if (!override) return source;
    return {
      ...source,
      ...override,
      focus: override.focus.length > 0 ? override.focus : source.focus,
      notes: dedupeStrings([...source.notes, ...override.notes]),
    };
  });
  const extras = existing.filter(source => !defaultIds.has(source.id));
  return [...merged, ...extras];
}

function mergeDefaultUpstreamCapabilities(existing: UpstreamCapability[]): UpstreamCapability[] {
  const defaults = cloneDefaultUpstreamCapabilities();
  const byId = new Map(existing.map(capability => [capability.id, capability]));
  const defaultIds = new Set(defaults.map(capability => capability.id));
  const merged = defaults.map(capability => {
    const override = byId.get(capability.id);
    if (!override) return capability;
    return {
      ...capability,
      ...override,
      upstreams: override.upstreams.length > 0 ? override.upstreams : capability.upstreams,
      localImplementation: override.localImplementation.length > 0 ? override.localImplementation : capability.localImplementation,
      nextActions: override.nextActions.length > 0 ? override.nextActions : capability.nextActions,
    };
  });
  const extras = existing.filter(capability => !defaultIds.has(capability.id));
  return [...merged, ...extras];
}

function normalizeUpstreamSource(value: unknown): UpstreamSource | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? safeSlug(record.id) : "";
  const name = typeof record.name === "string" ? record.name.trim() : "";
  if (!id || !name) return undefined;
  return {
    id,
    name,
    status: parseUpstreamSourceStatus(record.status),
    url: typeof record.url === "string" ? record.url.trim() || undefined : undefined,
    reference: typeof record.reference === "string" ? record.reference.trim() || undefined : undefined,
    referenceUpdatedAt: typeof record.referenceUpdatedAt === "string" ? record.referenceUpdatedAt : undefined,
    lastReviewedAt: typeof record.lastReviewedAt === "string" ? record.lastReviewedAt : undefined,
    focus: stringArray(record.focus),
    notes: stringArray(record.notes),
  };
}

function normalizeUpstreamCapability(value: unknown): UpstreamCapability | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const id = typeof record.id === "string" ? safeSlug(record.id) : "";
  const title = typeof record.title === "string" ? record.title.trim() : "";
  if (!id || !title) return undefined;
  return {
    id,
    title,
    upstreams: stringArray(record.upstreams).map(item => safeSlug(item)).filter(Boolean),
    localStatus: parseUpstreamCapabilityStatus(record.localStatus),
    risk: parseUpstreamRisk(record.risk),
    localImplementation: stringArray(record.localImplementation),
    nextActions: stringArray(record.nextActions),
  };
}

function parseUpstreamSourceStatus(value: unknown): UpstreamSourceStatus {
  if (value === "tracked" || value === "needs-review" || value === "ignored") return value;
  return "tracked";
}

function parseUpstreamCapabilityStatus(value: unknown): UpstreamCapabilityStatus {
  if (value === "covered" || value === "partial" || value === "missing" || value === "watch") return value;
  return "watch";
}

function parseUpstreamRisk(value: unknown): UpstreamRisk {
  if (value === "low" || value === "medium" || value === "high") return value;
  return "medium";
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter(item => typeof item === "string").map(item => item.trim()).filter(Boolean);
}

function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

async function buildProjectOverview(root: string): Promise<ProjectOverview> {
  const [tasks, active, proposals] = await Promise.all([
    listTasks(root),
    loadActiveTask(root),
    listSpecProposals(root),
  ]);
  const overviewTasks: ProjectOverviewTask[] = [];
  const nextActions: string[] = [];
  const blockedTasks: string[] = [];

  for (const task of tasks) {
    const [acceptance, verification, readiness, resume] = await Promise.all([
      readAcceptance(root, task.id),
      readVerification(root, task.id),
      writeTaskReadiness(root, task, "overview"),
      writeTaskResume(root, task, "overview"),
    ]);
    const lastCheck = verification.checks.at(-1);
    const overviewTask: ProjectOverviewTask = {
      id: task.id,
      title: task.title,
      status: task.status,
      phase: task.phase,
      updatedAt: task.updatedAt,
      readiness: readiness.status,
      nextAction: resume.nextAction,
      acceptanceDone: acceptance.items.filter(item => item.status === "done").length,
      acceptanceTotal: acceptance.items.length,
      verificationChecks: verification.checks.length,
      latestVerification: lastCheck ? (lastCheck.success ? "pass" : "fail") : undefined,
    };
    overviewTasks.push(overviewTask);
    if (task.status !== "finished" && resume.nextAction) {
      nextActions.push(`${task.id}: ${resume.nextAction}`);
    }
    if (readiness.status === "blocked") {
      blockedTasks.push(`${task.id}: ${readiness.summary}`);
    }
  }

  return {
    root,
    updatedAt: new Date().toISOString(),
    activeTaskId: active?.id,
    totals: {
      tasks: overviewTasks.length,
      active: overviewTasks.filter(task => task.status === "active").length,
      paused: overviewTasks.filter(task => task.status === "paused").length,
      finished: overviewTasks.filter(task => task.status === "finished").length,
      blockedReadiness: overviewTasks.filter(task => task.readiness === "blocked").length,
      warningReadiness: overviewTasks.filter(task => task.readiness === "warning").length,
      readyReadiness: overviewTasks.filter(task => task.readiness === "ready").length,
      proposedSpecs: proposals.filter(proposal => proposal.status === "proposed").length,
    },
    tasks: overviewTasks,
    nextActions: nextActions.slice(0, 12),
    blockedTasks: blockedTasks.slice(0, 12),
    specProposals: proposals.slice(0, 20).map(proposal => ({
      id: proposal.id,
      title: proposal.title,
      status: proposal.status,
      taskId: proposal.taskId,
    })),
  };
}

export function formatProjectOverview(overview: ProjectOverview): string {
  return [
    "# Project Overview",
    "",
    `Root: ${overview.root}`,
    `Generated: ${overview.updatedAt}`,
    `Active task: ${overview.activeTaskId || "none"}`,
    "",
    "## Totals",
    "",
    `- Tasks: ${overview.totals.tasks}`,
    `- Active: ${overview.totals.active}`,
    `- Paused: ${overview.totals.paused}`,
    `- Finished: ${overview.totals.finished}`,
    `- Readiness: ${overview.totals.readyReadiness} ready, ${overview.totals.warningReadiness} warning, ${overview.totals.blockedReadiness} blocked`,
    `- Proposed specs: ${overview.totals.proposedSpecs}`,
    "",
    "## Next Actions",
    "",
    formatResumeList(overview.nextActions, "No open next actions recorded."),
    "",
    "## Blocked Tasks",
    "",
    formatResumeList(overview.blockedTasks, "No blocked tasks recorded."),
    "",
    "## Tasks",
    "",
    overview.tasks.length === 0
      ? "No tasks recorded."
      : overview.tasks.map(task => formatOverviewTaskLine(task)).join("\n"),
    "",
    "## Spec Proposals",
    "",
    overview.specProposals.length === 0
      ? "No spec proposals recorded."
      : overview.specProposals.map(proposal => `- ${proposal.id} [${proposal.status}] ${proposal.title} (${proposal.taskId})`).join("\n"),
    "",
  ].join("\n");
}

export function formatProjectOverviewSummary(overview: ProjectOverview): string {
  return [
    `Project Flow overview`,
    `root: ${overview.root}`,
    `updated: ${overview.updatedAt}`,
    `active task: ${overview.activeTaskId || "none"}`,
    `tasks: ${overview.totals.tasks} (${overview.totals.active} active, ${overview.totals.paused} paused, ${overview.totals.finished} finished)`,
    `readiness: ${overview.totals.readyReadiness} ready, ${overview.totals.warningReadiness} warning, ${overview.totals.blockedReadiness} blocked`,
    `proposed specs: ${overview.totals.proposedSpecs}`,
    overview.nextActions.length > 0 ? ["next actions:", ...overview.nextActions.slice(0, 8).map(item => `- ${item}`)].join("\n") : "next actions: none",
    overview.blockedTasks.length > 0 ? ["blocked tasks:", ...overview.blockedTasks.slice(0, 8).map(item => `- ${item}`)].join("\n") : "blocked tasks: none",
  ].join("\n");
}

function formatOverviewTaskLine(task: ProjectOverviewTask): string {
  const latest = task.latestVerification ? `, latest ${task.latestVerification}` : "";
  return `- ${task.id} [${task.status}/${task.phase}, ${task.readiness}] ${task.title} - acceptance ${task.acceptanceDone}/${task.acceptanceTotal}, checks ${task.verificationChecks}${latest}`;
}

async function buildTaskSnapshot(root: string, task: TaskState, reason: string): Promise<TaskSnapshot> {
  const currentTask = await loadTask(root, task.id) || task;
  const [acceptance, plan, verification, verificationStrategy, events, handoff, research] = await Promise.all([
    readAcceptance(root, currentTask.id),
    readPlan(root, currentTask.id),
    readVerification(root, currentTask.id),
    readVerificationStrategy(root, currentTask.id),
    readTaskEvents(root, currentTask.id),
    readTaskHandoff(root, currentTask.id),
    readTaskResearch(root, currentTask.id),
  ]);
  const resume = await writeTaskResume(root, currentTask, reason);
  const readiness = await writeTaskReadiness(root, currentTask, reason);
  const info = await writeTaskInfo(root, currentTask, reason);
  const recentEvents = events.slice(-20).map(event => ({
    type: event.type,
    timestamp: event.timestamp,
    summary: summarizeTaskEvent(event),
  }));
  return {
    taskId: currentTask.id,
    updatedAt: new Date().toISOString(),
    generatedFrom: reason,
    title: currentTask.title,
    status: currentTask.status,
    phase: currentTask.phase,
    summary: summarizeSnapshot(currentTask, acceptance, plan, verification, readiness),
    task: currentTask,
    acceptance,
    plan,
    verification,
    verificationStrategy,
    resume,
    readiness,
    recentEvents,
    touchedFiles: resume.touchedFiles,
    research,
    info,
    handoff,
  };
}

export function formatTaskSnapshot(snapshot: TaskSnapshot): string {
  return [
    "# Task Snapshot",
    "",
    `Task: ${snapshot.taskId}`,
    `Title: ${snapshot.title}`,
    `Status: ${snapshot.status}`,
    `Phase: ${snapshot.phase}`,
    `Generated: ${snapshot.updatedAt}`,
    snapshot.generatedFrom ? `Reason: ${snapshot.generatedFrom}` : undefined,
    "",
    "## Summary",
    "",
    snapshot.summary,
    "",
    "## Next Action",
    "",
    `- ${snapshot.resume.nextAction}`,
    "",
    "## Finish Readiness",
    "",
    formatReadinessSummary(snapshot.readiness, 6),
    "",
    "## Acceptance",
    "",
    formatAcceptanceSummary(snapshot.acceptance, 12),
    "",
    "## Plan",
    "",
    formatPlanSummary(snapshot.plan, 12),
    "",
    "## Verification",
    "",
    formatSnapshotVerification(snapshot.verification),
    "",
    "## Verification Suggestions",
    "",
    formatVerificationSuggestions(snapshot.verificationStrategy, 8),
    "",
    "## Research",
    "",
    snapshot.research ? formatResearchSummary(snapshot.research, 8) : "No research artifact recorded yet.",
    "",
    "## Task Info",
    "",
    snapshot.info ? trimHandoffContent(snapshot.info, 1600) : "No task info recorded yet.",
    "",
    "## Touched Files",
    "",
    formatResumeList(snapshot.touchedFiles.slice(0, 20), "No touched files inferred yet."),
    "",
    "## Recent Events",
    "",
    snapshot.recentEvents.length === 0
      ? "No recent events recorded."
      : snapshot.recentEvents.map(event => `- ${event.timestamp} ${event.type}: ${event.summary}`).join("\n"),
    "",
    "## Latest Handoff",
    "",
    snapshot.handoff ? trimHandoffContent(snapshot.handoff, 2400) : "No handoff recorded yet.",
    "",
  ].filter(line => line !== undefined).join("\n");
}

export function formatSnapshotSummary(snapshot: TaskSnapshot): string {
  return [
    `${snapshot.taskId}`,
    snapshot.title,
    `status: ${snapshot.status}/${snapshot.phase}`,
    `updated: ${snapshot.updatedAt}`,
    `summary: ${snapshot.summary}`,
    `next action: ${snapshot.resume.nextAction}`,
    `readiness: ${snapshot.readiness.status}`,
    `acceptance: ${snapshot.acceptance.items.filter(item => item.status === "done").length}/${snapshot.acceptance.items.length} done`,
    `verification: ${snapshot.verification.checks.length} check(s)`,
    `touched files: ${snapshot.touchedFiles.length}`,
  ].join("\n");
}

function formatSnapshotContext(snapshot: TaskSnapshot, max = 1200): string {
  const content = [
    `- updated: ${snapshot.updatedAt}`,
    `- summary: ${snapshot.summary}`,
    `- next action: ${snapshot.resume.nextAction}`,
    `- readiness: ${snapshot.readiness.status}`,
    `- touched files: ${snapshot.touchedFiles.slice(0, 8).join(", ") || "none inferred"}`,
  ].join("\n");
  return content.length <= max ? content : `${content.slice(0, max)}\n[Snapshot truncated by Project Flow]`;
}

function summarizeSnapshot(
  task: TaskState,
  acceptance: AcceptanceState,
  plan: PlanState,
  verification: VerificationState,
  readiness: ReadinessState,
): string {
  const doneAcceptance = acceptance.items.filter(item => item.status === "done").length;
  const donePlan = plan.steps.filter(step => step.status === "done").length;
  const lastCheck = verification.checks.at(-1);
  return [
    `${task.id} is ${task.status}/${task.phase}.`,
    `Acceptance ${doneAcceptance}/${acceptance.items.length} done.`,
    `Plan ${donePlan}/${plan.steps.length} done.`,
    lastCheck ? `Latest verification ${lastCheck.success ? "passed" : "failed"}: ${lastCheck.command || lastCheck.toolName}.` : "No verification recorded.",
    `Finish readiness is ${readiness.status}.`,
  ].join(" ");
}

function formatSnapshotVerification(verification: VerificationState): string {
  if (verification.checks.length === 0) return "No verification checks recorded yet.";
  return verification.checks.slice(-10).map(check =>
    `- ${check.success ? "pass" : "fail"} ${check.command || check.toolName} (${check.timestamp})${check.summary ? ` - ${summarizeUnknown(check.summary, 180)}` : ""}`,
  ).join("\n");
}

async function buildReadinessState(root: string, task: TaskState, reason: string): Promise<ReadinessState> {
  const currentTask = await loadTask(root, task.id) || task;
  const [acceptance, verification, plan] = await Promise.all([
    readAcceptance(root, currentTask.id),
    readVerification(root, currentTask.id),
    readPlan(root, currentTask.id),
  ]);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const passes: string[] = [];
  const nextActions: string[] = [];

  const openAcceptance = acceptance.items.filter(item => item.status === "open");
  const blockedAcceptance = acceptance.items.filter(item => item.status === "blocked");
  const doneAcceptance = acceptance.items.filter(item => item.status === "done");
  if (openAcceptance.length > 0) {
    blockers.push(`${openAcceptance.length} acceptance item(s) still open.`);
    nextActions.push(...openAcceptance.slice(0, 4).map(item => `Resolve ${item.id}: ${item.text}`));
  }
  if (blockedAcceptance.length > 0) {
    blockers.push(`${blockedAcceptance.length} acceptance item(s) are blocked.`);
    nextActions.push(...blockedAcceptance.slice(0, 4).map(item => `Unblock ${item.id}: ${item.text}`));
  }
  if (acceptance.items.length > 0 && doneAcceptance.length === acceptance.items.length) {
    passes.push(`Acceptance complete: ${doneAcceptance.length}/${acceptance.items.length}.`);
  } else if (acceptance.items.length === 0) {
    warnings.push("No acceptance criteria were recorded.");
    nextActions.push("Add or confirm acceptance criteria before finishing.");
  }

  const blockedPlan = plan.steps.filter(step => step.status === "blocked");
  const pendingPlan = plan.steps.filter(step => step.status === "active" || step.status === "pending");
  const donePlan = plan.steps.filter(step => step.status === "done");
  if (blockedPlan.length > 0) {
    blockers.push(`${blockedPlan.length} plan step(s) are blocked.`);
    nextActions.push(...blockedPlan.slice(0, 4).map(step => `Unblock ${step.id}: ${step.text}`));
  }
  if (pendingPlan.length > 0) {
    warnings.push(`${pendingPlan.length} plan step(s) are not done.`);
    nextActions.push(...pendingPlan.slice(0, 3).map(step => `Continue ${step.id}: ${step.text}`));
  }
  if (plan.steps.length > 0 && donePlan.length === plan.steps.length) {
    passes.push(`Plan complete: ${donePlan.length}/${plan.steps.length}.`);
  }

  const lastCheck = verification.checks.at(-1);
  const failedChecks = verification.checks.filter(check => !check.success);
  if (verification.checks.length === 0) {
    blockers.push("No verification checks were recorded.");
    nextActions.push("Run or document the smallest relevant verification.");
  } else if (lastCheck && !lastCheck.success) {
    blockers.push(`Latest verification failed: ${lastCheck.command || lastCheck.toolName}.`);
    nextActions.push(`Fix and rerun ${lastCheck.command || lastCheck.toolName}.`);
  } else if (lastCheck) {
    passes.push(`Latest verification passed: ${lastCheck.command || lastCheck.toolName}.`);
  }
  if (failedChecks.length > 0 && lastCheck?.success) {
    warnings.push(`${failedChecks.length} earlier verification check(s) failed; confirm the latest pass covers the fix.`);
  }

  if (currentTask.counters.failedToolCalls > 0) {
    warnings.push(`${currentTask.counters.failedToolCalls} failed tool call(s) were recorded.`);
  }

  const uniqueNextActions = dedupeStrings(nextActions).slice(0, 10);
  const status: ReadinessStatus = blockers.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready";
  return {
    taskId: currentTask.id,
    updatedAt: new Date().toISOString(),
    status,
    generatedFrom: reason,
    summary: summarizeReadiness(status, blockers, warnings, passes),
    blockers: dedupeStrings(blockers),
    warnings: dedupeStrings(warnings),
    passes: dedupeStrings(passes),
    nextActions: uniqueNextActions.length > 0 ? uniqueNextActions : defaultReadinessNextActions(status),
  };
}

export function formatTaskReadiness(task: TaskState, readiness: ReadinessState): string {
  return [
    "# Finish Readiness",
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Status: ${readiness.status}`,
    `Generated: ${readiness.updatedAt}`,
    readiness.generatedFrom ? `Reason: ${readiness.generatedFrom}` : undefined,
    "",
    "## Summary",
    "",
    readiness.summary,
    "",
    "## Blockers",
    "",
    formatResumeList(readiness.blockers, "No blockers recorded."),
    "",
    "## Warnings",
    "",
    formatResumeList(readiness.warnings, "No warnings recorded."),
    "",
    "## Passing Signals",
    "",
    formatResumeList(readiness.passes, "No passing signals recorded yet."),
    "",
    "## Next Actions",
    "",
    formatResumeList(readiness.nextActions, "No next actions recorded."),
    "",
  ].filter(line => line !== undefined).join("\n");
}

export function formatReadinessSummary(readiness: ReadinessState, max = 8): string {
  const lines = [
    `status: ${readiness.status}`,
    `updated: ${readiness.updatedAt}`,
    `summary: ${readiness.summary}`,
  ];
  if (readiness.blockers.length > 0) {
    lines.push("blockers:", ...readiness.blockers.slice(0, max).map(item => `- ${item}`));
  }
  if (readiness.warnings.length > 0) {
    lines.push("warnings:", ...readiness.warnings.slice(0, max).map(item => `- ${item}`));
  }
  if (readiness.nextActions.length > 0) {
    lines.push("next actions:", ...readiness.nextActions.slice(0, max).map(item => `- ${item}`));
  }
  return lines.join("\n");
}

function formatReadinessContext(readiness: ReadinessState, max = 1200): string {
  const lines = [
    `- status: ${readiness.status}`,
    `- summary: ${readiness.summary}`,
    readiness.blockers.length > 0 ? `- blockers: ${readiness.blockers.slice(0, 4).join("; ")}` : "- blockers: none",
    readiness.warnings.length > 0 ? `- warnings: ${readiness.warnings.slice(0, 4).join("; ")}` : "- warnings: none",
    readiness.nextActions.length > 0 ? `- next actions: ${readiness.nextActions.slice(0, 5).join("; ")}` : "- next actions: none",
  ];
  const content = lines.join("\n");
  return content.length <= max ? content : `${content.slice(0, max)}\n[Readiness truncated by Project Flow]`;
}

function formatUpstreamContext(report: UpstreamSyncReport, max = 1200): string {
  const lines = [
    `- updated: ${report.updatedAt}`,
    `- sources needing review: ${report.totals.needsReview}`,
    `- coverage: ${report.totals.covered} covered, ${report.totals.partial} partial, ${report.totals.missing} missing, ${report.totals.watch} watch`,
    report.nextActions.length > 0 ? `- next actions: ${report.nextActions.slice(0, 4).join("; ")}` : "- next actions: none",
  ];
  const content = lines.join("\n");
  return content.length <= max ? content : `${content.slice(0, max)}\n[Upstream sync truncated by Project Flow]`;
}

function shouldIncludeUpstreamSyncContext(prompt: string, task?: TaskState): boolean {
  const text = [prompt, task?.title, task?.initialPrompt, task?.lastPrompt].filter(Boolean).join(" ").toLowerCase();
  return /\b(upstream|sync|ecc|omo|everything claude code|oh my openagent)\b/i.test(text) ||
    /(上游|同步|升级|更新|审查)/.test(text);
}

function summarizeReadiness(status: ReadinessStatus, blockers: string[], warnings: string[], passes: string[]): string {
  if (status === "blocked") return `Blocked by ${blockers.length} required item(s).`;
  if (status === "warning") return `No blockers, but ${warnings.length} warning(s) need review.`;
  return `Ready to finish with ${passes.length} passing signal(s).`;
}

function defaultReadinessNextActions(status: ReadinessStatus): string[] {
  if (status === "ready") return ["Finish the task and capture any durable learnings as a spec proposal."];
  if (status === "warning") return ["Review warnings, then finish or document why they are acceptable."];
  return ["Clear blockers before finishing."];
}

function isReadinessStatus(value: unknown): value is ReadinessStatus {
  return value === "ready" || value === "warning" || value === "blocked";
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    result.push(trimmed);
  }
  return result;
}

async function buildResumeState(root: string, task: TaskState, reason: string): Promise<ResumeState> {
  const currentTask = await loadTask(root, task.id) || task;
  const [events, acceptance, verification, plan] = await Promise.all([
    readTaskEvents(root, currentTask.id),
    readAcceptance(root, currentTask.id),
    readVerification(root, currentTask.id),
    readPlan(root, currentTask.id),
  ]);
  const failedVerificationChecks = verification.checks.filter(check => !check.success);
  return {
    taskId: currentTask.id,
    updatedAt: new Date().toISOString(),
    nextAction: deriveNextAction(currentTask, plan, acceptance, failedVerificationChecks),
    generatedFrom: reason,
    recentEvents: events.slice(-20).map(event => ({
      type: event.type,
      timestamp: event.timestamp,
      summary: summarizeTaskEvent(event),
    })),
    touchedFiles: collectTouchedFiles(root, events),
    openAcceptance: acceptance.items
      .filter(item => item.status !== "done")
      .map(formatAcceptanceItemLine)
      .slice(0, 12),
    failedChecks: failedVerificationChecks.slice(-8).map(formatVerificationCheckLine),
  };
}

export function formatTaskResume(task: TaskState, resume: ResumeState): string {
  return [
    "# Resume Pack",
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Status: ${task.status}`,
    `Phase: ${task.phase}`,
    `Generated: ${resume.updatedAt}`,
    resume.generatedFrom ? `Reason: ${resume.generatedFrom}` : undefined,
    "",
    "## Next Action",
    "",
    `- ${resume.nextAction}`,
    "",
    "## Open Acceptance",
    "",
    formatResumeList(resume.openAcceptance, "No open acceptance criteria recorded."),
    "",
    "## Failed Checks",
    "",
    formatResumeList(resume.failedChecks, "No failed verification checks recorded."),
    "",
    "## Recently Touched Files",
    "",
    formatResumeList(resume.touchedFiles.slice(0, 16), "No touched files inferred yet."),
    "",
    "## Recent Events",
    "",
    resume.recentEvents.length === 0
      ? "No task events recorded yet."
      : resume.recentEvents.map(event => `- ${event.timestamp} ${event.type}: ${event.summary}`).join("\n"),
    "",
  ].filter(line => line !== undefined).join("\n");
}

function deriveNextAction(
  task: TaskState,
  plan: PlanState,
  acceptance: AcceptanceState,
  failedVerificationChecks: VerificationCheck[],
): string {
  const latestFailed = failedVerificationChecks.at(-1);
  if (latestFailed && task.phase === "verifying") {
    return `Resolve failed verification: ${latestFailed.command || latestFailed.toolName}`;
  }

  const nextStep = nextPlanStep(plan);
  if (nextStep) {
    const prefix = nextStep.status === "blocked" ? "Unblock" : "Continue";
    return `${prefix} ${nextStep.id}: ${nextStep.text}`;
  }

  const openAcceptance = acceptance.items.find(item => item.status !== "done");
  if (openAcceptance) {
    return `Work through ${openAcceptance.id}: ${openAcceptance.text}`;
  }

  if (latestFailed) {
    return `Review failed verification: ${latestFailed.command || latestFailed.toolName}`;
  }

  if (task.status === "finished") {
    return "Task is finished; review the journal or apply pending spec proposals if needed.";
  }

  return "All tracked items are complete; finish the task or document remaining manual review.";
}

function summarizeTaskEvent(event: TaskEvent): string {
  const data = eventDataRecord(event);
  if (!data) return "No event details.";

  if (event.type === "task_created" || event.type === "user_prompt") {
    return `prompt: ${summarizeUnknown(data.prompt, 220)}`;
  }

  if (event.type === "tool_start" || event.type === "tool_end") {
    const toolName = typeof data.toolName === "string" ? data.toolName : "tool";
    const command = extractCommand(data.args);
    const status = event.type === "tool_end" ? (data.isError ? "failed" : "completed") : "started";
    const result = typeof data.resultSummary === "string" ? ` => ${summarizeUnknown(data.resultSummary, 180)}` : "";
    return `${toolName} ${status}${command ? `: ${command}` : ""}${result}`;
  }

  if (event.type === "verification_recorded") {
    const command = typeof data.command === "string" ? data.command : typeof data.toolName === "string" ? data.toolName : "verification";
    return `${data.success ? "pass" : "fail"} ${command}`;
  }

  if (event.type === "verification_strategy_refreshed") {
    const sources = Array.isArray(data.sources) ? data.sources.filter(item => typeof item === "string").join(", ") : "project files";
    return `suggestions refreshed from ${sources}`;
  }

  if (event.type === "plan_step_updated") {
    return `${data.id || "step"} -> ${data.status || "updated"}${data.evidence ? ` (${summarizeUnknown(data.evidence, 160)})` : ""}`;
  }

  if (event.type === "acceptance_updated") {
    return `${data.id || "acceptance"} -> ${data.status || "updated"}${data.evidence ? ` (${summarizeUnknown(data.evidence, 160)})` : ""}`;
  }

  return summarizeUnknown(data, 260);
}

function eventDataRecord(event: TaskEvent): Record<string, unknown> | undefined {
  if (!event.data || typeof event.data !== "object") return undefined;
  return event.data as Record<string, unknown>;
}

function collectTouchedFiles(root: string, events: TaskEvent[]): string[] {
  const seen = new Set<string>();
  const files: string[] = [];
  for (const event of [...events].reverse()) {
    for (const candidate of extractFilePaths(event.data)) {
      const normalized = normalizeTouchedPath(root, candidate);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      files.push(normalized);
      if (files.length >= 24) return files;
    }
  }
  return files;
}

function extractFilePaths(value: unknown): string[] {
  if (value === undefined || value === null) return [];
  const text = summarizeUnknown(value, 12000);
  const candidates = new Set<string>();
  const patterns = [
    /[A-Za-z]:[\\/][^\s"'`<>|{}]+/g,
    /(?:\.{1,2}[\\/])?[A-Za-z0-9_.@()+,-]+(?:[\\/][A-Za-z0-9_.@()+,-]+)+/g,
    /[A-Za-z0-9_.@()+,-]+\.(?:astro|bat|c|cmd|cpp|cs|css|go|h|html|java|js|json|jsx|kt|lock|lua|md|mjs|ps1|py|rs|sh|sql|swift|toml|ts|tsx|txt|vue|xml|yaml|yml)/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      if (match[0]) candidates.add(match[0]);
    }
  }
  return [...candidates];
}

function normalizeTouchedPath(root: string, candidate: string): string | undefined {
  let cleaned = candidate
    .replace(/\\n/g, "")
    .replace(/^[([{<"'`]+/, "")
    .replace(/[),.;\]}"'`]+$/, "");
  if (!cleaned || /^(https?|node):/i.test(cleaned) || cleaned.startsWith("@")) return undefined;
  const pathForExt = cleaned.replaceAll("/", path.sep).replaceAll("\\", path.sep);
  const ext = path.extname(pathForExt);
  if (!ext || ext.length > 12) return undefined;

  if (path.isAbsolute(pathForExt)) {
    const relative = path.relative(root, pathForExt);
    if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
      return relative.replaceAll("\\", "/");
    }
    return pathForExt.replaceAll("\\", "/");
  }

  cleaned = cleaned.replaceAll("\\", "/");
  return cleaned.startsWith("./") ? cleaned.slice(2) : cleaned;
}

function formatAcceptanceItemLine(item: AcceptanceItem): string {
  return `${item.id} [${item.status}]: ${item.text}${item.evidence ? ` (${item.evidence})` : ""}`;
}

function formatVerificationCheckLine(check: VerificationCheck): string {
  return `${check.timestamp} ${check.command || check.toolName}${check.summary ? ` - ${summarizeUnknown(check.summary, 180)}` : ""}`;
}

function formatResumeList(items: string[], empty: string): string {
  if (items.length === 0) return empty;
  return items.map(item => `- ${item}`).join("\n");
}

function formatResumeContext(resume: ResumeState, max = 1800): string {
  const lines = [
    `- updated: ${resume.updatedAt}`,
    `- next action: ${resume.nextAction}`,
    resume.openAcceptance.length > 0 ? `- open acceptance: ${resume.openAcceptance.slice(0, 4).join("; ")}` : "- open acceptance: none recorded",
    resume.failedChecks.length > 0 ? `- failed checks: ${resume.failedChecks.slice(-3).join("; ")}` : "- failed checks: none recorded",
    resume.touchedFiles.length > 0 ? `- touched files: ${resume.touchedFiles.slice(0, 8).join(", ")}` : "- touched files: none inferred",
    resume.recentEvents.length > 0
      ? `- recent events: ${resume.recentEvents.slice(-5).map(event => `${event.type} ${event.summary}`).join("; ")}`
      : "- recent events: none recorded",
  ];
  const content = lines.join("\n");
  return content.length <= max ? content : `${content.slice(0, max)}\n[Resume truncated by Project Flow]`;
}

function formatResearchContext(research: ResearchState, info?: string, max = 1400): string {
  const lines = [
    `- updated: ${research.updatedAt}`,
    `- items: ${research.items.length}`,
    research.openQuestions.length > 0 ? `- open questions: ${research.openQuestions.slice(0, 4).join("; ")}` : "- open questions: none recorded",
    research.decisions.length > 0 ? `- decisions: ${research.decisions.slice(0, 4).join("; ")}` : "- decisions: none recorded",
    research.items.length > 0
      ? `- recent items: ${research.items.slice(-4).map(item => `${item.id} ${item.summary}`).join("; ")}`
      : "- recent items: none recorded",
    info ? `- info.md excerpt: ${summarizeUnknown(info.replace(/\s+/g, " "), 360)}` : "- info.md excerpt: none",
  ];
  const content = lines.join("\n");
  return content.length <= max ? content : `${content.slice(0, max)}\n[Research context truncated by Project Flow]`;
}

function isResumeEvent(value: unknown): value is ResumeState["recentEvents"][number] {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.type === "string" &&
    typeof record.timestamp === "string" &&
    typeof record.summary === "string";
}

function summarizeSpecProposal(
  task: TaskState,
  acceptance: AcceptanceState,
  verification: VerificationState,
  plan: PlanState,
  note?: string,
): string {
  const doneAcceptance = acceptance.items.filter(item => item.status === "done").length;
  const passedChecks = verification.checks.filter(check => check.success).length;
  const doneSteps = plan.steps.filter(step => step.status === "done").length;
  return [
    `Task ${task.id} suggests durable project guidance from completed work.`,
    `${doneAcceptance}/${acceptance.items.length} acceptance items are marked done.`,
    `${passedChecks}/${verification.checks.length} verification checks passed.`,
    `${doneSteps}/${plan.steps.length} plan steps are done.`,
    note ? `Note: ${note}` : undefined,
  ].filter(Boolean).join(" ");
}

function formatSpecProposal(
  root: string,
  proposal: SpecProposal,
  acceptance: AcceptanceState,
  verification: VerificationState,
  plan: PlanState,
  note?: string,
  research?: ResearchState,
): string {
  const specTitle = proposal.title.replace(/^#+\s*/, "").trim() || proposal.id;
  const researchPath = research ? path.join(getProjectPaths(root).tasksDir, proposal.taskId, "info.md") : undefined;
  return [
    "---",
    `id: ${proposal.id}`,
    `status: ${proposal.status}`,
    `taskId: ${proposal.taskId}`,
    `target: ${path.relative(root, proposal.targetPath).replaceAll("\\", "/")}`,
    `createdAt: ${proposal.createdAt}`,
    `updatedAt: ${proposal.updatedAt}`,
    "---",
    "",
    `# ${proposal.title}`,
    "",
    "## Summary",
    "",
    proposal.summary,
    "",
    "## Evidence",
    "",
    `- Acceptance: ${acceptance.items.filter(item => item.status === "done").length}/${acceptance.items.length} done`,
    `- Verification: ${verification.checks.filter(check => check.success).length}/${verification.checks.length} passed`,
    `- Plan: ${plan.steps.filter(step => step.status === "done").length}/${plan.steps.length} done`,
    researchPath ? `- Research info: ${path.relative(root, researchPath).replaceAll("\\", "/")}` : undefined,
    research && research.items.length > 0 ? `- Research items: ${research.items.slice(-4).map(item => `${item.id} ${item.summary}`).join("; ")}` : undefined,
    note ? `- Note: ${note}` : undefined,
    "",
    "## Proposed Spec",
    "",
    `# ${specTitle}`,
    "",
    "## Rules",
    "",
    ...acceptance.items.slice(0, 8).map(item => `- ${item.text}${item.evidence ? ` (${item.evidence})` : ""}`),
    acceptance.items.length === 0 ? "- Keep future work aligned with the task outcome." : undefined,
    "",
    "## Verification",
    "",
    verification.checks.length > 0
      ? verification.checks.slice(-5).map(check => `- ${check.success ? "Pass" : "Fail"}: ${check.command || check.toolName}`).join("\n")
      : "- Record targeted verification when applying this spec.",
    "",
  ].filter(line => line !== undefined).join("\n");
}

function parseSpecProposal(root: string, proposalPath: string, content: string): SpecProposal | undefined {
  const metadata = parseProposalMetadata(content);
  const id = metadata.id || path.basename(proposalPath, ".md");
  const taskId = metadata.taskId || "";
  const status = parseProposalStatus(metadata.status);
  const targetPath = metadata.target ? path.resolve(root, metadata.target) : path.join(getProjectPaths(root).specDir, `${safeSlug(id)}.md`);
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || id;
  const summary = content.match(/## Summary\r?\n\r?\n([\s\S]*?)(?:\r?\n## |\s*$)/)?.[1]?.trim() || "";
  return {
    id,
    title,
    status,
    taskId,
    createdAt: metadata.createdAt || "",
    updatedAt: metadata.updatedAt || metadata.createdAt || "",
    proposalPath,
    targetPath,
    summary,
    content,
  };
}

function parseProposalMetadata(content: string): Record<string, string> {
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatter) return {};
  const result: Record<string, string> = {};
  for (const line of frontmatter[1].split(/\r?\n/)) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) result[match[1].trim()] = match[2].trim();
  }
  return result;
}

function parseProposalStatus(value?: string): SpecProposalStatus {
  if (value === "applied" || value === "rejected" || value === "proposed") return value;
  return "proposed";
}

function extractProposedSpecBody(content: string): string {
  const match = content.match(/## Proposed Spec\r?\n\r?\n([\s\S]*)$/);
  return `${(match?.[1] || content).trim()}\n`;
}

function updateSpecProposalStatus(content: string, status: SpecProposalStatus, updatedAt: string): string {
  let next = content.replace(/^status:\s*.+$/m, `status: ${status}`);
  if (/^updatedAt:\s*.+$/m.test(next)) {
    next = next.replace(/^updatedAt:\s*.+$/m, `updatedAt: ${updatedAt}`);
  }
  return next;
}

function stripListPrefix(line: string): string {
  return line.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
}

function isVerificationToolCall(data: { toolName: string; args?: unknown }): boolean {
  const command = extractCommand(data.args);
  if (command && VERIFY_COMMAND_PATTERNS.some(pattern => pattern.test(command))) return true;
  return VERIFY_TOOL_PATTERNS.test(data.toolName) && !!command && /\b(test|check|lint|verify|doctor|typecheck)\b/i.test(command);
}

function extractCommand(args: unknown): string | undefined {
  if (!args) return undefined;
  if (typeof args === "string") return args;
  if (typeof args !== "object") return undefined;
  const record = args as Record<string, unknown>;
  for (const key of ["command", "cmd", "script", "input"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

async function listMarkdownFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".md")) {
      files.push(fullPath);
    }
  }
  return files;
}

function parseSpecMetadata(content: string): { title: string; tags: string[]; scope: string[] } {
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || "";
  const frontmatter = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const tags = frontmatter ? parseInlineList(frontmatter[1], "tags") : [];
  const scope = frontmatter ? parseInlineList(frontmatter[1], "scope") : [];
  return { title, tags, scope };
}

function parseInlineList(frontmatter: string, key: string): string[] {
  const line = frontmatter.match(new RegExp(`^${key}:\\s*(.+)$`, "m"))?.[1]?.trim();
  if (!line) return [];
  if (line.startsWith("[") && line.endsWith("]")) {
    return line.slice(1, -1).split(",").map(item => item.trim().replace(/^["']|["']$/g, "")).filter(Boolean);
  }
  return line.split(",").map(item => item.trim()).filter(Boolean);
}

function scoreSpec(spec: SpecDocument, prompt: string, task?: TaskState): number {
  const query = [prompt, task?.title, task?.initialPrompt, task?.lastPrompt].filter(Boolean).join(" ").toLowerCase();
  const searchable = [spec.title, spec.relativePath, spec.tags.join(" "), spec.scope.join(" ")].join(" ").toLowerCase();
  let score = 1;

  for (const token of extractTokens(query)) {
    if (token.length < 3) continue;
    if (searchable.includes(token)) score += 4;
    if (spec.content.toLowerCase().includes(token)) score += 1;
  }

  if (spec.relativePath.toLowerCase().includes("readme")) score -= 1;
  return score;
}

function extractTokens(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_/-]+/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 80);
}

function trimSpecContent(content: string, max = 2400): string {
  const withoutFrontmatter = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim();
  if (withoutFrontmatter.length <= max) return withoutFrontmatter;
  return `${withoutFrontmatter.slice(0, max)}\n\n[Spec truncated by Project Flow]`;
}
