import { mkdir, readFile, readdir, realpath, rm, stat, writeFile, appendFile } from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export type TaskStatus = "active" | "paused" | "finished";
export type TaskPhase = "intake" | "planning" | "implementing" | "verifying" | "finished";
export type ActiveTaskScopeKind = "project" | "session";

export interface ActiveTaskScope {
  kind: ActiveTaskScopeKind;
  id?: string;
}

export interface ActiveTaskScopeRecord {
  taskId: string;
  updatedAt: string;
}

export interface ActiveTaskScopesState {
  updatedAt: string;
  scopes: Record<string, ActiveTaskScopeRecord>;
}

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
  activeTaskScopesPath: string;
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
  metadata?: TaskMetadata;
}

export type TaskKind = "feature" | "bugfix" | "research" | "upstream-sync" | "maintenance" | "verification" | "other";
export type TaskSource = "user" | "tool_activity" | "upstream_sync" | "manual" | "system";
export type TaskPriority = "low" | "normal" | "high" | "urgent";
export type TaskRisk = "low" | "medium" | "high";

export interface TaskRelationships {
  parentTaskId?: string;
  childTaskIds: string[];
  relatedTaskIds: string[];
}

export interface TaskOrigin {
  prompt?: string;
  command?: string;
  toolName?: string;
  toolCallId?: string;
  note?: string;
}

export interface TaskMetadata {
  schemaVersion: 1;
  kind: TaskKind;
  source: TaskSource;
  priority: TaskPriority;
  risk: TaskRisk;
  labels: string[];
  assignee?: string;
  branch?: string;
  prUrl?: string;
  relationships: TaskRelationships;
  origin: TaskOrigin;
  relatedSpecs: string[];
  custom: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
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
  clarification?: ClarificationState;
  acceptance?: AcceptanceState;
  plan?: PlanState;
  verificationStrategy?: VerificationStrategy;
  handoff?: string;
  remediation?: VerificationRemediationPlan;
  resume?: ResumeState;
  readiness?: ReadinessState;
  snapshot?: TaskSnapshot;
  prdReview?: PrdReviewState;
  subtasks?: string;
  subtaskPlan?: SubtaskPlan;
  research?: ResearchState;
  roles?: RoleOrchestrationPlan;
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
  verificationCoverageGaps: string[];
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
  remediation?: VerificationRemediationPlan;
  resume: ResumeState;
  readiness: ReadinessState;
  recentEvents: ResumeState["recentEvents"];
  touchedFiles: string[];
  clarification?: ClarificationState;
  subtasks?: string;
  subtaskPlan?: SubtaskPlan;
  research?: ResearchState;
  prdReview?: PrdReviewState;
  roles?: RoleOrchestrationPlan;
  info?: string;
  handoff?: string;
}

export type ResearchSourceKind = "doc" | "code" | "upstream" | "user" | "command" | "web";
export type ResearchConfidence = "low" | "medium" | "high";
export type ResearchReviewStatus = "draft" | "reviewed";
export type ResearchQuestionStatus = "open" | "answered" | "blocked";
export type ResearchPriority = "low" | "normal" | "high";
export type ResearchFindingStatus = "active" | "conflicting" | "superseded";
export type ResearchRiskStatus = "open" | "mitigated" | "accepted";

export interface ResearchItem {
  id: string;
  timestamp: string;
  source?: string;
  summary: string;
  details?: string;
}

export interface ResearchQuestion {
  id: string;
  text: string;
  status: ResearchQuestionStatus;
  priority: ResearchPriority;
  sourcePackIds: string[];
  answer?: string;
  blockedReason?: string;
  createdAt: string;
  updatedAt: string;
  answeredAt?: string;
}

export interface ResearchFinding {
  id: string;
  claim: string;
  status: ResearchFindingStatus;
  confidence: ResearchConfidence;
  questionId?: string;
  sourcePackIds: string[];
  risks: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ResearchDecision {
  id: string;
  decision: string;
  rationale: string;
  sourcePackIds: string[];
  alternatives: string[];
  acceptedAt: string;
}

export interface ResearchRisk {
  id: string;
  text: string;
  status: ResearchRiskStatus;
  sourcePackIds: string[];
  createdAt: string;
  resolvedAt?: string;
}

export interface ResearchSourcePack {
  id: string;
  kind: ResearchSourceKind;
  source: string;
  createdAt: string;
  reviewedAt?: string;
  reviewStatus: ResearchReviewStatus;
  claim: string;
  excerpt: string;
  confidence: ResearchConfidence;
  openRisks: string[];
  relatedItemIds: string[];
  questionIds: string[];
  extractedFrom?: string;
  lineRange?: string;
  staleAfter?: string;
}

export interface ResearchSourceInput {
  kind?: ResearchSourceKind;
  source: string;
  claim: string;
  excerpt?: string;
  confidence?: ResearchConfidence;
  reviewStatus?: ResearchReviewStatus;
  openRisks?: string[];
  relatedItemIds?: string[];
  questionIds?: string[];
  extractedFrom?: string;
  lineRange?: string;
  staleAfter?: string;
}

export interface ResearchSourceExtractionInput {
  source: string;
  claim: string;
  confidence?: ResearchConfidence;
  reviewStatus?: ResearchReviewStatus;
  questionIds?: string[];
  openRisks?: string[];
  staleAfter?: string;
}

export interface ResearchState {
  taskId: string;
  updatedAt: string;
  generatedFrom?: string;
  openQuestions: string[];
  decisions: string[];
  findings: string[];
  openRisks: string[];
  items: ResearchItem[];
  sourcePacks: ResearchSourcePack[];
  questions: ResearchQuestion[];
  findingRecords: ResearchFinding[];
  decisionRecords: ResearchDecision[];
  riskRecords: ResearchRisk[];
}

export type ClarificationStatus = "not_required" | "collecting" | "ready" | "skipped";
export type ClarificationQuestionStatus = "queued" | "asking" | "answered" | "skipped";
export type ClarificationMode = "questions" | "refine";
export type ClarificationAxis =
  | "goal"
  | "scope"
  | "users"
  | "acceptance"
  | "constraints"
  | "non_goals"
  | "verification"
  | "risk";

export interface ClarifiedPrdDraft {
  goal?: string;
  scope: string[];
  users: string[];
  nonGoals: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  verification: string[];
  risks: string[];
  openQuestions: string[];
}

export interface ClarificationQuestion {
  id: string;
  axis: ClarificationAxis;
  text: string;
  status: ClarificationQuestionStatus;
  answer?: string;
  askedAt?: string;
  answeredAt?: string;
  rationale?: string;
}

export interface ClarificationState {
  taskId: string;
  enabled: boolean;
  required: boolean;
  status: ClarificationStatus;
  mode: ClarificationMode;
  requiredAxes: ClarificationAxis[];
  updatedAt: string;
  generatedFrom?: string;
  currentQuestionId?: string;
  maxQuestions: number;
  questions: ClarificationQuestion[];
  draft: ClarifiedPrdDraft;
  summary?: string;
}

export interface ClarificationUpdateResult {
  status: "updated" | "missing" | "blocked";
  task?: TaskState;
  state?: ClarificationState;
  openQuestions: ClarificationQuestion[];
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
  metadata?: {
    kind: TaskKind;
    source: TaskSource;
    priority: TaskPriority;
    risk: TaskRisk;
    labels: string[];
    parentTaskId?: string;
    childTaskIds: string[];
  };
}

export interface SubtaskTreeNode {
  task: TaskState;
  children: SubtaskTreeNode[];
  depth: number;
  truncatedChildCount?: number;
}

export interface SubtaskTreeRollup {
  byStatus: Record<TaskStatus, number>;
  byPhase: Record<TaskPhase, number>;
  byDepth: Record<string, number>;
  leafTasks: number;
  maxDepth: number;
  truncatedTasks: number;
  blockedTasks: number;
}

export interface SubtaskTree {
  root: SubtaskTreeNode;
  totalTasks: number;
  openTasks: number;
  finishedTasks: number;
  blockedTasks: string[];
  rollup: SubtaskTreeRollup;
}

export type AutoSubtaskMode = "off" | "suggest" | "auto";
export type SubtaskPlanItemStatus = "suggested" | "created" | "skipped";
export type SubtaskPlanTemplate = "auto" | "acceptance" | "workflow" | "roles" | "verification";
export type SubtaskComplexityLevel = "simple" | "moderate" | "complex";

export interface SubtaskComplexity {
  level: SubtaskComplexityLevel;
  score: number;
  reasons: string[];
}

export interface SubtaskPlanItem {
  id: string;
  title: string;
  prompt: string;
  reason: string;
  status: SubtaskPlanItemStatus;
  order: number;
  depth: number;
  template: SubtaskPlanTemplate;
  dependsOn: string[];
  parentItemId?: string;
  childTaskId?: string;
  createdAt?: string;
}

export interface SubtaskPlan {
  taskId: string;
  mode: AutoSubtaskMode;
  template: SubtaskPlanTemplate;
  maxDepth: number;
  generatedAt: string;
  updatedAt: string;
  generatedFrom?: string;
  summary: string;
  complexity: SubtaskComplexity;
  items: SubtaskPlanItem[];
}

export interface SubtaskPlanApplyResult {
  status: "applied" | "empty" | "missing";
  task?: TaskState;
  plan?: SubtaskPlan;
  created: TaskState[];
}

export type TaskRoleId = "research" | "implement" | "check";
export type TaskRoleStatus = "pending" | "in_progress" | "done" | "blocked";

export interface RoleOrchestrationRole {
  id: TaskRoleId;
  title: string;
  status: TaskRoleStatus;
  owner: string;
  prompt: string;
  inputs: string[];
  ownedArtifacts: string[];
  expectedOutputs: string[];
  checks: string[];
  updatedAt: string;
  note?: string;
}

export interface RoleOrchestrationPlan {
  taskId: string;
  generatedAt: string;
  updatedAt: string;
  generatedFrom?: string;
  summary: string;
  roles: RoleOrchestrationRole[];
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

export type VerificationPolicyCategory = "source" | "test" | "docs" | "config" | "package" | "workflow" | "other";
export type VerificationPolicyStatus = "covered" | "missing" | "manual";

export interface VerificationPolicyMatrixItem {
  id: string;
  category: VerificationPolicyCategory;
  required: boolean;
  command?: string;
  reason: string;
  source: string;
  touchedFiles: string[];
  satisfiedBy: string[];
  status: VerificationPolicyStatus;
}

export interface VerificationPolicy {
  updatedAt: string;
  summary: string;
  touchedFiles: string[];
  matrix: VerificationPolicyMatrixItem[];
  coverageGaps: string[];
}

export interface VerificationStrategy {
  suggestions: VerificationSuggestion[];
  updatedAt: string;
  sources: string[];
  policy: VerificationPolicy;
}

export type VerificationRemediationStatus = "not_required" | "planned" | "active" | "resolved" | "stopped";
export type VerificationRemediationAttemptStatus = "in_progress" | "passed" | "failed" | "stopped";
export type VerificationFailureCategory = "build" | "typecheck" | "lint" | "test" | "command_unavailable" | "timeout" | "environment" | "external_blocker" | "flaky" | "coverage_gap" | "unknown";
export type VerificationFailureConfidence = "high" | "medium" | "low";
export type VerificationRemediationNextActionKind = "inspect" | "fix" | "rerun" | "record" | "ask_user" | "stop";
export type VerificationRemediationNextActionStatus = "open" | "done" | "blocked";

export interface VerificationFailureClassification {
  category: VerificationFailureCategory;
  confidence: VerificationFailureConfidence;
  evidence: string;
  signals: string[];
  impactedFiles: string[];
  suspectedCause: string;
  nextAction: string;
  retryable: boolean;
  source: string;
  requiresOptInCommand?: string;
  stopReason?: string;
}

export interface VerificationRemediationFailedCheck {
  id: string;
  timestamp: string;
  command?: string;
  toolName: string;
  summary?: string;
  classification?: VerificationFailureClassification;
}

export interface VerificationRemediationNextAction {
  id: string;
  kind: VerificationRemediationNextActionKind;
  text: string;
  status: VerificationRemediationNextActionStatus;
  createdAt: string;
  source: string;
  checkId?: string;
  command?: string;
  requiresConfirmation?: boolean;
}

export interface VerificationRemediationAttempt {
  id: string;
  status: VerificationRemediationAttemptStatus;
  startedAt: string;
  updatedAt: string;
  failedCheckIds: string[];
  commands: string[];
  note?: string;
  evidence?: string;
}

export interface VerificationRemediationPlan {
  taskId: string;
  status: VerificationRemediationStatus;
  generatedAt: string;
  updatedAt: string;
  generatedFrom?: string;
  maxAttempts: number;
  summary: string;
  failedChecks: VerificationRemediationFailedCheck[];
  nextActions: string[];
  nextActionRecords: VerificationRemediationNextAction[];
  stopConditions: string[];
  attempts: VerificationRemediationAttempt[];
}

export interface VerificationRemediationAttemptResult {
  status: "started" | "updated" | "missing" | "not_required" | "limit_reached" | "no_active_attempt";
  plan?: VerificationRemediationPlan;
  attempt?: VerificationRemediationAttempt;
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

export type PrdWorkflowStage = "draft" | "needs-clarification" | "ready-to-plan" | "plan-review" | "ready-to-implement" | "implementing";
export type PrdReviewSeverity = "blocker" | "warning" | "pass";
export type PrdReviewCategory = "prd" | "acceptance" | "plan" | "verification" | "research" | "decision" | "promotion";

export interface PrdReviewIssue {
  id: string;
  severity: Exclude<PrdReviewSeverity, "pass">;
  category: PrdReviewCategory;
  message: string;
  nextAction: string;
  relatedIds: string[];
}

export interface PrdSnapshot {
  goal: string;
  scope: string[];
  users: string[];
  nonGoals: string[];
  constraints: string[];
  acceptanceCriteria: string[];
  verification: string[];
  risks: string[];
  dependencies: string[];
  openQuestions: string[];
}

export interface PrdDecisionEntry {
  id: string;
  decision: string;
  rationale: string;
  alternatives: string[];
  sourcePackIds: string[];
  createdAt: string;
}

export interface AcceptancePlanCoverage {
  acceptanceId: string;
  acceptanceText: string;
  planStepIds: string[];
  status: "covered" | "generic" | "missing";
}

export interface PrdReviewState {
  taskId: string;
  updatedAt: string;
  generatedFrom?: string;
  stage: PrdWorkflowStage;
  prd: PrdSnapshot;
  decisions: PrdDecisionEntry[];
  completeness: {
    blockers: PrdReviewIssue[];
    warnings: PrdReviewIssue[];
    passes: string[];
  };
  planReview: {
    coverage: AcceptancePlanCoverage[];
    blockers: PrdReviewIssue[];
    warnings: PrdReviewIssue[];
    passes: string[];
  };
  promotion: {
    ready: boolean;
    blockers: PrdReviewIssue[];
    warnings: PrdReviewIssue[];
    nextActions: string[];
    promotedAt?: string;
  };
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

export interface CreateTaskOptions {
  kind?: TaskKind;
  source?: TaskSource;
  priority?: TaskPriority;
  risk?: TaskRisk;
  labels?: string[];
  origin?: TaskOrigin;
  relationships?: Partial<TaskRelationships>;
  relatedSpecs?: string[];
  custom?: Record<string, unknown>;
  activate?: boolean;
  subtaskMode?: AutoSubtaskMode;
  activeScope?: ActiveTaskScope;
}

export const DEFAULT_AUTO_SUBTASK_MODE: AutoSubtaskMode = "suggest";

const PROJECT_FLOW_PLUGIN_SETTING_KEYS = ["omp-project-flow", "project-flow", "Project Flow"];

export interface ProjectFlowSettings {
  autoSubtaskMode: AutoSubtaskMode;
  source: "default" | "project-override";
}

export async function readProjectFlowSettings(root: string): Promise<ProjectFlowSettings> {
  const fromOverride = await readProjectOverrideAutoSubtaskMode(root);
  if (fromOverride) return { autoSubtaskMode: fromOverride, source: "project-override" };
  return { autoSubtaskMode: DEFAULT_AUTO_SUBTASK_MODE, source: "default" };
}

export async function readProjectAutoSubtaskMode(root: string): Promise<AutoSubtaskMode> {
  return (await readProjectFlowSettings(root)).autoSubtaskMode;
}

function normalizeAutoSubtaskMode(value: unknown): AutoSubtaskMode | undefined {
  return isAutoSubtaskMode(value) ? value : undefined;
}

async function readProjectOverrideAutoSubtaskMode(root: string): Promise<AutoSubtaskMode | undefined> {
  for (const file of [path.join(root, ".omp", "plugin-overrides.json"), path.join(root, ".pi", "plugin-overrides.json")]) {
    if (!(await pathExists(file))) continue;
    try {
      const value = JSON.parse(await readFile(file, "utf8")) as { settings?: Record<string, Record<string, unknown>> };
      for (const key of PROJECT_FLOW_PLUGIN_SETTING_KEYS) {
        const mode = normalizeAutoSubtaskMode(value.settings?.[key]?.autoSubtaskMode);
        if (mode) return mode;
      }
    } catch {
      continue;
    }
  }
  return undefined;
}

const DEFAULT_CHECKPOINTS: Checkpoint[] = [
  { id: "intake", label: "Capture PRD and acceptance criteria", done: true },
  { id: "plan", label: "Build or refine implementation plan", done: false },
  { id: "implement", label: "Apply code changes", done: false },
  { id: "verify", label: "Run relevant checks", done: false },
  { id: "finish", label: "Write journal and archive task", done: false },
];

const DEFAULT_CLARIFICATION_MAX_QUESTIONS = 5;
const DEFAULT_PRD_REFINEMENT_MAX_QUESTIONS = 8;

const DEFAULT_CLARIFICATION_QUESTIONS: Array<{ axis: ClarificationAxis; text: string }> = [
  { axis: "goal", text: "What is the smallest acceptable outcome for this task?" },
  { axis: "scope", text: "Which parts are in scope for this round?" },
  { axis: "non_goals", text: "What should stay out of scope?" },
  { axis: "constraints", text: "Are there compatibility, style, or workflow constraints to preserve?" },
  { axis: "verification", text: "How should the result be verified before the task is considered ready?" },
];

const DEFAULT_PRD_REFINEMENT_AXES: ClarificationAxis[] = [
  "goal",
  "scope",
  "users",
  "acceptance",
  "constraints",
  "non_goals",
  "verification",
  "risk",
];

const PRD_REFINEMENT_QUESTIONS: Record<ClarificationAxis, string> = {
  goal: "What exact outcome should the finished task deliver?",
  scope: "Which files, commands, or workflow surfaces are in scope?",
  users: "Who uses this behavior, and what interaction should they see?",
  acceptance: "What observable acceptance checks prove the PRD is complete?",
  constraints: "What compatibility, safety, or runtime constraints must be preserved?",
  non_goals: "What should this PRD explicitly exclude?",
  verification: "Which command, test, or scenario should verify the result?",
  risk: "What failure mode or risky edge case should the plan guard against?",
};

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
    localStatus: "partial",
    risk: "medium",
    localImplementation: [
      "Project Flow stores parentTaskId and childTaskIds in Task Metadata v1.",
      "Project Flow can create child tasks and summarize child readiness in task readiness, snapshots, context, and overview.",
    ],
    nextActions: [
      "Add richer split templates and multi-child planning flows.",
      "Add deeper child task rollups for large task trees.",
    ],
  },
  {
    id: "task-metadata",
    title: "Stable task metadata for planning and orchestration",
    upstreams: ["omo", "ecc"],
    localStatus: "covered",
    risk: "low",
    localImplementation: [
      "Project Flow stores Task Metadata v1 inside task.json.",
      "Metadata tracks kind, source, priority, risk, labels, origin, relationships, related specs, and custom values.",
      "Metadata summaries appear in task status, hidden context, handoff, task info, snapshots, and project overview.",
    ],
    nextActions: [
      "Use metadata as the base for future session active task, subtask tree, sub-agent, and self-fix policy work.",
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
    activeTaskScopesPath: path.join(workflowDir, "active-task-scopes.json"),
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

export async function loadActiveTask(root: string, scope?: ActiveTaskScope, options: { fallbackToProject?: boolean } = {}): Promise<TaskState | undefined> {
  const scoped = normalizeActiveTaskScope(scope);
  if (scoped.kind === "session") {
    const scopedTask = await loadScopedActiveTask(root, scoped);
    if (scopedTask) return scopedTask;
    return options.fallbackToProject ? loadProjectActiveTask(root) : undefined;
  }
  return loadProjectActiveTask(root);
}

async function loadProjectActiveTask(root: string): Promise<TaskState | undefined> {
  const paths = getProjectPaths(root);
  if (await pathExists(paths.activeTaskPath)) {
    try {
      const active = JSON.parse(await readFile(paths.activeTaskPath, "utf8")) as { id?: string };
      if (active.id) {
        const task = await loadTask(root, active.id);
        if (task?.status === "active") return task;
      }
    } catch {
      return undefined;
    }
  }
  const scopes = await readActiveTaskScopes(root);
  const project = scopes.scopes.project;
  if (!project?.taskId) return undefined;
  const task = await loadTask(root, project.taskId);
  return task?.status === "active" ? task : undefined;
}

async function loadScopedActiveTask(root: string, scope: ActiveTaskScope): Promise<TaskState | undefined> {
  const key = activeTaskScopeKey(scope);
  if (key === "project") return loadProjectActiveTask(root);
  const state = await readActiveTaskScopes(root);
  const record = state.scopes[key];
  if (!record?.taskId) return undefined;
  const task = await loadTask(root, record.taskId);
  return task?.status === "active" ? task : undefined;
}

export async function readActiveTaskScopes(root: string): Promise<ActiveTaskScopesState> {
  const paths = getProjectPaths(root);
  const fallback = { updatedAt: new Date().toISOString(), scopes: {} };
  if (!(await pathExists(paths.activeTaskScopesPath))) return fallback;
  try {
    const parsed = JSON.parse(await readFile(paths.activeTaskScopesPath, "utf8")) as Partial<ActiveTaskScopesState>;
    const scopes: Record<string, ActiveTaskScopeRecord> = {};
    if (parsed.scopes && typeof parsed.scopes === "object") {
      for (const [key, value] of Object.entries(parsed.scopes)) {
        if (!value || typeof value !== "object") continue;
        const record = value as Partial<ActiveTaskScopeRecord>;
        if (typeof record.taskId === "string" && typeof record.updatedAt === "string") {
          scopes[key] = { taskId: record.taskId, updatedAt: record.updatedAt };
        }
      }
    }
    return { updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : fallback.updatedAt, scopes };
  } catch {
    return fallback;
  }
}

async function writeActiveTaskPointer(root: string, taskId: string, updatedAt: string, scope?: ActiveTaskScope): Promise<void> {
  const paths = await ensureProject(root);
  const scoped = normalizeActiveTaskScope(scope);
  const state = await readActiveTaskScopes(root);
  state.updatedAt = updatedAt;
  state.scopes[activeTaskScopeKey(scoped)] = { taskId, updatedAt };
  state.scopes.project = { taskId, updatedAt };
  await writeFile(paths.activeTaskScopesPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
  await writeFile(paths.activeTaskPath, `${JSON.stringify({ id: taskId, updatedAt }, null, 2)}\n`, "utf8");
}

async function clearActiveTaskPointer(root: string, scope?: ActiveTaskScope, taskId?: string): Promise<void> {
  const paths = getProjectPaths(root);
  const scoped = normalizeActiveTaskScope(scope);
  const state = await readActiveTaskScopes(root);
  const key = activeTaskScopeKey(scoped);
  if (!taskId || state.scopes[key]?.taskId === taskId) delete state.scopes[key];
  if (!taskId || state.scopes.project?.taskId === taskId) {
    delete state.scopes.project;
    await rm(paths.activeTaskPath, { force: true });
  }
  state.updatedAt = new Date().toISOString();
  await mkdir(paths.workflowDir, { recursive: true });
  await writeFile(paths.activeTaskScopesPath, `${JSON.stringify(state, null, 2)}\n`, "utf8");
}

function normalizeActiveTaskScope(scope?: ActiveTaskScope): ActiveTaskScope {
  if (scope?.kind === "session" && scope.id?.trim()) return { kind: "session", id: scope.id.trim() };
  return { kind: "project" };
}

function activeTaskScopeKey(scope?: ActiveTaskScope): string {
  const normalized = normalizeActiveTaskScope(scope);
  return normalized.kind === "session" ? `session:${normalized.id || "project"}` : "project";
}

export async function loadTask(root: string, taskId: string): Promise<TaskState | undefined> {
  const taskPath = path.join(getProjectPaths(root).tasksDir, taskId, "task.json");
  if (!(await pathExists(taskPath))) return undefined;
  try {
    return normalizeTaskState(JSON.parse(await readFile(taskPath, "utf8")) as Partial<TaskState>);
  } catch {
    return undefined;
  }
}

function normalizeTaskState(parsed: Partial<TaskState>): TaskState | undefined {
  if (
    typeof parsed.id !== "string" ||
    typeof parsed.title !== "string" ||
    !isTaskStatus(parsed.status) ||
    !isTaskPhase(parsed.phase) ||
    typeof parsed.createdAt !== "string" ||
    typeof parsed.updatedAt !== "string" ||
    typeof parsed.cwd !== "string" ||
    typeof parsed.initialPrompt !== "string" ||
    !parsed.counters ||
    !Array.isArray(parsed.checkpoints)
  ) {
    return undefined;
  }
  const task: TaskState = {
    id: parsed.id,
    title: parsed.title,
    status: parsed.status,
    phase: parsed.phase,
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    cwd: parsed.cwd,
    initialPrompt: parsed.initialPrompt,
    lastPrompt: typeof parsed.lastPrompt === "string" ? parsed.lastPrompt : undefined,
    counters: {
      toolCalls: typeof parsed.counters.toolCalls === "number" ? parsed.counters.toolCalls : 0,
      failedToolCalls: typeof parsed.counters.failedToolCalls === "number" ? parsed.counters.failedToolCalls : 0,
      turns: typeof parsed.counters.turns === "number" ? parsed.counters.turns : 0,
    },
    checkpoints: parsed.checkpoints.filter(isCheckpoint),
  };
  task.metadata = normalizeTaskMetadata(parsed.metadata, task);
  return task;
}

function createTaskMetadata(task: TaskState, options: CreateTaskOptions = {}): TaskMetadata {
  const now = task.createdAt;
  return normalizeTaskMetadata({
    schemaVersion: 1,
    kind: options.kind || inferTaskKind(task.initialPrompt),
    source: options.source || "user",
    priority: options.priority || "normal",
    risk: options.risk || inferTaskRisk(task.initialPrompt),
    labels: dedupeStrings(options.labels || inferTaskLabels(task.initialPrompt)),
    relationships: normalizeTaskRelationships(options.relationships),
    origin: normalizeTaskOrigin(options.origin || { prompt: task.initialPrompt }),
    relatedSpecs: dedupeStrings(options.relatedSpecs || []),
    custom: normalizeRecord(options.custom),
    createdAt: now,
    updatedAt: now,
  }, task);
}

function normalizeTaskMetadata(value: unknown, task: TaskState): TaskMetadata {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const hasMetadata = !!value && typeof value === "object";
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : task.createdAt;
  const updatedAt = typeof record.updatedAt === "string" ? record.updatedAt : task.updatedAt;
  return {
    schemaVersion: 1,
    kind: isTaskKind(record.kind) ? record.kind : inferTaskKind(task.initialPrompt),
    source: isTaskSource(record.source) ? record.source : "user",
    priority: isTaskPriority(record.priority) ? record.priority : "normal",
    risk: isTaskRisk(record.risk) ? record.risk : inferTaskRisk(task.initialPrompt),
    labels: dedupeStrings(hasMetadata ? normalizeStringArray(record.labels) : inferTaskLabels(task.initialPrompt)),
    assignee: typeof record.assignee === "string" && record.assignee.trim() ? record.assignee.trim() : undefined,
    branch: typeof record.branch === "string" && record.branch.trim() ? record.branch.trim() : undefined,
    prUrl: typeof record.prUrl === "string" && record.prUrl.trim() ? record.prUrl.trim() : undefined,
    relationships: normalizeTaskRelationships(record.relationships),
    origin: normalizeTaskOrigin(hasMetadata ? record.origin : { prompt: task.initialPrompt }),
    relatedSpecs: dedupeStrings(normalizeStringArray(record.relatedSpecs)),
    custom: normalizeRecord(record.custom),
    createdAt,
    updatedAt,
  };
}

function normalizeTaskRelationships(value: unknown): TaskRelationships {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    parentTaskId: typeof record.parentTaskId === "string" && record.parentTaskId.trim() ? record.parentTaskId.trim() : undefined,
    childTaskIds: dedupeStrings(normalizeStringArray(record.childTaskIds)),
    relatedTaskIds: dedupeStrings(normalizeStringArray(record.relatedTaskIds)),
  };
}

function normalizeTaskOrigin(value: unknown): TaskOrigin {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    prompt: typeof record.prompt === "string" ? record.prompt : undefined,
    command: typeof record.command === "string" ? record.command : undefined,
    toolName: typeof record.toolName === "string" ? record.toolName : undefined,
    toolCallId: typeof record.toolCallId === "string" ? record.toolCallId : undefined,
    note: typeof record.note === "string" ? record.note : undefined,
  };
}

function normalizeRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function inferTaskKind(prompt: string): TaskKind {
  if (/(上游|upstream|sync|ecc|omo|everything claude code|oh my openagent)/i.test(prompt)) return "upstream-sync";
  if (/(research|调研|研究|分析|审查|review)/i.test(prompt)) return "research";
  if (/(bug|fix|修复|排查|错误|问题|broken|failing)/i.test(prompt)) return "bugfix";
  if (/(实现|开发|支持|add|build|implement|create)/i.test(prompt)) return "feature";
  if (/(verify|test|check|lint|验证|测试|检查)/i.test(prompt)) return "verification";
  if (/(清理|维护|更新文档|maintenance|docs?)/i.test(prompt)) return "maintenance";
  return "other";
}

function inferTaskRisk(prompt: string): TaskRisk {
  if (/(删除|移除|清空|卸载|reset|delete|remove|uninstall|migration|迁移|权限|security|auth)/i.test(prompt)) return "high";
  if (/(配置|hook|集成|install|upgrade|sync|兼容|refactor|重构)/i.test(prompt)) return "medium";
  return "low";
}

function inferTaskLabels(prompt: string): string[] {
  const labels: string[] = [];
  if (/(上游|upstream|ecc|omo)/i.test(prompt)) labels.push("upstream");
  if (/(hook|钩子)/i.test(prompt)) labels.push("hook");
  if (/(test|verify|check|验证|测试)/i.test(prompt)) labels.push("verification");
  if (/(docs?|readme|文档)/i.test(prompt)) labels.push("docs");
  if (/(plugin|插件)/i.test(prompt)) labels.push("plugin");
  return labels;
}

function isTaskStatus(value: unknown): value is TaskStatus {
  return value === "active" || value === "paused" || value === "finished";
}

function isTaskPhase(value: unknown): value is TaskPhase {
  return value === "intake" || value === "planning" || value === "implementing" || value === "verifying" || value === "finished";
}

function isTaskKind(value: unknown): value is TaskKind {
  return value === "feature" ||
    value === "bugfix" ||
    value === "research" ||
    value === "upstream-sync" ||
    value === "maintenance" ||
    value === "verification" ||
    value === "other";
}

function isTaskSource(value: unknown): value is TaskSource {
  return value === "user" || value === "tool_activity" || value === "upstream_sync" || value === "manual" || value === "system";
}

function isTaskPriority(value: unknown): value is TaskPriority {
  return value === "low" || value === "normal" || value === "high" || value === "urgent";
}

function isTaskRisk(value: unknown): value is TaskRisk {
  return value === "low" || value === "medium" || value === "high";
}

function isCheckpoint(value: unknown): value is Checkpoint {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" &&
    typeof record.label === "string" &&
    typeof record.done === "boolean";
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

export async function setActiveTask(root: string, taskId: string, scope?: ActiveTaskScope): Promise<TaskState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const previous = await loadActiveTask(root, scope);
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
  await writeActiveTaskPointer(root, task.id, task.updatedAt, scope);
  await appendTaskEvent(root, task.id, { type: "task_activated", timestamp: task.updatedAt, data: { taskId: task.id, scope: activeTaskScopeKey(scope) } });
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
  const metadataLine = task.metadata ? `metadata: ${formatTaskMetadataInline(task.metadata)}` : undefined;
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
    metadataLine,
    `plan: ${nextStep ? `${nextStep.id} ${nextStep.status} - ${nextStep.text}` : "complete"}`,
    `verification suggestions: ${suggestionCount}`,
    readinessLine,
    `checkpoints: ${checkpointText}`,
  ].filter(line => line !== undefined).join("\n");
}

export async function saveTask(root: string, task: TaskState): Promise<void> {
  task.updatedAt = new Date().toISOString();
  task.metadata = normalizeTaskMetadata(task.metadata, task);
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
    const sourcePacks = mergeResearchSourcePacks(
      Array.isArray(parsed.sourcePacks) ? parsed.sourcePacks.map(normalizeResearchSourcePack).filter(isDefined) : [],
      await readResearchSourcePacksFile(root, taskId),
    );
    const questions = Array.isArray(parsed.questions) ? parsed.questions.filter(isResearchQuestion) : [];
    const legacyOpenQuestions = normalizeStringArray(parsed.openQuestions);
    return {
      taskId: parsed.taskId,
      updatedAt: parsed.updatedAt,
      generatedFrom: typeof parsed.generatedFrom === "string" ? parsed.generatedFrom : undefined,
      openQuestions: legacyOpenQuestions,
      decisions: normalizeStringArray(parsed.decisions),
      findings: normalizeStringArray(parsed.findings),
      openRisks: normalizeStringArray(parsed.openRisks),
      items: Array.isArray(parsed.items) ? parsed.items.filter(isResearchItem) : [],
      sourcePacks,
      questions: questions.length > 0 ? questions : legacyOpenQuestions.map((text, index) => createResearchQuestion(`Q${index + 1}`, text, parsed.updatedAt, "normal")),
      findingRecords: Array.isArray(parsed.findingRecords) ? parsed.findingRecords.filter(isResearchFinding) : [],
      decisionRecords: Array.isArray(parsed.decisionRecords) ? parsed.decisionRecords.filter(isResearchDecision) : [],
      riskRecords: Array.isArray(parsed.riskRecords) ? parsed.riskRecords.filter(isResearchRisk) : [],
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

export async function readTaskClarification(root: string, taskId: string): Promise<ClarificationState | undefined> {
  const clarificationPath = path.join(getProjectPaths(root).tasksDir, taskId, "clarification.json");
  if (!(await pathExists(clarificationPath))) return undefined;
  try {
    const parsed = JSON.parse(await readFile(clarificationPath, "utf8")) as Partial<ClarificationState>;
    return normalizeClarificationState(parsed);
  } catch {
    return undefined;
  }
}

export async function startTaskClarification(
  root: string,
  taskId: string,
  options: { maxQuestions?: number; mode?: ClarificationMode } = {},
): Promise<ClarificationState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;

  const now = new Date().toISOString();
  const maxQuestions = clampClarificationMax(options.maxQuestions);
  const existing = await readTaskClarification(root, task.id);
  let state = existing || createClarificationState(task.id, extractPrd(task.initialPrompt), now, "manual_start", {
    enabled: true,
    required: true,
    maxQuestions,
    seedDefaults: true,
    mode: options.mode || "questions",
  });

  if (existing) {
    const questions = existing.questions.length > 0
      ? existing.questions.slice(0, maxQuestions)
      : buildDefaultClarificationQuestions(maxQuestions, now);
    state = activateNextClarificationQuestion({
      ...existing,
      enabled: true,
      required: true,
      status: "collecting",
      mode: options.mode || existing.mode,
      requiredAxes: existing.requiredAxes.length > 0 ? existing.requiredAxes : dedupeClarificationAxes(questions.map(question => question.axis)),
      maxQuestions,
      questions,
      updatedAt: now,
      generatedFrom: "manual_start",
    }, now);
  }

  await persistClarificationUpdate(root, task, state, "clarification_started", { maxQuestions, mode: state.mode });
  return state;
}

export async function startPrdRefinement(
  root: string,
  taskId: string,
  options: { maxQuestions?: number; requiredAxes?: ClarificationAxis[] } = {},
): Promise<ClarificationState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;

  const now = new Date().toISOString();
  const maxQuestions = clampClarificationMax(options.maxQuestions ?? DEFAULT_PRD_REFINEMENT_MAX_QUESTIONS);
  const requiredAxes = dedupeClarificationAxes(options.requiredAxes || DEFAULT_PRD_REFINEMENT_AXES).slice(0, maxQuestions);
  const existing = await readTaskClarification(root, task.id);
  const base = existing || createClarificationState(task.id, extractPrd(task.initialPrompt), now, "prd_refine", {
    enabled: true,
    required: true,
    maxQuestions,
    mode: "refine",
    requiredAxes,
  });
  const questions = buildPrdRefinementQuestions(base, requiredAxes, now);
  const hasOpenQuestion = questions.some(question => question.status === "queued" || question.status === "asking");
  const state = activateNextClarificationQuestion({
    ...base,
    enabled: true,
    required: true,
    status: hasOpenQuestion ? "collecting" : "ready",
    mode: "refine",
    requiredAxes,
    maxQuestions,
    questions,
    currentQuestionId: questions.find(question => question.status === "asking")?.id,
    updatedAt: now,
    generatedFrom: "prd_refine",
  }, now);

  await persistClarificationUpdate(root, task, state, "prd_refinement_started", { maxQuestions, requiredAxes });
  return state;
}

export async function answerTaskClarification(
  root: string,
  taskId: string,
  answer: string,
  source = "manual",
): Promise<ClarificationUpdateResult> {
  const task = await loadTask(root, taskId);
  if (!task) return { status: "missing", openQuestions: [] };
  const existing = await readTaskClarification(root, task.id);
  if (!existing || !existing.currentQuestionId || existing.status !== "collecting") {
    return { status: "blocked", task, state: existing, openQuestions: openClarificationQuestions(existing) };
  }

  const now = new Date().toISOString();
  const current = existing.questions.find(question => question.id === existing.currentQuestionId);
  if (!current) {
    const repaired = activateNextClarificationQuestion(existing, now);
    await persistClarificationUpdate(root, task, repaired, "clarification_repaired", {});
    return { status: "blocked", task, state: repaired, openQuestions: openClarificationQuestions(repaired) };
  }

  const trimmed = answer.trim();
  const questions = existing.questions.map(question =>
    question.id === current.id
      ? {
        ...question,
        status: "answered" as const,
        answer: trimmed,
        answeredAt: now,
      }
      : question,
  );
  const draft = updateClarificationDraft(existing.draft, current, trimmed);
  const state = activateNextClarificationQuestion({
    ...existing,
    questions,
    draft,
    updatedAt: now,
    generatedFrom: source,
  }, now);

  await persistClarificationUpdate(root, task, state, "clarification_answered", {
    id: current.id,
    source,
    answer: summarizeUnknown(trimmed, 220),
  });
  return { status: "updated", task, state, openQuestions: openClarificationQuestions(state) };
}

export async function skipTaskClarification(
  root: string,
  taskId: string,
  reason?: string,
): Promise<ClarificationUpdateResult> {
  const task = await loadTask(root, taskId);
  if (!task) return { status: "missing", openQuestions: [] };
  const existing = await readTaskClarification(root, task.id);
  if (!existing || !existing.currentQuestionId || existing.status !== "collecting") {
    return { status: "blocked", task, state: existing, openQuestions: openClarificationQuestions(existing) };
  }

  const now = new Date().toISOString();
  const current = existing.questions.find(question => question.id === existing.currentQuestionId);
  if (!current) return { status: "blocked", task, state: existing, openQuestions: openClarificationQuestions(existing) };

  const questions = existing.questions.map(question =>
    question.id === current.id
      ? {
        ...question,
        status: "skipped" as const,
        rationale: reason?.trim() || question.rationale,
        answeredAt: now,
      }
      : question,
  );
  const state = activateNextClarificationQuestion({
    ...existing,
    questions,
    updatedAt: now,
    generatedFrom: "manual_skip",
  }, now);

  await persistClarificationUpdate(root, task, state, "clarification_skipped", {
    id: current.id,
    reason,
  });
  return { status: "updated", task, state, openQuestions: openClarificationQuestions(state) };
}

export async function finishTaskClarification(
  root: string,
  taskId: string,
  options: { force?: boolean; note?: string } = {},
): Promise<ClarificationUpdateResult> {
  const task = await loadTask(root, taskId);
  if (!task) return { status: "missing", openQuestions: [] };
  const existing = await readTaskClarification(root, task.id);
  if (!existing) {
    const now = new Date().toISOString();
    const state = createClarificationState(task.id, extractPrd(task.initialPrompt), now, "manual_finish", {
      enabled: false,
      required: false,
    });
    await persistClarificationUpdate(root, task, state, "clarification_finished", { note: options.note });
    return { status: "updated", task, state, openQuestions: [] };
  }

  const openQuestions = openClarificationQuestions(existing);
  if (openQuestions.length > 0 && !options.force) {
    return { status: "blocked", task, state: existing, openQuestions };
  }

  const now = new Date().toISOString();
  const forcedSkip = openQuestions.length > 0 && options.force;
  const questions = forcedSkip
    ? existing.questions.map(question =>
      question.status === "queued" || question.status === "asking"
        ? { ...question, status: "skipped" as const, rationale: options.note || question.rationale, answeredAt: now }
        : question,
    )
    : existing.questions;
  const state = finalizeClarificationState({
    ...existing,
    questions,
    currentQuestionId: undefined,
    status: forcedSkip ? "skipped" : "ready",
    updatedAt: now,
    generatedFrom: forcedSkip ? "manual_force_finish" : "manual_finish",
  });

  await persistClarificationUpdate(root, task, state, "clarification_finished", {
    forced: forcedSkip,
    note: options.note,
  });
  return { status: "updated", task, state, openQuestions: [] };
}

export function shouldCaptureClarificationAnswer(state: ClarificationState | undefined, prompt: string): boolean {
  const trimmed = prompt.trim();
  return !!state &&
    state.enabled &&
    state.required &&
    state.status === "collecting" &&
    !!state.currentQuestionId &&
    !!trimmed &&
    !isInternalClarificationPrompt(trimmed) &&
    !trimmed.startsWith("/");
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
  await writeTaskInfo(root, task, "research_added", { force: true });
  return state;
}

export async function addTaskResearchQuestion(
  root: string,
  taskId: string,
  text: string,
  options: { priority?: ResearchPriority; sourcePackIds?: string[] } = {},
): Promise<ResearchState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return readTaskResearch(root, taskId);
  const now = new Date().toISOString();
  const state = await getOrCreateResearchState(root, task.id, now, "research_question");
  const question = createResearchQuestion(`Q${state.questions.length + 1}`, trimmed, now, options.priority || "normal", options.sourcePackIds);
  state.questions.push(question);
  state.openQuestions = dedupeStrings([...state.openQuestions, trimmed]);
  return persistResearchUpdate(root, task, state, "research_question_added", { id: question.id, text: question.text, priority: question.priority });
}

export async function answerTaskResearchQuestion(
  root: string,
  taskId: string,
  questionId: string,
  answer: string,
  options: { sourcePackIds?: string[]; blockedReason?: string } = {},
): Promise<ResearchState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const now = new Date().toISOString();
  const state = await getOrCreateResearchState(root, task.id, now, "research_answer");
  const trimmedAnswer = answer.trim();
  let updated = false;
  state.questions = state.questions.map(question => {
    if (question.id !== questionId) return question;
    updated = true;
    const blocked = options.blockedReason?.trim();
    return {
      ...question,
      status: blocked ? "blocked" : "answered",
      answer: blocked ? question.answer : trimmedAnswer,
      blockedReason: blocked || undefined,
      sourcePackIds: dedupeStrings([...(question.sourcePackIds || []), ...(options.sourcePackIds || [])]),
      updatedAt: now,
      answeredAt: blocked ? question.answeredAt : now,
    };
  });
  if (!updated) return state;
  state.openQuestions = state.questions.filter(question => question.status !== "answered").map(question => question.text);
  if (trimmedAnswer) state.findings = dedupeStrings([...state.findings, trimmedAnswer]);
  return persistResearchUpdate(root, task, state, "research_question_answered", { id: questionId, blocked: !!options.blockedReason });
}

export async function addTaskResearchDecision(
  root: string,
  taskId: string,
  decision: string,
  rationale: string,
  options: { sourcePackIds?: string[]; alternatives?: string[] } = {},
): Promise<ResearchState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const trimmedDecision = decision.trim();
  const trimmedRationale = rationale.trim();
  if (!trimmedDecision || !trimmedRationale) return readTaskResearch(root, taskId);
  const now = new Date().toISOString();
  const state = await getOrCreateResearchState(root, task.id, now, "research_decision");
  const record: ResearchDecision = {
    id: `D${state.decisionRecords.length + 1}`,
    decision: trimmedDecision,
    rationale: trimmedRationale,
    sourcePackIds: dedupeStrings(options.sourcePackIds || []),
    alternatives: dedupeStrings(options.alternatives || []),
    acceptedAt: now,
  };
  state.decisionRecords.push(record);
  state.decisions = dedupeStrings([...state.decisions, `${trimmedDecision} — ${trimmedRationale}`]);
  return persistResearchUpdate(root, task, state, "research_decision_added", { id: record.id, decision: record.decision });
}

export async function addTaskResearchSourcePack(
  root: string,
  taskId: string,
  input: ResearchSourceInput,
): Promise<ResearchState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const source = input.source.trim();
  const claim = input.claim.trim();
  if (!source || !claim) return readTaskResearch(root, taskId);
  const now = new Date().toISOString();
  const state = await getOrCreateResearchState(root, task.id, now, "created_from_source_pack");
  const reviewStatus = input.reviewStatus || "reviewed";
  const pack: ResearchSourcePack = {
    id: `S${state.sourcePacks.length + 1}`,
    kind: input.kind || inferResearchSourceKind(source),
    source,
    createdAt: now,
    reviewedAt: reviewStatus === "reviewed" ? now : undefined,
    reviewStatus,
    claim,
    excerpt: (input.excerpt || claim).trim(),
    confidence: input.confidence || "medium",
    openRisks: dedupeStrings(input.openRisks || []).slice(0, 8),
    relatedItemIds: dedupeStrings(input.relatedItemIds || []).slice(0, 8),
    questionIds: dedupeStrings(input.questionIds || []).slice(0, 8),
    extractedFrom: input.extractedFrom,
    lineRange: input.lineRange,
    staleAfter: input.staleAfter,
  };
  state.sourcePacks.push(pack);
  state.findings = dedupeStrings([...state.findings, claim]);
  state.findingRecords.push({
    id: `F${state.findingRecords.length + 1}`,
    claim,
    status: "active",
    confidence: pack.confidence,
    questionId: pack.questionIds[0],
    sourcePackIds: [pack.id],
    risks: pack.openRisks,
    createdAt: now,
    updatedAt: now,
  });
  for (const riskText of pack.openRisks) {
    state.riskRecords.push({ id: `K${state.riskRecords.length + 1}`, text: riskText, status: "open", sourcePackIds: [pack.id], createdAt: now });
  }
  if (pack.openRisks.length > 0) state.openRisks = dedupeStrings([...state.openRisks, ...pack.openRisks]);
  return persistResearchUpdate(root, task, state, "research_source_added", { id: pack.id, kind: pack.kind, source: pack.source, confidence: pack.confidence, reviewStatus: pack.reviewStatus, claim: pack.claim });
}

export async function extractTaskResearchSourcePack(
  root: string,
  taskId: string,
  input: ResearchSourceExtractionInput,
): Promise<ResearchState | undefined> {
  const extracted = await extractLocalSourceExcerpt(root, input.source);
  if (!extracted) return readTaskResearch(root, taskId);
  return addTaskResearchSourcePack(root, taskId, {
    source: extracted.source,
    claim: input.claim,
    excerpt: extracted.excerpt,
    confidence: input.confidence || "medium",
    reviewStatus: input.reviewStatus || "draft",
    questionIds: input.questionIds,
    openRisks: input.openRisks,
    extractedFrom: extracted.file,
    lineRange: extracted.lineRange,
    staleAfter: input.staleAfter,
  });
}

export async function reviewTaskResearchSourcePack(root: string, taskId: string, sourcePackId: string): Promise<ResearchState | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const now = new Date().toISOString();
  const state = await getOrCreateResearchState(root, task.id, now, "research_source_reviewed");
  let reviewed = false;
  state.sourcePacks = state.sourcePacks.map(pack => {
    if (pack.id !== sourcePackId) return pack;
    reviewed = true;
    return { ...pack, reviewStatus: "reviewed", reviewedAt: now };
  });
  if (!reviewed) return state;
  return persistResearchUpdate(root, task, state, "research_source_reviewed", { id: sourcePackId });
}

async function getOrCreateResearchState(root: string, taskId: string, now: string, generatedFrom: string): Promise<ResearchState> {
  return await readTaskResearch(root, taskId) || createResearchState(taskId, [], now, generatedFrom);
}

async function persistResearchUpdate(root: string, task: TaskState, state: ResearchState, eventType: string, data: Record<string, unknown>): Promise<ResearchState> {
  const now = new Date().toISOString();
  state.updatedAt = now;
  state.generatedFrom = eventType;
  await writeResearchFiles(root, task, state);
  await appendTaskEvent(root, task.id, { type: eventType, timestamp: now, data });
  await writeTaskInfo(root, task, eventType, { force: true });
  await writeTaskHandoff(root, task, eventType);
  return state;
}

export async function writeTaskInfo(
  root: string,
  task: TaskState,
  reason = "update",
  options: { force?: boolean; refreshSubtasks?: boolean; refreshRoles?: boolean; refreshRemediation?: boolean; refreshPrdReview?: boolean } = {},
): Promise<string> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  const infoPath = path.join(taskDir, "info.md");
  const existing = await readTaskInfo(root, task.id);
  const currentTask = await loadTask(root, task.id) || task;
  const prdReview = await writePrdReview(root, currentTask, reason);
  if (existing !== undefined && !options.force && (options.refreshSubtasks || options.refreshRoles || options.refreshRemediation || options.refreshPrdReview)) {
    const subtaskSummary = await formatSubtaskTreeSummary(root, currentTask, 12);
    const subtaskPlan = await readSubtaskPlan(root, currentTask.id);
    const roles = await readRoleOrchestration(root, currentTask.id);
    const remediation = await readVerificationRemediationPlan(root, currentTask.id);
    const content = updateTaskInfoGeneratedSections(existing, subtaskSummary, subtaskPlan, prdReview, roles, remediation);
    await writeFile(infoPath, content, "utf8");
    return content;
  }
  if (existing !== undefined && !options.force) return existing;
  const [acceptance, plan, verificationStrategy, research, clarification] = await Promise.all([
    readAcceptance(root, currentTask.id),
    readPlan(root, currentTask.id),
    readVerificationStrategy(root, currentTask.id),
    readTaskResearch(root, currentTask.id),
    readTaskClarification(root, currentTask.id),
  ]);
  const subtaskSummary = await formatSubtaskTreeSummary(root, currentTask, 12);
  const subtaskPlan = await readSubtaskPlan(root, currentTask.id);
  const roles = await readRoleOrchestration(root, currentTask.id);
  const remediation = await readVerificationRemediationPlan(root, currentTask.id);
  const content = formatTaskInfo(currentTask, acceptance, plan, verificationStrategy, research, clarification, subtaskSummary, subtaskPlan, roles, remediation, prdReview, reason);
  await writeFile(infoPath, content, "utf8");
  return content;
}

function updateTaskInfoGeneratedSections(content: string, subtaskSummary: string, subtaskPlan: SubtaskPlan | undefined, prdReview: PrdReviewState, roles?: RoleOrchestrationPlan, remediation?: VerificationRemediationPlan): string {
  let next = updateTaskInfoSection(content, "PRD Review", formatPrdReviewSummary(prdReview, 12));
  next = updateTaskInfoSection(next, "Subtasks", subtaskSummary);
  next = updateTaskInfoSection(
    next,
    "Subtask Plan",
    subtaskPlan ? formatSubtaskPlanSummary(subtaskPlan, 12) : "No subtask plan recorded yet.",
  );
  next = updateTaskInfoSection(
    next,
    "Role Orchestration",
    roles ? formatRoleOrchestrationSummary(roles, 3) : "No role orchestration plan recorded yet.",
  );
  return updateTaskInfoSection(
    next,
    "Verification Remediation",
    remediation ? formatVerificationRemediationSummary(remediation) : "No verification remediation loop recorded yet.",
  );
}

function updateTaskInfoSection(content: string, title: string, body: string): string {
  const section = `## ${title}\n\n${body}\n`;
  const sectionPattern = new RegExp(`(^## ${escapeRegExp(title)}\\r?\\n\\r?\\n)([\\s\\S]*?)(?=\\r?\\n## |\\s*$)`, "m");
  if (sectionPattern.test(content)) {
    return content.replace(sectionPattern, `$1${body}\n`);
  }
  const trimmedEnd = content.endsWith("\n") ? content : `${content}\n`;
  return `${trimmedEnd}\n${section}`;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
      verificationCoverageGaps: Array.isArray(parsed.verificationCoverageGaps) ? parsed.verificationCoverageGaps.filter(item => typeof item === "string") : [],
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

export async function createTask(root: string, prompt: string, options: CreateTaskOptions = {}): Promise<TaskState> {
  const paths = await ensureProject(root);
  const activate = options.activate !== false;
  const previous = activate ? await loadActiveTask(root, options.activeScope) : undefined;
  if (previous && previous.status === "active") {
    previous.status = "paused";
    await saveTask(root, previous);
    await appendTaskEvent(root, previous.id, {
      type: "task_paused",
      timestamp: previous.updatedAt,
      data: { reason: "created_new_task", nextScope: activeTaskScopeKey(options.activeScope) },
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
    status: activate ? "active" : "paused",
    phase: "intake",
    createdAt: now,
    updatedAt: now,
    cwd: root,
    initialPrompt: prompt,
    lastPrompt: prompt,
    counters: { toolCalls: 0, failedToolCalls: 0, turns: 0 },
    checkpoints: DEFAULT_CHECKPOINTS.map(item => ({ ...item })),
  };
  task.metadata = createTaskMetadata(task, options);

  const taskDir = path.join(paths.tasksDir, id);
  await mkdir(taskDir, { recursive: true });
  const prd = extractPrd(task.initialPrompt);
  const clarification = createClarificationState(task.id, prd, now, "created");
  await writeFile(path.join(taskDir, "task.json"), `${JSON.stringify(task, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "prd.md"), formatPrd(task, prd, clarification), "utf8");
  await writeFile(path.join(taskDir, "acceptance.json"), `${JSON.stringify(createAcceptanceState(prd, now), null, 2)}\n`, "utf8");
  const plan = createPlanState(now);
  await writePlan(root, id, plan);
  await writeFile(path.join(taskDir, "verification.json"), `${JSON.stringify({ checks: [], updatedAt: now }, null, 2)}\n`, "utf8");
  await refreshVerificationStrategy(root, id);
  await writeInitialTaskResearch(root, task, prd, now);
  await writeClarificationFiles(root, task, clarification);
  await writePrdReview(root, task, "created");
  const subtaskMode = options.subtaskMode || DEFAULT_AUTO_SUBTASK_MODE;
  if (subtaskMode !== "off" && !task.metadata.relationships.parentTaskId) {
    const subtaskPlan = await writeSubtaskPlan(root, task, subtaskMode, "created", { prd });
    if (subtaskMode === "auto" && subtaskPlan.items.length > 0) {
      await applySubtaskPlan(root, task.id);
    }
  }
  if (activate) {
    await writeActiveTaskPointer(root, id, now, options.activeScope);
  }
  await appendTaskEvent(root, id, { type: "task_created", timestamp: now, data: { prompt, scope: activeTaskScopeKey(options.activeScope) } });
  await writeRoleOrchestration(root, task, "created");
  await writeTaskHandoff(root, task, "created");
  return task;
}

export async function getOrCreateActiveTask(root: string, prompt: string, options: CreateTaskOptions = {}): Promise<TaskState> {
  const active = await loadActiveTask(root, options.activeScope);
  if (active && active.status === "active") {
    const now = new Date().toISOString();
    active.lastPrompt = prompt;
    active.counters.turns += 1;
    await saveTask(root, active);
    await appendTaskEvent(root, active.id, { type: "user_prompt", timestamp: now, data: { prompt, scope: activeTaskScopeKey(options.activeScope) } });
    await writeTaskHandoff(root, active, "user_prompt");
    return active;
  }
  return createTask(root, prompt, options);
}

export async function createChildTask(root: string, parentTaskId: string, prompt: string): Promise<TaskState | undefined> {
  const parent = await loadTask(root, parentTaskId);
  if (!parent) return undefined;
  const child = await createTask(root, prompt, {
    activate: false,
    source: "manual",
    kind: inferTaskKind(prompt),
    labels: dedupeStrings([...(parent.metadata?.labels || []), "subtask"]),
    risk: parent.metadata?.risk || inferTaskRisk(prompt),
    relationships: { parentTaskId: parent.id },
    origin: { prompt, note: `child of ${parent.id}` },
    subtaskMode: "off",
  });
  const linked = await linkParentChildTask(root, parent.id, child.id);
  if (!linked) return undefined;
  const updatedParent = await loadTask(root, parent.id) || parent;
  await writeTaskInfo(root, updatedParent, "child_created", { refreshSubtasks: true });
  await writeTaskHandoff(root, updatedParent, "child_created");
  await appendTaskEvent(root, parent.id, {
    type: "child_task_created",
    timestamp: new Date().toISOString(),
    data: { childTaskId: child.id },
  });
  await appendTaskEvent(root, child.id, {
    type: "task_parent_linked",
    timestamp: new Date().toISOString(),
    data: { parentTaskId: parent.id },
  });
  return (await loadTask(root, child.id)) || child;
}

export async function readSubtaskPlan(root: string, taskId: string): Promise<SubtaskPlan | undefined> {
  const planPath = path.join(getProjectPaths(root).tasksDir, taskId, "subtasks", "plan.json");
  if (!(await pathExists(planPath))) return undefined;
  try {
    return normalizeSubtaskPlan(JSON.parse(await readFile(planPath, "utf8")) as Partial<SubtaskPlan>);
  } catch {
    return undefined;
  }
}

export async function writeSubtaskPlan(
  root: string,
  task: TaskState,
  mode: AutoSubtaskMode = "suggest",
  reason = "manual",
  options: { prd?: ReturnType<typeof extractPrd>; template?: SubtaskPlanTemplate; maxDepth?: number } = {},
): Promise<SubtaskPlan> {
  const currentTask = await loadTask(root, task.id) || task;
  const existing = await readSubtaskPlan(root, currentTask.id);
  const prd = options.prd || extractPrd(currentTask.initialPrompt);
  const now = new Date().toISOString();
  const complexity = scoreSubtaskComplexity(currentTask, prd);
  const template = resolveSubtaskPlanTemplate(currentTask, prd, complexity, options.template);
  const maxDepth = clampSubtaskPlanDepth(options.maxDepth);
  const suggestions = mode === "off" ? [] : buildSubtaskPlanItems(currentTask, prd, now, complexity, template, maxDepth);
  const existingByPrompt = new Map((existing?.items || []).map(item => [normalizeSubtaskPromptKey(item.prompt), item]));
  const items = suggestions.map(item => {
    const previous = existingByPrompt.get(normalizeSubtaskPromptKey(item.prompt));
    return previous && previous.status !== "suggested"
      ? { ...item, status: previous.status, childTaskId: previous.childTaskId, createdAt: previous.createdAt }
      : item;
  });
  const plan = normalizeSubtaskPlan({
    taskId: currentTask.id,
    mode,
    template,
    maxDepth,
    generatedAt: existing?.generatedAt || now,
    updatedAt: now,
    generatedFrom: reason,
    summary: summarizeSubtaskPlan(items, mode, complexity),
    complexity,
    items,
  }) || {
    taskId: currentTask.id,
    mode,
    template,
    maxDepth,
    generatedAt: now,
    updatedAt: now,
    generatedFrom: reason,
    summary: "No subtask suggestions generated.",
    complexity,
    items: [],
  };
  await persistSubtaskPlan(root, currentTask, plan);
  await appendTaskEvent(root, currentTask.id, {
    type: "subtask_plan_updated",
    timestamp: now,
    data: { mode, reason, template: plan.template, maxDepth: plan.maxDepth, suggestions: plan.items.length, complexity: plan.complexity },
  });
  return plan;
}

export async function refreshSubtaskPlanArtifacts(root: string, taskId: string, reason = "subtask_plan_refresh"): Promise<SubtaskPlan | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const plan = await readSubtaskPlan(root, task.id);
  await writeTaskInfo(root, task, reason, { refreshSubtasks: true });
  await writeTaskSnapshot(root, task, reason);
  await writeTaskHandoff(root, task, reason);
  return plan;
}

export async function applySubtaskPlan(root: string, taskId: string): Promise<SubtaskPlanApplyResult> {
  const task = await loadTask(root, taskId);
  if (!task) return { status: "missing", created: [] };
  let plan = await readSubtaskPlan(root, task.id);
  if (!plan) plan = await writeSubtaskPlan(root, task, "suggest", "apply_missing");
  const pending = plan.items
    .filter(item => item.status === "suggested")
    .sort(compareSubtaskPlanItems);
  if (plan.mode === "off") return { status: "empty", task, plan, created: [] };
  if (pending.length === 0) return { status: "empty", task, plan, created: [] };

  const created: TaskState[] = [];
  const now = new Date().toISOString();
  const nextItems = [...plan.items];
  const taskIdByPlanItemId = new Map(plan.items.filter(item => item.childTaskId).map(item => [item.id, item.childTaskId as string]));
  for (const item of pending.slice(0, 16)) {
    const parentTaskId = item.parentItemId ? taskIdByPlanItemId.get(item.parentItemId) : task.id;
    if (!parentTaskId) continue;
    const child = await createChildTask(root, parentTaskId, item.prompt);
    if (!child) continue;
    created.push(child);
    taskIdByPlanItemId.set(item.id, child.id);
    const index = nextItems.findIndex(candidate => candidate.id === item.id);
    if (index >= 0) {
      nextItems[index] = { ...nextItems[index], status: "created", childTaskId: child.id, createdAt: now };
    }
  }

  const nextPlan = normalizeSubtaskPlan({
    ...plan,
    mode: plan.mode === "off" ? "suggest" : plan.mode,
    updatedAt: now,
    generatedFrom: "apply",
    items: nextItems,
    summary: summarizeSubtaskPlan(nextItems, plan.mode, plan.complexity),
  }) || plan;
  await persistSubtaskPlan(root, task, nextPlan);
  await appendTaskEvent(root, task.id, {
    type: "subtask_plan_applied",
    timestamp: now,
    data: { created: created.map(child => child.id) },
  });
  await writeTaskInfo(root, task, "subtask_plan_applied", { refreshSubtasks: true });
  await writeTaskHandoff(root, task, "subtask_plan_applied");
  return { status: created.length > 0 ? "applied" : "empty", task, plan: nextPlan, created };
}

async function persistSubtaskPlan(root: string, task: TaskState, plan: SubtaskPlan): Promise<void> {
  const subtaskDir = path.join(getProjectPaths(root).tasksDir, task.id, "subtasks");
  await mkdir(subtaskDir, { recursive: true });
  await writeFile(path.join(subtaskDir, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  await writeFile(path.join(subtaskDir, "plan.md"), formatSubtaskPlan(plan), "utf8");
}

export async function linkParentChildTask(root: string, parentTaskId: string, childTaskId: string): Promise<boolean> {
  if (parentTaskId === childTaskId) return false;
  const [parent, child] = await Promise.all([
    loadTask(root, parentTaskId),
    loadTask(root, childTaskId),
  ]);
  if (!parent || !child) return false;
  if (await wouldCreateTaskCycle(root, parent.id, child.id)) return false;

  parent.metadata = normalizeTaskMetadata(parent.metadata, parent);
  child.metadata = normalizeTaskMetadata(child.metadata, child);
  const previousParentId = child.metadata.relationships.parentTaskId;
  const previousParent = previousParentId && previousParentId !== parent.id ? await loadTask(root, previousParentId) : undefined;
  parent.metadata.relationships.childTaskIds = dedupeStrings([...parent.metadata.relationships.childTaskIds, child.id]);
  child.metadata.relationships.parentTaskId = parent.id;
  parent.metadata.updatedAt = new Date().toISOString();
  child.metadata.updatedAt = parent.metadata.updatedAt;
  if (previousParent) {
    previousParent.metadata = normalizeTaskMetadata(previousParent.metadata, previousParent);
    previousParent.metadata.relationships.childTaskIds = previousParent.metadata.relationships.childTaskIds.filter(id => id !== child.id);
    previousParent.metadata.updatedAt = parent.metadata.updatedAt;
    await saveTask(root, previousParent);
    await writeTaskInfo(root, previousParent, "child_reparented", { refreshSubtasks: true });
  }
  await saveTask(root, parent);
  await saveTask(root, child);
  await writeTaskInfo(root, parent, "child_linked", { refreshSubtasks: true });
  await writeTaskInfo(root, child, "parent_linked", { refreshSubtasks: true });
  return true;
}

async function wouldCreateTaskCycle(root: string, parentTaskId: string, childTaskId: string): Promise<boolean> {
  let current: TaskState | undefined = await loadTask(root, parentTaskId);
  const seen = new Set<string>([childTaskId]);
  while (current?.metadata?.relationships.parentTaskId) {
    const nextId = current.metadata.relationships.parentTaskId;
    if (seen.has(nextId)) return true;
    seen.add(nextId);
    current = await loadTask(root, nextId);
  }
  return false;
}

export async function buildSubtaskTree(root: string, taskId: string, maxDepth = 4): Promise<SubtaskTree | undefined> {
  const task = await loadTask(root, taskId);
  if (!task) return undefined;
  const rootNode = await buildSubtaskTreeNode(root, task, new Set(), maxDepth, 0);
  const nodes = flattenSubtaskTree(rootNode);
  const blockedTasks: string[] = [];
  for (const node of nodes) {
    if (node.task.id === task.id) continue;
    const readiness = await writeTaskReadiness(root, node.task, "subtask_tree");
    if (readiness.status === "blocked") blockedTasks.push(`${node.task.id}: ${readiness.summary}`);
  }
  const rollup = buildSubtaskTreeRollup(nodes, blockedTasks.length);
  return {
    root: rootNode,
    totalTasks: nodes.length,
    openTasks: nodes.filter(node => node.task.status !== "finished").length,
    finishedTasks: nodes.filter(node => node.task.status === "finished").length,
    blockedTasks,
    rollup,
  };
}

async function buildSubtaskTreeNode(
  root: string,
  task: TaskState,
  seen: Set<string>,
  remainingDepth: number,
  currentDepth: number,
): Promise<SubtaskTreeNode> {
  const childIds = task.metadata?.relationships.childTaskIds || [];
  if (seen.has(task.id) || remainingDepth <= 0) {
    return { task, children: [], depth: currentDepth, truncatedChildCount: childIds.length || undefined };
  }
  seen.add(task.id);
  const children: SubtaskTreeNode[] = [];
  for (const childId of childIds.slice(0, 20)) {
    const child = await loadTask(root, childId);
    if (!child) continue;
    children.push(await buildSubtaskTreeNode(root, child, new Set(seen), remainingDepth - 1, currentDepth + 1));
  }
  return { task, children, depth: currentDepth, truncatedChildCount: childIds.length > 20 ? childIds.length - 20 : undefined };
}

function flattenSubtaskTree(node: SubtaskTreeNode): SubtaskTreeNode[] {
  return [node, ...node.children.flatMap(flattenSubtaskTree)];
}

function buildSubtaskTreeRollup(nodes: SubtaskTreeNode[], blockedTasks: number): SubtaskTreeRollup {
  const byStatus: Record<TaskStatus, number> = { active: 0, paused: 0, finished: 0 };
  const byPhase: Record<TaskPhase, number> = { intake: 0, planning: 0, implementing: 0, verifying: 0, finished: 0 };
  const byDepth: Record<string, number> = {};
  let leafTasks = 0;
  let maxDepth = 0;
  let truncatedTasks = 0;
  for (const node of nodes) {
    byStatus[node.task.status] += 1;
    byPhase[node.task.phase] += 1;
    byDepth[String(node.depth)] = (byDepth[String(node.depth)] || 0) + 1;
    if (node.children.length === 0) leafTasks += 1;
    if (node.depth > maxDepth) maxDepth = node.depth;
    truncatedTasks += node.truncatedChildCount || 0;
  }
  return { byStatus, byPhase, byDepth, leafTasks, maxDepth, truncatedTasks, blockedTasks };
}

export function formatSubtaskPlan(plan: SubtaskPlan): string {
  return [
    "# Subtask Plan",
    "",
    `Task: ${plan.taskId}`,
    `Mode: ${plan.mode}`,
    `Template: ${plan.template}`,
    `Max depth: ${plan.maxDepth}`,
    `Updated: ${plan.updatedAt}`,
    plan.generatedFrom ? `Reason: ${plan.generatedFrom}` : undefined,
    "",
    "## Summary",
    "",
    plan.summary,
    "",
    "## Complexity",
    "",
    formatSubtaskComplexity(plan.complexity),
    "",
    "## Suggestions",
    "",
    plan.items.length === 0 ? "No subtask suggestions generated." : plan.items.slice().sort(compareSubtaskPlanItems).map(formatSubtaskPlanItem).join("\n"),
    "",
  ].filter((line): line is string => line !== undefined).join("\n");
}

export function formatSubtaskPlanSummary(plan: SubtaskPlan, max = 8): string {
  const counts = countSubtaskPlanItems(plan.items);
  return [
    `subtask plan: ${plan.items.length} item(s), ${counts.suggested} suggested, ${counts.created} created, ${counts.skipped} skipped`,
    `mode: ${plan.mode}`,
    `template: ${plan.template}, max depth: ${plan.maxDepth}`,
    `complexity: ${plan.complexity.level} (${plan.complexity.score})${plan.complexity.reasons.length > 0 ? ` - ${plan.complexity.reasons.slice(0, 3).join("; ")}` : ""}`,
    plan.items.length > 0 ? ["suggestions:", ...plan.items.slice().sort(compareSubtaskPlanItems).slice(0, max).map(item => `- ${item.id} [${item.status}] #${item.order} d${item.depth} ${item.title}${item.parentItemId ? ` < ${item.parentItemId}` : ""}${item.childTaskId ? ` -> ${item.childTaskId}` : ""}`)].join("\n") : "suggestions: none",
  ].join("\n");
}

function formatSubtaskComplexity(complexity: SubtaskComplexity): string {
  return [
    `Level: ${complexity.level}`,
    `Score: ${complexity.score}`,
    complexity.reasons.length > 0 ? ["Reasons:", ...complexity.reasons.map(reason => `- ${reason}`)].join("\n") : "Reasons: none",
  ].join("\n");
}

function formatSubtaskPlanItem(item: SubtaskPlanItem): string {
  return [
    `- ${item.id} [${item.status}] #${item.order} d${item.depth} ${item.title}`,
    `  - template: ${item.template}`,
    item.parentItemId ? `  - parent item: ${item.parentItemId}` : undefined,
    item.dependsOn.length > 0 ? `  - depends on: ${item.dependsOn.join(", ")}` : undefined,
    `  - reason: ${item.reason}`,
    `  - prompt: ${item.prompt.replace(/\r?\n/g, " ")}`,
    item.childTaskId ? `  - child task: ${item.childTaskId}` : undefined,
  ].filter((line): line is string => line !== undefined).join("\n");
}

export function formatSubtaskTree(tree: SubtaskTree, maxDepth = 4): string {
  return [
    "# Subtask Tree",
    "",
    `Root: ${tree.root.task.id}`,
    `Total tasks: ${tree.totalTasks}`,
    `Open tasks: ${tree.openTasks}`,
    `Finished tasks: ${tree.finishedTasks}`,
    `Max depth: ${tree.rollup.maxDepth}`,
    `Leaf tasks: ${tree.rollup.leafTasks}`,
    tree.rollup.truncatedTasks > 0 ? `Truncated child refs: ${tree.rollup.truncatedTasks}` : undefined,
    "",
    "## Rollup",
    "",
    formatSubtaskTreeRollup(tree.rollup),
    "",
    "## Tree",
    "",
    formatSubtaskTreeNode(tree.root, 0, maxDepth),
    "",
    "## Blocked Subtasks",
    "",
    formatResumeList(tree.blockedTasks.slice(0, 12), "No blocked subtasks recorded."),
    "",
  ].filter((line): line is string => line !== undefined).join("\n");
}

function formatSubtaskTreeRollup(rollup: SubtaskTreeRollup): string {
  return [
    `Status: ${rollup.byStatus.active} active, ${rollup.byStatus.paused} paused, ${rollup.byStatus.finished} finished`,
    `Phase: ${rollup.byPhase.intake} intake, ${rollup.byPhase.planning} planning, ${rollup.byPhase.implementing} implementing, ${rollup.byPhase.verifying} verifying, ${rollup.byPhase.finished} finished`,
    `Depth: ${Object.entries(rollup.byDepth).map(([depth, count]) => `${depth}:${count}`).join(", ") || "none"}`,
    `Blocked: ${rollup.blockedTasks}`,
  ].join("\n");
}

function formatSubtaskTreeNode(node: SubtaskTreeNode, depth: number, maxDepth: number): string {
  const indent = "  ".repeat(depth);
  const truncated = node.truncatedChildCount ? ` (+${node.truncatedChildCount} truncated)` : "";
  const line = `${indent}- ${node.task.id} [${node.task.status}/${node.task.phase}] ${node.task.title}${truncated}`;
  if (depth >= maxDepth || node.children.length === 0) return line;
  return [line, ...node.children.map(child => formatSubtaskTreeNode(child, depth + 1, maxDepth))].join("\n");
}

export async function formatSubtaskTreeSummary(root: string, task: TaskState, max = 8): Promise<string> {
  const tree = await buildSubtaskTree(root, task.id, 3);
  if (!tree || tree.totalTasks <= 1) return "No subtasks recorded.";
  const nodes = flattenSubtaskTree(tree.root).filter(node => node.task.id !== task.id);
  return [
    `subtasks: ${nodes.length}`,
    `open: ${tree.openTasks - (tree.root.task.status !== "finished" ? 1 : 0)}`,
    `finished: ${tree.finishedTasks - (tree.root.task.status === "finished" ? 1 : 0)}`,
    `max depth: ${tree.rollup.maxDepth}`,
    tree.rollup.blockedTasks > 0 ? `blocked: ${tree.rollup.blockedTasks}` : undefined,
    tree.rollup.truncatedTasks > 0 ? `truncated refs: ${tree.rollup.truncatedTasks}` : undefined,
    nodes.length > 0 ? ["recent subtasks:", ...nodes.slice(0, max).map(node => `- ${node.task.id} [${node.task.status}/${node.task.phase}] d${node.depth} ${node.task.title}`)].join("\n") : "recent subtasks: none",
  ].filter((line): line is string => line !== undefined).join("\n");
}

function normalizeSubtaskPlan(value: Partial<SubtaskPlan> | undefined): SubtaskPlan | undefined {
  if (!value || typeof value.taskId !== "string" || typeof value.generatedAt !== "string" || typeof value.updatedAt !== "string") {
    return undefined;
  }
  const mode = isAutoSubtaskMode(value.mode) ? value.mode : "suggest";
  const rawItems = Array.isArray(value.items)
    ? value.items.map(normalizeSubtaskPlanItem).filter((item): item is SubtaskPlanItem => !!item).slice(0, 20)
    : [];
  const items = rawItems.map((item, index) => ({ ...item, order: item.order > 0 ? item.order : index + 1 })).sort(compareSubtaskPlanItems);
  const template = normalizeSubtaskPlanTemplate(value.template) || items[0]?.template || "auto";
  const maxDepth = clampSubtaskPlanDepth(value.maxDepth ?? Math.max(1, ...items.map(item => item.depth || 1)));
  return {
    taskId: value.taskId,
    mode,
    template,
    maxDepth,
    generatedAt: value.generatedAt,
    updatedAt: value.updatedAt,
    generatedFrom: typeof value.generatedFrom === "string" ? value.generatedFrom : undefined,
    summary: typeof value.summary === "string" && value.summary.trim() ? value.summary : summarizeSubtaskPlan(items, mode, normalizeSubtaskComplexity(value.complexity, items)),
    complexity: normalizeSubtaskComplexity(value.complexity, items),
    items,
  };
}

function normalizeSubtaskPlanItem(value: unknown): SubtaskPlanItem | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.title !== "string" || typeof record.prompt !== "string") return undefined;
  return {
    id: record.id,
    title: record.title.trim() || record.id,
    prompt: record.prompt.trim(),
    reason: typeof record.reason === "string" && record.reason.trim() ? record.reason.trim() : "Suggested from the parent task.",
    status: isSubtaskPlanItemStatus(record.status) ? record.status : "suggested",
    order: typeof record.order === "number" && Number.isFinite(record.order) ? Math.max(0, Math.round(record.order)) : 0,
    depth: typeof record.depth === "number" && Number.isFinite(record.depth) ? Math.max(1, Math.min(3, Math.round(record.depth))) : 1,
    template: normalizeSubtaskPlanTemplate(record.template) || "auto",
    dependsOn: stringArray(record.dependsOn),
    parentItemId: typeof record.parentItemId === "string" && record.parentItemId.trim() ? record.parentItemId.trim() : undefined,
    childTaskId: typeof record.childTaskId === "string" && record.childTaskId.trim() ? record.childTaskId.trim() : undefined,
    createdAt: typeof record.createdAt === "string" ? record.createdAt : undefined,
  };
}

function normalizeSubtaskComplexity(value: unknown, items: SubtaskPlanItem[]): SubtaskComplexity {
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (isSubtaskComplexityLevel(record.level) && typeof record.score === "number") {
      const score = Number.isFinite(record.score) ? Math.max(0, Math.min(20, Math.round(record.score))) : 0;
      return {
        level: record.level,
        score,
        reasons: Array.isArray(record.reasons)
          ? record.reasons.filter((reason): reason is string => typeof reason === "string" && reason.trim()).slice(0, 8)
          : [],
      };
    }
  }
  return {
    level: items.length > 0 ? "moderate" : "simple",
    score: items.length > 0 ? 3 : 0,
    reasons: ["Plan predates complexity scoring."],
  };
}

interface SubtaskPlanCandidate {
  key: string;
  title: string;
  prompt: string;
  reason: string;
  template: SubtaskPlanTemplate;
  depth: number;
  parentKey?: string;
  dependsOnKeys?: string[];
}

function buildSubtaskPlanItems(
  task: TaskState,
  prd: ReturnType<typeof extractPrd>,
  now: string,
  complexity: SubtaskComplexity,
  template: SubtaskPlanTemplate,
  maxDepth: number,
): SubtaskPlanItem[] {
  const goal = prd.goal || task.title;
  const acceptance = prd.acceptanceCriteria.filter(item => item.trim()).slice(0, 8);
  const constraints = prd.constraints.filter(item => item !== "Keep changes scoped to the requested workflow.").slice(0, 4);
  const openQuestions = prd.openQuestions.filter(isMeaningfulOpenQuestion).slice(0, 3);
  if (complexity.level === "simple") return [];

  const candidates: SubtaskPlanCandidate[] = [];
  if (template === "workflow") {
    addWorkflowSubtaskCandidates(candidates, goal, acceptance, constraints, openQuestions, maxDepth);
  } else if (template === "roles") {
    addRoleSubtaskCandidates(candidates, goal, acceptance, constraints, maxDepth);
  } else if (template === "verification") {
    addVerificationSubtaskCandidates(candidates, goal, acceptance, constraints);
  } else {
    addAcceptanceSubtaskCandidates(candidates, goal, acceptance, constraints, openQuestions, complexity);
  }

  return finalizeSubtaskCandidates(candidates, now);
}

function addAcceptanceSubtaskCandidates(candidates: SubtaskPlanCandidate[], goal: string, acceptance: string[], constraints: string[], openQuestions: string[], complexity: SubtaskComplexity): void {
  if (complexity.level === "complex" || openQuestions.length > 0) {
    candidates.push({
      key: "research",
      title: `Research ${shortTaskTitle(goal)}`,
      prompt: formatSuggestedSubtaskPrompt("Research", goal, [
        "Inspect relevant code, specs, and upstream notes.",
        "Record findings, risks, and open questions in research artifacts.",
        "Identify implementation boundaries before code changes.",
      ], constraints),
      reason: "Complex or uncertain task benefits from a separate research pass.",
      template: "acceptance",
      depth: 1,
    });
  }
  acceptance.slice(0, 6).forEach((criterion, index) => {
    candidates.push({
      key: `acceptance-${index + 1}`,
      title: shortTaskTitle(criterion),
      prompt: formatSuggestedSubtaskPrompt("Implement", criterion, [
        criterion,
        `Keep alignment with parent goal: ${goal}`,
        "Update plan, acceptance, and handoff artifacts as work progresses.",
      ], constraints),
      reason: "Acceptance criterion can be tracked as an independently finishable child task.",
      template: "acceptance",
      depth: 1,
      dependsOnKeys: candidates.some(candidate => candidate.key === "research") ? ["research"] : [],
    });
  });
  if (openQuestions.length > 0) {
    candidates.push({
      key: "clarify",
      title: `Clarify ${shortTaskTitle(openQuestions[0] || goal)}`,
      prompt: formatSuggestedSubtaskPrompt("Clarify", goal, [
        ...openQuestions.map(question => `Resolve open question: ${question}`),
        "Update PRD and acceptance criteria with the answer.",
      ], constraints),
      reason: "Open questions should be settled before deeper implementation.",
      template: "acceptance",
      depth: 1,
    });
  }
  if (acceptance.length >= 2 || complexity.level === "complex") {
    candidates.push({
      key: "verify",
      title: `Verify ${shortTaskTitle(goal)}`,
      prompt: formatSuggestedSubtaskPrompt("Verify", goal, [
        "Run or document targeted lint, typecheck, and test commands.",
        "Record verification evidence and remaining gaps.",
        "Confirm child tasks satisfy parent acceptance criteria.",
      ], constraints),
      reason: "Complex task should have a distinct verification pass.",
      template: "verification",
      depth: 1,
      dependsOnKeys: acceptance.map((_, index) => `acceptance-${index + 1}`),
    });
  }
}

function addWorkflowSubtaskCandidates(candidates: SubtaskPlanCandidate[], goal: string, acceptance: string[], constraints: string[], openQuestions: string[], maxDepth: number): void {
  candidates.push({
    key: "research",
    title: `Research ${shortTaskTitle(goal)}`,
    prompt: formatSuggestedSubtaskPrompt("Research", goal, ["Inspect context and resolve implementation boundaries."], constraints),
    reason: "Workflow template starts with a separate context pass.",
    template: "workflow",
    depth: 1,
  });
  candidates.push({
    key: "implement",
    title: `Implement ${shortTaskTitle(goal)}`,
    prompt: formatSuggestedSubtaskPrompt("Implement", goal, ["Apply the core changes after research is complete."], constraints),
    reason: "Workflow template keeps implementation work explicit.",
    template: "workflow",
    depth: 1,
    dependsOnKeys: ["research"],
  });
  acceptance.slice(0, 6).forEach((criterion, index) => {
    candidates.push({
      key: `acceptance-${index + 1}`,
      title: shortTaskTitle(criterion),
      prompt: formatSuggestedSubtaskPrompt("Implement acceptance", criterion, [criterion], constraints),
      reason: "Acceptance detail belongs under the implementation branch.",
      template: "workflow",
      depth: maxDepth > 1 ? 2 : 1,
      parentKey: maxDepth > 1 ? "implement" : undefined,
      dependsOnKeys: ["research"],
    });
  });
  if (openQuestions.length > 0) {
    candidates.push({
      key: "clarify",
      title: `Clarify ${shortTaskTitle(openQuestions[0] || goal)}`,
      prompt: formatSuggestedSubtaskPrompt("Clarify", goal, openQuestions.map(question => `Resolve open question: ${question}`), constraints),
      reason: "Workflow template keeps unresolved questions visible before verification.",
      template: "workflow",
      depth: 1,
      dependsOnKeys: ["research"],
    });
  }
  candidates.push({
    key: "verify",
    title: `Verify ${shortTaskTitle(goal)}`,
    prompt: formatSuggestedSubtaskPrompt("Verify", goal, ["Run targeted checks and record evidence."], constraints),
    reason: "Workflow template ends with an explicit verification branch.",
    template: "verification",
    depth: 1,
    dependsOnKeys: ["implement", ...acceptance.map((_, index) => `acceptance-${index + 1}`)],
  });
}

function addRoleSubtaskCandidates(candidates: SubtaskPlanCandidate[], goal: string, acceptance: string[], constraints: string[], maxDepth: number): void {
  candidates.push({
    key: "research-role",
    title: `Research ${shortTaskTitle(goal)}`,
    prompt: formatSuggestedSubtaskPrompt("Research", goal, ["Gather source context, risks, and decisions."], constraints),
    reason: "Role template mirrors research ownership from orchestration patterns.",
    template: "roles",
    depth: 1,
  });
  candidates.push({
    key: "implement-role",
    title: `Implement ${shortTaskTitle(goal)}`,
    prompt: formatSuggestedSubtaskPrompt("Implement", goal, acceptance.length > 0 ? acceptance.slice(0, 4) : ["Deliver the requested behavior."], constraints),
    reason: "Role template separates implementation ownership.",
    template: "roles",
    depth: 1,
    dependsOnKeys: ["research-role"],
  });
  if (maxDepth > 1) {
    acceptance.slice(0, 4).forEach((criterion, index) => {
      candidates.push({
        key: `role-acceptance-${index + 1}`,
        title: shortTaskTitle(criterion),
        prompt: formatSuggestedSubtaskPrompt("Implement acceptance", criterion, [criterion], constraints),
        reason: "Acceptance item is nested below the implementation role.",
        template: "roles",
        depth: 2,
        parentKey: "implement-role",
        dependsOnKeys: ["research-role"],
      });
    });
  }
  candidates.push({
    key: "check-role",
    title: `Check ${shortTaskTitle(goal)}`,
    prompt: formatSuggestedSubtaskPrompt("Check", goal, ["Verify behavior and record finish evidence."], constraints),
    reason: "Role template keeps check ownership separate from implementation.",
    template: "roles",
    depth: 1,
    dependsOnKeys: ["implement-role"],
  });
}

function addVerificationSubtaskCandidates(candidates: SubtaskPlanCandidate[], goal: string, acceptance: string[], constraints: string[]): void {
  candidates.push({
    key: "verify-plan",
    title: `Plan verification for ${shortTaskTitle(goal)}`,
    prompt: formatSuggestedSubtaskPrompt("Plan verification", goal, ["Identify the smallest commands or scenarios that prove the change."], constraints),
    reason: "Verification template starts by selecting evidence, not running everything blindly.",
    template: "verification",
    depth: 1,
  });
  candidates.push({
    key: "verify-run",
    title: `Run verification for ${shortTaskTitle(goal)}`,
    prompt: formatSuggestedSubtaskPrompt("Run verification", goal, acceptance.length > 0 ? acceptance.slice(0, 4) : ["Run targeted checks and record results."], constraints),
    reason: "Verification template records executable proof as a child task.",
    template: "verification",
    depth: 1,
    dependsOnKeys: ["verify-plan"],
  });
}

function finalizeSubtaskCandidates(candidates: SubtaskPlanCandidate[], now: string): SubtaskPlanItem[] {
  const seen = new Set<string>();
  const deduped: SubtaskPlanCandidate[] = [];
  for (const candidate of candidates) {
    const key = normalizeSubtaskPromptKey(candidate.prompt);
    if (seen.has(candidate.key) || seen.has(key)) continue;
    seen.add(candidate.key);
    seen.add(key);
    deduped.push(candidate);
  }
  const idByKey = new Map(deduped.map((candidate, index) => [candidate.key, `S${index + 1}`]));
  return deduped.slice(0, 16).map((candidate, index) => ({
    id: `S${index + 1}`,
    title: candidate.title,
    prompt: candidate.prompt,
    reason: candidate.reason,
    status: "suggested" as const,
    order: index + 1,
    depth: candidate.depth,
    template: candidate.template,
    dependsOn: (candidate.dependsOnKeys || []).map(key => idByKey.get(key)).filter((id): id is string => !!id),
    parentItemId: candidate.parentKey ? idByKey.get(candidate.parentKey) : undefined,
    createdAt: now,
  }));
}

function compareSubtaskPlanItems(a: SubtaskPlanItem, b: SubtaskPlanItem): number {
  return a.order - b.order || a.depth - b.depth || a.id.localeCompare(b.id);
}

function resolveSubtaskPlanTemplate(task: TaskState, prd: ReturnType<typeof extractPrd>, complexity: SubtaskComplexity, value?: SubtaskPlanTemplate): SubtaskPlanTemplate {
  const requested = normalizeSubtaskPlanTemplate(value);
  return requested && requested !== "auto" ? requested : inferSubtaskPlanTemplate(task, prd, complexity);
}

function inferSubtaskPlanTemplate(task: TaskState, prd: ReturnType<typeof extractPrd>, complexity: SubtaskComplexity): SubtaskPlanTemplate {
  const prompt = task.initialPrompt;
  if (/(role|agent|subagent|handoff|orchestration|team|角色|智能体|编排|交接)/i.test(prompt)) return "roles";
  if (/(verify|test|lint|typecheck|validation|remediation|验证|测试|检查|修复)/i.test(prompt) && prd.acceptanceCriteria.length <= 2) return "verification";
  if (complexity.level === "complex" || prd.acceptanceCriteria.length >= 3) return "workflow";
  return "acceptance";
}

function normalizeSubtaskPlanTemplate(value: unknown): SubtaskPlanTemplate | undefined {
  return value === "auto" || value === "acceptance" || value === "workflow" || value === "roles" || value === "verification" ? value : undefined;
}

function clampSubtaskPlanDepth(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 2;
  return Math.max(1, Math.min(3, numeric));
}

function scoreSubtaskComplexity(task: TaskState, prd: ReturnType<typeof extractPrd>): SubtaskComplexity {
  let score = 0;
  const reasons: string[] = [];
  const prompt = task.initialPrompt;
  const lines = prompt.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const listLines = lines.filter(line => /^[-*+]\s+|\d+[.)]\s+/.test(line)).length;
  const explicitAcceptanceCount = countExplicitAcceptanceCriteria(prompt);
  const meaningfulOpenQuestions = prd.openQuestions.filter(isMeaningfulOpenQuestion).length;

  if (lines.length >= 5) {
    score += 2;
    reasons.push("five or more prompt lines");
  } else if (lines.length >= 3) {
    score += 1;
    reasons.push("multi-line prompt");
  }
  if (listLines >= 3) {
    score += 2;
    reasons.push("three or more listed requirements");
  } else if (listLines >= 2) {
    score += 1;
    reasons.push("multiple listed requirements");
  }
  if (explicitAcceptanceCount >= 3) {
    score += 3;
    reasons.push("three or more acceptance criteria");
  } else if (explicitAcceptanceCount >= 2) {
    score += 2;
    reasons.push("multiple acceptance criteria");
  } else if (explicitAcceptanceCount === 1) {
    score += 1;
    reasons.push("explicit acceptance criterion");
  }
  if (meaningfulOpenQuestions > 0) {
    score += 2;
    reasons.push("open PRD questions");
  }
  if (prd.constraints.length > 2) {
    score += 1;
    reasons.push("multiple constraints");
  }
  if (/(research|investigate|upstream|source|reference|调研|研究|上游|参考)/i.test(prompt)) {
    score += 2;
    reasons.push("research or upstream dependency");
  }
  if (/(architecture|orchestration|workflow|agent|subagent|multi-agent|session|state|架构|编排|流程|智能体|会话|状态)/i.test(prompt)) {
    score += 2;
    reasons.push("workflow or orchestration scope");
  }
  if (/(multi|multiple|several|end-to-end|integration|cross-file|迁移|兼容|多个|多处|完整|集成)/i.test(prompt)) {
    score += 2;
    reasons.push("multi-part implementation scope");
  }
  if (/(verify|test|lint|typecheck|validation|验证|测试|检查)/i.test(prompt)) {
    score += 1;
    reasons.push("explicit verification work");
  }
  if (task.metadata?.risk === "high") {
    score += 2;
    reasons.push("high-risk task metadata");
  } else if (task.metadata?.risk === "medium") {
    score += 1;
    reasons.push("medium-risk task metadata");
  }
  if (task.metadata?.kind === "upstream-sync") {
    score += 1;
    reasons.push("upstream-sync task kind");
  }

  return {
    level: score >= 6 ? "complex" : score >= 3 ? "moderate" : "simple",
    score,
    reasons: reasons.slice(0, 8),
  };
}

function countExplicitAcceptanceCriteria(prompt: string): number {
  return prompt
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /(\[ \]|\[x\]|验收|acceptance|criteria)/i.test(line))
    .length;
}

function formatSuggestedSubtaskPrompt(kind: string, goal: string, acceptance: string[], constraints: string[]): string {
  return [
    `${kind}: ${goal}`,
    ...constraints.map(item => `- Constraint: ${item}`),
    ...acceptance.map(item => `- Acceptance: ${item}`),
  ].join("\n");
}

function normalizeSubtaskPromptKey(prompt: string): string {
  return prompt.toLowerCase().replace(/\s+/g, " ").trim();
}

function summarizeSubtaskPlan(items: SubtaskPlanItem[], mode: AutoSubtaskMode, complexity: SubtaskComplexity): string {
  const modeText = mode === "auto"
    ? "Auto mode creates suggested child tasks after planning."
    : mode === "suggest"
      ? "Suggest mode records child task proposals for review."
      : "Subtask planning is disabled.";
  if (items.length === 0) return `No subtask suggestions generated. Complexity: ${complexity.level} (${complexity.score}). ${modeText}`;
  const counts = countSubtaskPlanItems(items);
  return `${items.length} suggested child task(s). ${counts.created} created, ${counts.suggested} pending review. Complexity: ${complexity.level} (${complexity.score}). ${modeText}`;
}

function countSubtaskPlanItems(items: SubtaskPlanItem[]): Record<SubtaskPlanItemStatus, number> {
  return {
    suggested: items.filter(item => item.status === "suggested").length,
    created: items.filter(item => item.status === "created").length,
    skipped: items.filter(item => item.status === "skipped").length,
  };
}

function shortTaskTitle(input: string): string {
  const cleaned = input
    .replace(/^[-*+]\s+/, "")
    .replace(/^(验收|acceptance|criteria|constraint):\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.length > 72 ? `${cleaned.slice(0, 69)}...` : cleaned || "Project Flow subtask";
}

function isAutoSubtaskMode(value: unknown): value is AutoSubtaskMode {
  return value === "off" || value === "suggest" || value === "auto";
}

function isSubtaskComplexityLevel(value: unknown): value is SubtaskComplexityLevel {
  return value === "simple" || value === "moderate" || value === "complex";
}

function isSubtaskPlanItemStatus(value: unknown): value is SubtaskPlanItemStatus {
  return value === "suggested" || value === "created" || value === "skipped";
}

export interface RoleOrchestrationUpdateResult {
  status: "updated" | "missing" | "role_missing";
  plan?: RoleOrchestrationPlan;
  role?: RoleOrchestrationRole;
}

export async function readRoleOrchestration(root: string, taskId: string): Promise<RoleOrchestrationPlan | undefined> {
  const planPath = path.join(getProjectPaths(root).tasksDir, taskId, "roles", "plan.json");
  if (!(await pathExists(planPath))) return undefined;
  try {
    return normalizeRoleOrchestrationPlan(JSON.parse(await readFile(planPath, "utf8")) as Partial<RoleOrchestrationPlan>);
  } catch {
    return undefined;
  }
}

export async function writeRoleOrchestration(root: string, task: TaskState, reason = "manual"): Promise<RoleOrchestrationPlan> {
  const currentTask = await loadTask(root, task.id) || task;
  const existing = await readRoleOrchestration(root, currentTask.id);
  const now = new Date().toISOString();
  const [acceptance, plan, strategy] = await Promise.all([
    readAcceptance(root, currentTask.id),
    readPlan(root, currentTask.id),
    readVerificationStrategy(root, currentTask.id),
  ]);
  const existingById = new Map((existing?.roles || []).map(role => [role.id, role]));
  const roles = buildRoleOrchestrationRoles(currentTask, acceptance, plan, strategy, now).map(role => {
    const previous = existingById.get(role.id);
    return previous
      ? { ...role, status: previous.status, note: previous.note, updatedAt: previous.updatedAt || role.updatedAt }
      : role;
  });
  const rolePlan = normalizeRoleOrchestrationPlan({
    taskId: currentTask.id,
    generatedAt: existing?.generatedAt || now,
    updatedAt: now,
    generatedFrom: reason,
    summary: summarizeRoleOrchestration(roles),
    roles,
  }) || {
    taskId: currentTask.id,
    generatedAt: now,
    updatedAt: now,
    generatedFrom: reason,
    summary: "No role orchestration plan generated.",
    roles: [],
  };
  await persistRoleOrchestration(root, currentTask, rolePlan);
  await appendTaskEvent(root, currentTask.id, {
    type: "role_orchestration_updated",
    timestamp: now,
    data: { reason, roles: rolePlan.roles.map(role => ({ id: role.id, status: role.status })) },
  });
  return rolePlan;
}

export async function updateRoleOrchestrationStatus(
  root: string,
  taskId: string,
  roleId: TaskRoleId,
  status: TaskRoleStatus,
  note?: string,
): Promise<RoleOrchestrationUpdateResult> {
  const task = await loadTask(root, taskId);
  if (!task) return { status: "missing" };
  const current = await readRoleOrchestration(root, taskId) || await writeRoleOrchestration(root, task, "role_status_seed");
  const now = new Date().toISOString();
  let updatedRole: RoleOrchestrationRole | undefined;
  const roles = current.roles.map(role => {
    if (role.id !== roleId) return role;
    updatedRole = { ...role, status, note: note?.trim() || undefined, updatedAt: now };
    return updatedRole;
  });
  if (!updatedRole) return { status: "role_missing", plan: current };
  const nextPlan = normalizeRoleOrchestrationPlan({
    ...current,
    updatedAt: now,
    generatedFrom: "role_status",
    summary: summarizeRoleOrchestration(roles),
    roles,
  }) || current;
  await persistRoleOrchestration(root, task, nextPlan);
  await appendTaskEvent(root, task.id, {
    type: "role_status_updated",
    timestamp: now,
    data: { roleId, status, note },
  });
  await writeTaskInfo(root, task, "role_status_updated", { refreshRoles: true });
  await writeTaskSnapshot(root, task, "role_status_updated");
  await writeTaskHandoff(root, task, "role_status_updated");
  return { status: "updated", plan: nextPlan, role: updatedRole };
}

export function formatRoleOrchestration(plan: RoleOrchestrationPlan): string {
  return [
    "# Role Orchestration Plan",
    "",
    `Task: ${plan.taskId}`,
    `Updated: ${plan.updatedAt}`,
    plan.generatedFrom ? `Reason: ${plan.generatedFrom}` : undefined,
    "",
    "## Summary",
    "",
    plan.summary,
    "",
    "## Roles",
    "",
    plan.roles.length === 0 ? "No role handoffs generated." : plan.roles.map(formatRoleOrchestrationRole).join("\n\n"),
    "",
  ].filter((line): line is string => line !== undefined).join("\n");
}

export function formatRoleOrchestrationSummary(plan: RoleOrchestrationPlan, max = 3): string {
  const counts = countRoleStatuses(plan.roles);
  return [
    `roles: ${plan.roles.length} (${counts.pending} pending, ${counts.in_progress} in progress, ${counts.done} done, ${counts.blocked} blocked)`,
    plan.roles.length > 0 ? ["handoffs:", ...plan.roles.slice(0, max).map(role => `- ${role.id} [${role.status}] owner: ${role.owner}${role.note ? ` - ${role.note}` : ""}`)].join("\n") : "handoffs: none",
  ].join("\n");
}

function buildRoleOrchestrationRoles(
  task: TaskState,
  acceptance: AcceptanceState,
  plan: PlanState,
  strategy: VerificationStrategy,
  now: string,
): RoleOrchestrationRole[] {
  const goal = task.title || task.id;
  const acceptanceLines = acceptance.items.slice(0, 6).map(item => `${item.id} [${item.status}] ${item.text}`);
  const planLines = plan.steps.slice(0, 6).map(step => `${step.id} [${step.status}] ${step.text}`);
  const checkCommands = strategy.suggestions.slice(0, 5).map(item => `${item.command} (${item.confidence}: ${item.reason})`);
  return [
    {
      id: "research",
      title: "Research role",
      status: "pending",
      owner: "research agent or main agent in research mode",
      prompt: formatRolePromptText("Research", goal, [
        "Inspect relevant code, docs, specs, upstream references, and risks before implementation.",
        "Record source-grounded findings, decisions, and open questions. Do not edit implementation files.",
        "Stop with BLOCKED if required context is unavailable instead of guessing.",
      ], acceptanceLines),
      inputs: ["prd.md", "acceptance.json", "plan.md", "docs/gaps.md"],
      ownedArtifacts: ["research/research.json", "research/notes.md", "info.md"],
      expectedOutputs: ["Findings with source paths or URLs", "Risks and open questions", "Implementation boundaries"],
      checks: ["Research notes cite observed files or upstream sources", "No implementation files changed by research role"],
      updatedAt: now,
    },
    {
      id: "implement",
      title: "Implementation role",
      status: "pending",
      owner: "implementation agent or main agent in implementation mode",
      prompt: formatRolePromptText("Implement", goal, [
        "Use the research handoff and current plan to make the smallest coherent code change.",
        "Update affected call sites, tests, docs, and acceptance evidence together.",
        "Avoid scope growth: no retries, abstractions, or placeholders unless explicitly required.",
      ], [...acceptanceLines, ...planLines]),
      inputs: ["prd.md", "research/notes.md", "plan.md", "acceptance.json"],
      ownedArtifacts: ["plan.json", "plan.md", "acceptance.json", "changed source/test/doc files"],
      expectedOutputs: ["Implemented behavior", "Updated tests or docs", "Acceptance evidence"],
      checks: ["Code mirrors existing project patterns", "No unrelated files changed", "No TODO or placeholder implementation shipped"],
      updatedAt: now,
    },
    {
      id: "check",
      title: "Check role",
      status: "pending",
      owner: "review/check agent or main agent in verification mode",
      prompt: formatRolePromptText("Check", goal, [
        "Run targeted verification and review the implementation against acceptance criteria.",
        "Record command evidence, failures, fix recommendations, and remaining gaps.",
        "Do not mark work complete while verification is missing or failing.",
      ], checkCommands.length > 0 ? checkCommands : ["Use the smallest relevant project verification command."]),
      inputs: ["verification-strategy.json", "acceptance.json", "readiness.md", "changed source/test/doc files"],
      ownedArtifacts: ["verification.json", "verification-strategy.json", "readiness.json", "readiness.md", "snapshot.md"],
      expectedOutputs: ["Pass/fail verification evidence", "Review findings", "Readiness decision"],
      checks: checkCommands.length > 0 ? checkCommands : ["Run or document the smallest relevant verification"],
      updatedAt: now,
    },
  ];
}

function formatRolePromptText(role: string, goal: string, instructions: string[], context: string[]): string {
  return [
    `${role}: ${goal}`,
    "",
    "Instructions:",
    ...instructions.map(item => `- ${item}`),
    "",
    "Context:",
    ...(context.length > 0 ? context.map(item => `- ${item}`) : ["- No extra context recorded yet."]),
  ].join("\n");
}

async function persistRoleOrchestration(root: string, task: TaskState, plan: RoleOrchestrationPlan): Promise<void> {
  const rolesDir = path.join(getProjectPaths(root).tasksDir, task.id, "roles");
  await mkdir(rolesDir, { recursive: true });
  await writeFile(path.join(rolesDir, "plan.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  await writeFile(path.join(rolesDir, "plan.md"), formatRoleOrchestration(plan), "utf8");
  for (const role of plan.roles) {
    await writeFile(path.join(rolesDir, `${role.id}.md`), formatRoleHandoff(plan, role), "utf8");
  }
}

function formatRoleHandoff(plan: RoleOrchestrationPlan, role: RoleOrchestrationRole): string {
  return [
    `# ${role.title}`,
    "",
    `Task: ${plan.taskId}`,
    `Role: ${role.id}`,
    `Status: ${role.status}`,
    `Owner: ${role.owner}`,
    role.note ? `Note: ${role.note}` : undefined,
    "",
    "## Prompt",
    "",
    role.prompt,
    "",
    "## Inputs",
    "",
    formatResumeList(role.inputs, "No inputs recorded."),
    "",
    "## Owned Artifacts",
    "",
    formatResumeList(role.ownedArtifacts, "No owned artifacts recorded."),
    "",
    "## Expected Outputs",
    "",
    formatResumeList(role.expectedOutputs, "No expected outputs recorded."),
    "",
    "## Checks",
    "",
    formatResumeList(role.checks, "No role checks recorded."),
    "",
  ].filter((line): line is string => line !== undefined).join("\n");
}

function formatRoleOrchestrationRole(role: RoleOrchestrationRole): string {
  return [
    `### ${role.id}: ${role.title}`,
    "",
    `- status: ${role.status}`,
    `- owner: ${role.owner}`,
    role.note ? `- note: ${role.note}` : undefined,
    "- inputs:",
    ...role.inputs.map(item => `  - ${item}`),
    "- owned artifacts:",
    ...role.ownedArtifacts.map(item => `  - ${item}`),
    "- expected outputs:",
    ...role.expectedOutputs.map(item => `  - ${item}`),
    "- checks:",
    ...role.checks.map(item => `  - ${item}`),
  ].filter((line): line is string => line !== undefined).join("\n");
}

function normalizeRoleOrchestrationPlan(value: Partial<RoleOrchestrationPlan> | undefined): RoleOrchestrationPlan | undefined {
  if (!value || typeof value.taskId !== "string" || typeof value.generatedAt !== "string" || typeof value.updatedAt !== "string") return undefined;
  const roles = Array.isArray(value.roles)
    ? value.roles.map(normalizeRoleOrchestrationRole).filter((role): role is RoleOrchestrationRole => !!role).slice(0, 3)
    : [];
  return {
    taskId: value.taskId,
    generatedAt: value.generatedAt,
    updatedAt: value.updatedAt,
    generatedFrom: typeof value.generatedFrom === "string" ? value.generatedFrom : undefined,
    summary: typeof value.summary === "string" && value.summary.trim() ? value.summary : summarizeRoleOrchestration(roles),
    roles,
  };
}

function normalizeRoleOrchestrationRole(value: unknown): RoleOrchestrationRole | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (!isTaskRoleId(record.id) || typeof record.title !== "string" || typeof record.prompt !== "string") return undefined;
  return {
    id: record.id,
    title: record.title.trim() || record.id,
    status: isTaskRoleStatus(record.status) ? record.status : "pending",
    owner: typeof record.owner === "string" && record.owner.trim() ? record.owner.trim() : record.id,
    prompt: record.prompt.trim(),
    inputs: normalizeStringArray(record.inputs).slice(0, 12),
    ownedArtifacts: normalizeStringArray(record.ownedArtifacts).slice(0, 12),
    expectedOutputs: normalizeStringArray(record.expectedOutputs).slice(0, 12),
    checks: normalizeStringArray(record.checks).slice(0, 12),
    updatedAt: typeof record.updatedAt === "string" ? record.updatedAt : new Date().toISOString(),
    note: typeof record.note === "string" && record.note.trim() ? record.note.trim() : undefined,
  };
}

function summarizeRoleOrchestration(roles: RoleOrchestrationRole[]): string {
  if (roles.length === 0) return "No role handoffs generated.";
  const counts = countRoleStatuses(roles);
  return `${roles.length} role handoff(s): ${counts.pending} pending, ${counts.in_progress} in progress, ${counts.done} done, ${counts.blocked} blocked.`;
}

function countRoleStatuses(roles: RoleOrchestrationRole[]): Record<TaskRoleStatus, number> {
  return {
    pending: roles.filter(role => role.status === "pending").length,
    in_progress: roles.filter(role => role.status === "in_progress").length,
    done: roles.filter(role => role.status === "done").length,
    blocked: roles.filter(role => role.status === "blocked").length,
  };
}

function isTaskRoleId(value: unknown): value is TaskRoleId {
  return value === "research" || value === "implement" || value === "check";
}

function isTaskRoleStatus(value: unknown): value is TaskRoleStatus {
  return value === "pending" || value === "in_progress" || value === "done" || value === "blocked";
}

export async function finishActiveTask(root: string, note?: string, options: { force?: boolean; activeScope?: ActiveTaskScope } = {}): Promise<TaskState | undefined> {
  const task = await loadActiveTask(root, options.activeScope);
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
  const parentId = task.metadata?.relationships.parentTaskId;
  const parent = parentId ? await loadTask(root, parentId) : undefined;
  if (parent) {
    await appendTaskEvent(root, parent.id, {
      type: "child_task_finished",
      timestamp: new Date().toISOString(),
      data: { childTaskId: task.id },
    });
    await writeTaskInfo(root, parent, "child_finished", { refreshSubtasks: true });
    await writeTaskHandoff(root, parent, "child_finished");
  }
  await clearActiveTaskPointer(root, options.activeScope, task.id);
  return task;
}

export async function pauseActiveTask(root: string, note?: string, scope?: ActiveTaskScope): Promise<TaskState | undefined> {
  const task = await loadActiveTask(root, scope);
  if (!task) return undefined;
  task.status = "paused";
  await saveTask(root, task);
  await appendTaskEvent(root, task.id, { type: "task_paused", timestamp: new Date().toISOString(), data: { note } });
  await writeTaskHandoff(root, task, "pause");
  await clearActiveTaskPointer(root, scope, task.id);
  return task;
}

export async function recordToolEvent(
  root: string,
  kind: "tool_start" | "tool_end",
  data: { toolName: string; toolCallId?: string; args?: unknown; isError?: boolean; resultSummary?: string },
  scope?: ActiveTaskScope,
): Promise<void> {
  let task = await loadActiveTask(root, scope);
  if (!task || task.status !== "active") {
    if (kind !== "tool_end" || !shouldInferTaskFromTool(data)) return;
    task = await createTask(root, inferTaskPromptFromTool(data), {
      source: "tool_activity",
      kind: isVerificationToolCall(data) ? "verification" : "maintenance",
      labels: ["tool-inferred"],
      origin: {
        command: extractCommand(data.args),
        toolName: data.toolName,
        toolCallId: data.toolCallId,
      },
      subtaskMode: await readProjectAutoSubtaskMode(root),
      activeScope: scope,
    });
    await appendTaskEvent(root, task.id, {
      type: "task_inferred",
      timestamp: new Date().toISOString(),
      data: { reason: "tool_activity", toolName: data.toolName, toolCallId: data.toolCallId, scope: activeTaskScopeKey(scope) },
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
  await refreshVerificationStrategy(root, taskId);
  return state;
}

export async function readVerificationStrategy(root: string, taskId: string): Promise<VerificationStrategy> {
  const strategyPath = path.join(getProjectPaths(root).tasksDir, taskId, "verification-strategy.json");
  if (!(await pathExists(strategyPath))) return refreshVerificationStrategy(root, taskId);
  try {
    const parsed = JSON.parse(await readFile(strategyPath, "utf8")) as Partial<VerificationStrategy>;
    const suggestions = Array.isArray(parsed.suggestions) ? parsed.suggestions.filter(isVerificationSuggestion) : [];
    const updatedAt = typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString();
    const [events, verification] = await Promise.all([readTaskEvents(root, taskId), readVerification(root, taskId)]);
    const touchedFiles = collectTouchedFiles(root, events);
    return {
      suggestions,
      updatedAt,
      sources: Array.isArray(parsed.sources) ? parsed.sources.filter(item => typeof item === "string") : [],
      policy: normalizeVerificationPolicy(parsed.policy, touchedFiles, suggestions, updatedAt, verification.checks),
    };
  } catch {
    return refreshVerificationStrategy(root, taskId);
  }
}

export async function readVerificationRemediationPlan(root: string, taskId: string): Promise<VerificationRemediationPlan | undefined> {
  const file = path.join(getProjectPaths(root).tasksDir, taskId, "verification-remediation.json");
  if (!(await pathExists(file))) return undefined;
  try {
    return normalizeVerificationRemediationPlan(JSON.parse(await readFile(file, "utf8")) as Partial<VerificationRemediationPlan>);
  } catch {
    return undefined;
  }
}

export async function writeVerificationRemediationPlan(root: string, task: TaskState, reason = "manual", maxAttempts = 3): Promise<VerificationRemediationPlan> {
  const currentTask = await loadTask(root, task.id) || task;
  const existing = await readVerificationRemediationPlan(root, currentTask.id);
  const verification = await readVerification(root, currentTask.id);
  const failedChecks = verification.checks.filter(check => !check.success).slice(-8).map(check => toRemediationFailedCheck(check, verification.checks));
  const attempts = existing?.attempts || [];
  const now = new Date().toISOString();
  const nextActionRecords = buildRemediationNextActionRecords(failedChecks, now);
  const plan = normalizeVerificationRemediationPlan({
    taskId: currentTask.id,
    status: deriveRemediationStatus(failedChecks, attempts, maxAttempts),
    generatedAt: existing?.generatedAt || now,
    updatedAt: now,
    generatedFrom: reason,
    maxAttempts,
    summary: summarizeVerificationRemediation(failedChecks, attempts, maxAttempts),
    failedChecks,
    nextActions: buildRemediationNextActions(nextActionRecords),
    nextActionRecords,
    stopConditions: buildRemediationStopConditions(maxAttempts),
    attempts,
  }) || {
    taskId: currentTask.id,
    status: "not_required",
    generatedAt: now,
    updatedAt: now,
    generatedFrom: reason,
    maxAttempts,
    summary: "No failed verification checks require remediation.",
    failedChecks: [],
    nextActions: [],
    nextActionRecords: [],
    stopConditions: buildRemediationStopConditions(maxAttempts),
    attempts: [],
  };
  await persistVerificationRemediationPlan(root, currentTask, plan);
  await appendTaskEvent(root, currentTask.id, {
    type: "verification_remediation_planned",
    timestamp: now,
    data: { reason, status: plan.status, failedChecks: plan.failedChecks.length, attempts: plan.attempts.length },
  });
  return plan;
}

export async function startVerificationRemediationAttempt(root: string, taskId: string, note?: string): Promise<VerificationRemediationAttemptResult> {
  const task = await loadTask(root, taskId);
  if (!task) return { status: "missing" };
  const plan = await readVerificationRemediationPlan(root, taskId) || await writeVerificationRemediationPlan(root, task, "attempt_start");
  if (plan.failedChecks.length === 0) return { status: "not_required", plan };
  const active = plan.attempts.find(attempt => attempt.status === "in_progress");
  if (active) return { status: "started", plan, attempt: active };
  if (plan.attempts.length >= plan.maxAttempts) {
    const stopped = await persistUpdatedVerificationRemediationPlan(root, task, { ...plan, status: "stopped", summary: summarizeVerificationRemediation(plan.failedChecks, plan.attempts, plan.maxAttempts) }, "attempt_limit");
    return { status: "limit_reached", plan: stopped };
  }
  const now = new Date().toISOString();
  const attempt: VerificationRemediationAttempt = {
    id: `R${plan.attempts.length + 1}`,
    status: "in_progress",
    startedAt: now,
    updatedAt: now,
    failedCheckIds: plan.failedChecks.map(check => check.id),
    commands: dedupeStrings(plan.failedChecks.map(check => check.command).filter((command): command is string => !!command)),
    note: note?.trim() || undefined,
  };
  const next = await persistUpdatedVerificationRemediationPlan(root, task, {
    ...plan,
    status: "active",
    updatedAt: now,
    summary: summarizeVerificationRemediation(plan.failedChecks, [...plan.attempts, attempt], plan.maxAttempts),
    attempts: [...plan.attempts, attempt],
  }, "attempt_started");
  await appendTaskEvent(root, task.id, { type: "verification_remediation_attempt_started", timestamp: now, data: attempt });
  await writeTaskInfo(root, task, "verification_remediation_attempt_started", { refreshRemediation: true });
  await writeTaskSnapshot(root, task, "verification_remediation_attempt_started");
  await writeTaskHandoff(root, task, "verification_remediation_attempt_started");
  return { status: "started", plan: next, attempt };
}

export async function finishVerificationRemediationAttempt(
  root: string,
  taskId: string,
  status: Exclude<VerificationRemediationAttemptStatus, "in_progress">,
  evidence?: string,
): Promise<VerificationRemediationAttemptResult> {
  const task = await loadTask(root, taskId);
  if (!task) return { status: "missing" };
  const plan = await readVerificationRemediationPlan(root, taskId) || await writeVerificationRemediationPlan(root, task, "attempt_finish");
  const index = findLatestRemediationAttemptIndex(plan.attempts);
  if (index < 0) return { status: "no_active_attempt", plan };
  const now = new Date().toISOString();
  const attempts = plan.attempts.map((attempt, attemptIndex) => attemptIndex === index
    ? { ...attempt, status, evidence: evidence?.trim() || attempt.evidence, updatedAt: now }
    : attempt);
  const nextStatus: VerificationRemediationStatus = status === "passed"
    ? "resolved"
    : status === "stopped" || attempts.length >= plan.maxAttempts
      ? "stopped"
      : "planned";
  const next = await persistUpdatedVerificationRemediationPlan(root, task, {
    ...plan,
    status: nextStatus,
    updatedAt: now,
    summary: summarizeVerificationRemediation(plan.failedChecks, attempts, plan.maxAttempts),
    attempts,
  }, "attempt_finished");
  await appendTaskEvent(root, task.id, { type: "verification_remediation_attempt_finished", timestamp: now, data: { attemptId: attempts[index]?.id, status, evidence } });
  await writeTaskInfo(root, task, "verification_remediation_attempt_finished", { refreshRemediation: true });
  await writeTaskSnapshot(root, task, "verification_remediation_attempt_finished");
  await writeTaskHandoff(root, task, "verification_remediation_attempt_finished");
  return { status: "updated", plan: next, attempt: attempts[index] };
}

export function formatVerificationRemediationPlan(plan: VerificationRemediationPlan): string {
  return [
    "# Verification Remediation Loop",
    "",
    `Task: ${plan.taskId}`,
    `Status: ${plan.status}`,
    `Updated: ${plan.updatedAt}`,
    `Attempts: ${plan.attempts.length}/${plan.maxAttempts}`,
    "",
    "## Summary",
    "",
    plan.summary,
    "",
    "## Failed Checks",
    "",
    plan.failedChecks.length > 0 ? plan.failedChecks.map(formatRemediationFailedCheck).join("\n") : "No failed checks recorded.",
    "",
    "## Failure Classifications",
    "",
    plan.failedChecks.length > 0 ? plan.failedChecks.map(formatRemediationClassification).join("\n") : "No failure classifications recorded.",
    "",
    "## Next Actions",
    "",
    formatResumeList(plan.nextActions, "No next remediation actions recorded."),
    "",
    "## Next Action Records",
    "",
    plan.nextActionRecords.length > 0 ? plan.nextActionRecords.map(formatRemediationNextAction).join("\n") : "No structured next actions recorded.",
    "",
    "## Stop Conditions",
    "",
    formatResumeList(plan.stopConditions, "No stop conditions recorded."),
    "",
    "## Attempts",
    "",
    plan.attempts.length > 0 ? plan.attempts.map(formatRemediationAttempt).join("\n") : "No remediation attempts recorded.",
    "",
  ].join("\n");
}

export function formatVerificationRemediationSummary(plan: VerificationRemediationPlan): string {
  const categories = remediationCategoryCounts(plan.failedChecks);
  const categorySummary = categories.length > 0 ? ` categories ${categories.join(",")}` : "";
  const openActions = plan.nextActionRecords.filter(action => action.status === "open").length;
  return `remediation: ${plan.status}, ${plan.failedChecks.length} failed check(s), attempts ${plan.attempts.length}/${plan.maxAttempts}, open next actions ${openActions}${categorySummary}`;
}

async function persistUpdatedVerificationRemediationPlan(root: string, task: TaskState, plan: VerificationRemediationPlan, reason: string): Promise<VerificationRemediationPlan> {
  const next = normalizeVerificationRemediationPlan({ ...plan, updatedAt: new Date().toISOString(), generatedFrom: reason }) || plan;
  await persistVerificationRemediationPlan(root, task, next);
  return next;
}

async function persistVerificationRemediationPlan(root: string, task: TaskState, plan: VerificationRemediationPlan): Promise<void> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  await writeFile(path.join(taskDir, "verification-remediation.json"), `${JSON.stringify(plan, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "verification-remediation.md"), formatVerificationRemediationPlan(plan), "utf8");
  await appendFile(path.join(taskDir, "verification-remediation-ledger.jsonl"), `${JSON.stringify({ at: plan.updatedAt, kind: "plan_persisted", status: plan.status, failedChecks: plan.failedChecks.length, categories: remediationCategoryCounts(plan.failedChecks), openNextActions: plan.nextActionRecords.filter(action => action.status === "open").length })}\n`, "utf8");
}

function normalizeVerificationRemediationPlan(value: Partial<VerificationRemediationPlan> | undefined): VerificationRemediationPlan | undefined {
  if (!value || typeof value.taskId !== "string" || typeof value.generatedAt !== "string" || typeof value.updatedAt !== "string") return undefined;
  const maxAttempts = typeof value.maxAttempts === "number" && Number.isFinite(value.maxAttempts) ? Math.max(1, Math.min(10, Math.round(value.maxAttempts))) : 3;
  const failedChecks = Array.isArray(value.failedChecks) ? value.failedChecks.map(normalizeRemediationFailedCheck).filter((check): check is VerificationRemediationFailedCheck => !!check).slice(0, 8) : [];
  const attempts = Array.isArray(value.attempts) ? value.attempts.map(normalizeRemediationAttempt).filter((attempt): attempt is VerificationRemediationAttempt => !!attempt).slice(0, maxAttempts) : [];
  const nextActionRecords = Array.isArray(value.nextActionRecords) ? value.nextActionRecords.map(normalizeRemediationNextAction).filter((action): action is VerificationRemediationNextAction => !!action).slice(0, 16) : [];
  const status = isVerificationRemediationStatus(value.status) ? value.status : deriveRemediationStatus(failedChecks, attempts, maxAttempts);
  return {
    taskId: value.taskId,
    status,
    generatedAt: value.generatedAt,
    updatedAt: value.updatedAt,
    generatedFrom: typeof value.generatedFrom === "string" ? value.generatedFrom : undefined,
    maxAttempts,
    summary: typeof value.summary === "string" && value.summary.trim() ? value.summary : summarizeVerificationRemediation(failedChecks, attempts, maxAttempts),
    failedChecks,
    nextActions: normalizeStringArray(value.nextActions).length > 0 ? normalizeStringArray(value.nextActions).slice(0, 12) : buildRemediationNextActions(nextActionRecords),
    nextActionRecords,
    stopConditions: normalizeStringArray(value.stopConditions).slice(0, 8),
    attempts,
  };
}

function normalizeRemediationFailedCheck(value: unknown): VerificationRemediationFailedCheck | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.timestamp !== "string" || typeof record.toolName !== "string") return undefined;
  return {
    id: record.id,
    timestamp: record.timestamp,
    toolName: record.toolName,
    command: typeof record.command === "string" && record.command.trim() ? record.command.trim() : undefined,
    summary: typeof record.summary === "string" && record.summary.trim() ? record.summary.trim() : undefined,
    classification: normalizeVerificationFailureClassification(record.classification),
  };
}

function normalizeRemediationAttempt(value: unknown): VerificationRemediationAttempt | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !isVerificationRemediationAttemptStatus(record.status) || typeof record.startedAt !== "string" || typeof record.updatedAt !== "string") return undefined;
  return {
    id: record.id,
    status: record.status,
    startedAt: record.startedAt,
    updatedAt: record.updatedAt,
    failedCheckIds: normalizeStringArray(record.failedCheckIds).slice(0, 8),
    commands: normalizeStringArray(record.commands).slice(0, 8),
    note: typeof record.note === "string" && record.note.trim() ? record.note.trim() : undefined,
    evidence: typeof record.evidence === "string" && record.evidence.trim() ? record.evidence.trim() : undefined,
  };
}

function toRemediationFailedCheck(check: VerificationCheck, allChecks: VerificationCheck[]): VerificationRemediationFailedCheck {
  return {
    id: check.id,
    timestamp: check.timestamp,
    toolName: check.toolName,
    command: check.command,
    summary: check.summary,
    classification: classifyVerificationFailure(check, allChecks),
  };
}

function deriveRemediationStatus(failedChecks: VerificationRemediationFailedCheck[], attempts: VerificationRemediationAttempt[], maxAttempts: number): VerificationRemediationStatus {
  if (failedChecks.length === 0) return attempts.some(attempt => attempt.status === "passed") ? "resolved" : "not_required";
  if (attempts.some(attempt => attempt.status === "in_progress")) return "active";
  if (attempts.some(attempt => attempt.status === "passed")) return "resolved";
  if (attempts.length >= maxAttempts || attempts.some(attempt => attempt.status === "stopped")) return "stopped";
  return "planned";
}

function normalizeRemediationNextAction(value: unknown): VerificationRemediationNextAction | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !isVerificationRemediationNextActionKind(record.kind) || typeof record.text !== "string" || !isVerificationRemediationNextActionStatus(record.status) || typeof record.createdAt !== "string" || typeof record.source !== "string") return undefined;
  return {
    id: record.id,
    kind: record.kind,
    text: record.text,
    status: record.status,
    createdAt: record.createdAt,
    source: record.source,
    checkId: typeof record.checkId === "string" ? record.checkId : undefined,
    command: typeof record.command === "string" && record.command.trim() ? record.command.trim() : undefined,
    requiresConfirmation: record.requiresConfirmation === true,
  };
}

function normalizeVerificationFailureClassification(value: unknown): VerificationFailureClassification | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (!isVerificationFailureCategory(record.category) || !isVerificationFailureConfidence(record.confidence) || typeof record.evidence !== "string" || typeof record.suspectedCause !== "string" || typeof record.nextAction !== "string" || typeof record.source !== "string") return undefined;
  return {
    category: record.category,
    confidence: record.confidence,
    evidence: record.evidence,
    signals: normalizeStringArray(record.signals).slice(0, 8),
    impactedFiles: normalizeStringArray(record.impactedFiles).slice(0, 12),
    suspectedCause: record.suspectedCause,
    nextAction: record.nextAction,
    retryable: record.retryable !== false,
    source: record.source,
    requiresOptInCommand: typeof record.requiresOptInCommand === "string" && record.requiresOptInCommand.trim() ? record.requiresOptInCommand.trim() : undefined,
    stopReason: typeof record.stopReason === "string" && record.stopReason.trim() ? record.stopReason.trim() : undefined,
  };
}

function classifyVerificationFailure(check: VerificationCheck, allChecks: VerificationCheck[]): VerificationFailureClassification {
  const command = check.command || check.toolName;
  const summary = check.summary || "";
  const text = `${command}\n${summary}`;
  const normalized = text.toLowerCase();
  const laterPass = allChecks.some(candidate => candidate.success && candidate.timestamp > check.timestamp && commandMatchesRecordedCheck(candidate, check));
  const category: VerificationFailureCategory = laterPass ? "flaky" :
    /command not found|not recognized|could not find executable|no such file or directory|enoent/.test(normalized) ? "command_unavailable" :
    /timed? out|timeout|stream stalled|hang|hung/.test(normalized) ? "timeout" :
    /unauthori[sz]ed|forbidden|permission denied|http_?40[13]|authentication|auth required|network|econnrefused|enotfound|no web search provider/.test(normalized) ? "external_blocker" :
    /\b(tsc|typecheck|ts\d{3,5}|bun --check|type error)\b/.test(normalized) ? "typecheck" :
    /\b(eslint|ruff|clippy|golangci-lint|lint|format)\b/.test(normalized) ? "lint" :
    /\b(test|pytest|cargo test|go test|dotnet test|expect\(|expected|received|assertion|\bfail\b)\b/.test(normalized) ? "test" :
    /\b(build|compile|bundl(e|er)|vite|webpack)\b/.test(normalized) ? "build" :
    "unknown";
  const retryable = category !== "command_unavailable" && category !== "external_blocker" && category !== "environment" && category !== "flaky";
  return {
    category,
    confidence: category === "unknown" ? "low" : laterPass ? "medium" : "high",
    evidence: summarizeUnknown(summary || command, 360),
    signals: collectVerificationFailureSignals(summary || command),
    impactedFiles: extractVerificationFailureFiles(summary),
    suspectedCause: suspectedCauseForFailureCategory(category),
    nextAction: nextActionForFailureCategory(category, command),
    retryable,
    source: "verification-classifier/v1",
    requiresOptInCommand: command,
    stopReason: retryable ? undefined : stopReasonForFailureCategory(category),
  };
}

function commandMatchesRecordedCheck(left: VerificationCheck, right: VerificationCheck): boolean {
  const leftCommand = (left.command || left.toolName).toLowerCase();
  const rightCommand = (right.command || right.toolName).toLowerCase();
  return leftCommand === rightCommand || leftCommand.includes(rightCommand) || rightCommand.includes(leftCommand);
}

function buildRemediationNextActionRecords(failedChecks: VerificationRemediationFailedCheck[], now: string): VerificationRemediationNextAction[] {
  const actions: VerificationRemediationNextAction[] = [];
  for (const check of failedChecks) {
    const classification = check.classification;
    const source = classification?.source || "verification-classifier/v1";
    actions.push({
      id: `VA${actions.length + 1}`,
      kind: "inspect",
      text: classification ? classification.nextAction : `Inspect failed check ${check.id} before editing.`,
      status: "open",
      createdAt: now,
      source,
      checkId: check.id,
    });
    if (classification?.stopReason) {
      actions.push({
        id: `VA${actions.length + 1}`,
        kind: "ask_user",
        text: classification.stopReason,
        status: "open",
        createdAt: now,
        source,
        checkId: check.id,
        requiresConfirmation: true,
      });
    }
    if (check.command) {
      actions.push({
        id: `VA${actions.length + 1}`,
        kind: "rerun",
        text: `After an explicit fix or user-approved retry, rerun: ${check.command}`,
        status: "open",
        createdAt: now,
        source,
        checkId: check.id,
        command: check.command,
        requiresConfirmation: true,
      });
    }
  }
  if (failedChecks.length > 0) {
    actions.push({
      id: `VA${actions.length + 1}`,
      kind: "record",
      text: "Record the remediation attempt with /verify:remediate --pass, --fail, or --stop and include evidence.",
      status: "open",
      createdAt: now,
      source: "verification-classifier/v1",
      requiresConfirmation: false,
    });
  }
  return actions.slice(0, 16);
}

function buildRemediationNextActions(actions: VerificationRemediationNextAction[]): string[] {
  return dedupeStrings(actions.filter(action => action.status === "open").map(action => action.command ? `${action.text} (opt-in command; not auto-run)` : action.text)).slice(0, 12);
}

function buildRemediationStopConditions(maxAttempts: number): string[] {
  return [
    `Stop after ${maxAttempts} failed remediation attempt(s).`,
    "Stop when the same failure signature repeats after a retry; re-read evidence and record the wrong assumption before continuing.",
    "Stop if the next action requires destructive commands, dependency installation, broad unrelated edits, or architecture changes.",
    "Stop if the failure is flaky, external-auth, or environment-only; record evidence instead of guessing.",
    "Stop when the failed command passes and mark the attempt with evidence.",
  ];
}

function summarizeVerificationRemediation(failedChecks: VerificationRemediationFailedCheck[], attempts: VerificationRemediationAttempt[], maxAttempts: number): string {
  if (failedChecks.length === 0) return attempts.some(attempt => attempt.status === "passed") ? "Verification remediation resolved." : "No failed verification checks require remediation.";
  const categories = remediationCategoryCounts(failedChecks);
  return `${failedChecks.length} failed check(s), ${attempts.length}/${maxAttempts} remediation attempt(s) recorded${categories.length > 0 ? `; categories ${categories.join(", ")}` : ""}.`;
}

function formatRemediationFailedCheck(check: VerificationRemediationFailedCheck): string {
  const classification = check.classification ? ` [${check.classification.category}/${check.classification.confidence}]` : "";
  return `- ${check.id}${classification}: ${check.command || check.toolName}${check.summary ? ` - ${summarizeUnknown(check.summary, 180)}` : ""}`;
}

function formatRemediationClassification(check: VerificationRemediationFailedCheck): string {
  const classification = check.classification;
  if (!classification) return `- ${check.id}: no classification recorded.`;
  return `- ${check.id} [${classification.category}/${classification.confidence}] cause: ${classification.suspectedCause}; files: ${classification.impactedFiles.join(", ") || "none inferred"}; signals: ${classification.signals.join(" | ") || "none"}; next: ${classification.nextAction}${classification.stopReason ? `; stop: ${classification.stopReason}` : ""}`;
}

function formatRemediationNextAction(action: VerificationRemediationNextAction): string {
  return `- ${action.id} [${action.status}/${action.kind}] ${action.text}${action.command ? ` command: ${action.command}` : ""}${action.requiresConfirmation ? " (requires confirmation)" : ""}`;
}

function formatRemediationAttempt(attempt: VerificationRemediationAttempt): string {
  return `- ${attempt.id} [${attempt.status}] ${attempt.commands.join(", ") || "no command"}${attempt.note ? ` - ${attempt.note}` : ""}${attempt.evidence ? `; evidence: ${attempt.evidence}` : ""}`;
}

function remediationCategoryCounts(failedChecks: VerificationRemediationFailedCheck[]): string[] {
  const counts = new Map<VerificationFailureCategory, number>();
  for (const check of failedChecks) {
    const category = check.classification?.category || "unknown";
    counts.set(category, (counts.get(category) || 0) + 1);
  }
  return [...counts.entries()].map(([category, count]) => `${category}:${count}`);
}

function collectVerificationFailureSignals(text: string): string[] {
  return dedupeStrings(text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => /\b(error|fail|failed|timeout|timed out|not found|permission|expected|received|assert|ts\d{3,5}|enoent|econnrefused|forbidden|unauthori[sz]ed)\b/i.test(line))
    .map(line => summarizeUnknown(line, 180)))
    .slice(0, 8);
}

function extractVerificationFailureFiles(text: string): string[] {
  const files = new Set<string>();
  for (const match of text.matchAll(/([A-Za-z0-9_.:\/\\-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py|rs|go|cs|java|kt|swift|cpp|c|h|json|md))(?:[:#](\d+))?/g)) {
    const file = match[1]?.replaceAll("\\", "/");
    if (file) files.add(match[2] ? `${file}:${match[2]}` : file);
  }
  return [...files].slice(0, 12);
}

function suspectedCauseForFailureCategory(category: VerificationFailureCategory): string {
  if (category === "typecheck") return "Typed source or generated API mismatch.";
  if (category === "test") return "Behavioral regression or failing assertion in the tested path.";
  if (category === "lint") return "Style, static analysis, or formatter rule violation.";
  if (category === "build") return "Build/compile pipeline failure.";
  if (category === "command_unavailable") return "Verification command or toolchain is missing/unavailable.";
  if (category === "timeout") return "Verification command hung or exceeded its time budget.";
  if (category === "external_blocker") return "External authorization, network, or provider prerequisite blocked verification.";
  if (category === "flaky") return "A later matching pass or non-deterministic signal suggests the failure may be flaky or already covered.";
  if (category === "coverage_gap") return "Required verification coverage is missing.";
  if (category === "environment") return "Local environment/setup issue.";
  return "Failure category could not be determined from recorded evidence.";
}

function nextActionForFailureCategory(category: VerificationFailureCategory, command: string): string {
  if (category === "typecheck") return "Read the first type error, fix the smallest source/API mismatch, then rerun the recorded typecheck command.";
  if (category === "test") return "Read the failing assertion and stack trace, fix behavior rather than weakening the test, then rerun the recorded test command.";
  if (category === "lint") return "Fix the lint/format finding at its source without suppressing the rule, then rerun the recorded lint command.";
  if (category === "build") return "Inspect build output and fix the smallest compile/config cause before rerunning the build.";
  if (category === "command_unavailable") return `Resolve or replace unavailable verification command '${command}' before editing product code.`;
  if (category === "timeout") return "Inspect the hang/timeout, narrow the command or record a blocker; do not stack blind retries.";
  if (category === "external_blocker") return "Resolve external authorization/network/provider state or record the blocker; do not pretend a source fix can clear it.";
  if (category === "flaky") return "Confirm the latest matching pass covers the failure; rerun once only if the user/agent explicitly wants fresh evidence.";
  if (category === "coverage_gap") return "Select and record the missing verification coverage before finish.";
  if (category === "environment") return "Record the environment prerequisite and fix setup before changing product code.";
  return "Inspect the failed output and affected files before proposing any fix.";
}

function stopReasonForFailureCategory(category: VerificationFailureCategory): string | undefined {
  if (category === "command_unavailable") return "Stop until the missing verification command/toolchain is installed, configured, or explicitly replaced.";
  if (category === "external_blocker") return "Stop until external authorization/network/provider state changes or the user chooses an unblock path.";
  if (category === "flaky") return "Do not retry blindly; preserve the failed evidence and require fresh opt-in if more proof is needed.";
  return undefined;
}

function findLatestRemediationAttemptIndex(attempts: VerificationRemediationAttempt[]): number {
  const active = attempts.findLastIndex(attempt => attempt.status === "in_progress");
  return active >= 0 ? active : attempts.length - 1;
}

function isVerificationRemediationStatus(value: unknown): value is VerificationRemediationStatus {
  return value === "not_required" || value === "planned" || value === "active" || value === "resolved" || value === "stopped";
}

function isVerificationRemediationAttemptStatus(value: unknown): value is VerificationRemediationAttemptStatus {
  return value === "in_progress" || value === "passed" || value === "failed" || value === "stopped";
}

function isVerificationFailureCategory(value: unknown): value is VerificationFailureCategory {
  return value === "build" || value === "typecheck" || value === "lint" || value === "test" || value === "command_unavailable" || value === "timeout" || value === "environment" || value === "external_blocker" || value === "flaky" || value === "coverage_gap" || value === "unknown";
}

function isVerificationFailureConfidence(value: unknown): value is VerificationFailureConfidence {
  return value === "high" || value === "medium" || value === "low";
}

function isVerificationRemediationNextActionKind(value: unknown): value is VerificationRemediationNextActionKind {
  return value === "inspect" || value === "fix" || value === "rerun" || value === "record" || value === "ask_user" || value === "stop";
}

function isVerificationRemediationNextActionStatus(value: unknown): value is VerificationRemediationNextActionStatus {
  return value === "open" || value === "done" || value === "blocked";
}



export async function refreshVerificationStrategy(root: string, taskId: string): Promise<VerificationStrategy> {
  const detected = await detectVerificationStrategy(root);
  const events = await readTaskEvents(root, taskId);
  const verification = await readVerification(root, taskId);
  const strategy = {
    ...detected,
    policy: buildVerificationPolicy(collectTouchedFiles(root, events), detected.suggestions, verification.checks, detected.updatedAt),
  };
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

  const updatedAt = new Date().toISOString();
  const deduped = dedupeSuggestions(suggestions).map((suggestion, index) => ({ ...suggestion, id: `V${index + 1}` }));
  return {
    suggestions: deduped,
    updatedAt,
    sources,
    policy: buildVerificationPolicy([], deduped, [], updatedAt),
  };
}

export function formatVerificationSuggestions(strategy: VerificationStrategy, max = 8): string {
  const lines = strategy.suggestions.length === 0
    ? ["No verification commands suggested yet."]
    : strategy.suggestions.slice(0, max).map(item =>
      `- ${item.id}: ${item.command} (${item.confidence}, ${item.reason}; ${item.source})`,
    );
  if (strategy.suggestions.length > max) lines.push(`...and ${strategy.suggestions.length - max} more`);
  lines.push("", "Verification policy:", ...formatVerificationPolicyLines(strategy.policy, max));
  return lines.join("\n");
}

export function formatVerificationPolicy(policy: VerificationPolicy, max = 8): string {
  return formatVerificationPolicyLines(policy, max).join("\n");
}

function formatVerificationPolicyLines(policy: VerificationPolicy, max = 8): string[] {
  const lines = [
    `summary: ${policy.summary}`,
    policy.touchedFiles.length > 0 ? `touched files: ${policy.touchedFiles.slice(0, 6).join(", ")}` : "touched files: none inferred",
    "matrix:",
  ];
  if (policy.matrix.length === 0) {
    lines.push("- none");
  } else {
    lines.push(...policy.matrix.slice(0, max).map(item => `- ${item.id} [${item.status}] ${item.category}${item.required ? " required" : " optional"}: ${item.command || "manual review"} (${item.reason})`));
    if (policy.matrix.length > max) lines.push(`...and ${policy.matrix.length - max} more`);
  }
  if (policy.coverageGaps.length > 0) {
    lines.push("coverage gaps:", ...policy.coverageGaps.slice(0, max).map(item => `- ${item}`));
  } else {
    lines.push("coverage gaps: none");
  }
  return lines;
}

function normalizeVerificationPolicy(value: unknown, touchedFiles: string[], suggestions: VerificationSuggestion[], updatedAt: string, checks: VerificationCheck[] = []): VerificationPolicy {
  if (!value || typeof value !== "object") return buildVerificationPolicy(touchedFiles, suggestions, checks, updatedAt);
  const record = value as Record<string, unknown>;
  const matrix = Array.isArray(record.matrix)
    ? record.matrix.map(normalizeVerificationPolicyMatrixItem).filter((item): item is VerificationPolicyMatrixItem => !!item)
    : [];
  const policyTouchedFiles = touchedFiles.length > 0 ? touchedFiles : normalizeStringArray(record.touchedFiles).slice(0, 24);
  const policy = buildVerificationPolicy(policyTouchedFiles, suggestions, checks, typeof record.updatedAt === "string" ? record.updatedAt : updatedAt);
  if (matrix.length === 0 || touchedFiles.length > 0 || checks.length > 0) return policy;
  const coverageGaps = normalizeStringArray(record.coverageGaps).slice(0, 12);
  return {
    updatedAt: policy.updatedAt,
    summary: typeof record.summary === "string" && record.summary.trim() ? record.summary.trim() : summarizeVerificationPolicy(matrix, coverageGaps),
    touchedFiles: policyTouchedFiles,
    matrix,
    coverageGaps,
  };
}

function normalizeVerificationPolicyMatrixItem(value: unknown): VerificationPolicyMatrixItem | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !isVerificationPolicyCategory(record.category) || !isVerificationPolicyStatus(record.status) || typeof record.reason !== "string" || typeof record.source !== "string") return undefined;
  return {
    id: record.id,
    category: record.category,
    required: record.required === true,
    command: typeof record.command === "string" && record.command.trim() ? record.command.trim() : undefined,
    reason: record.reason,
    source: record.source,
    touchedFiles: normalizeStringArray(record.touchedFiles).slice(0, 12),
    satisfiedBy: normalizeStringArray(record.satisfiedBy).slice(0, 8),
    status: record.status,
  };
}

function buildVerificationPolicy(touchedFiles: string[], suggestions: VerificationSuggestion[], checks: VerificationCheck[], updatedAt: string): VerificationPolicy {
  const files = dedupeStrings(touchedFiles).slice(0, 24);
  const categories = inferVerificationPolicyCategories(files);
  const matrix: VerificationPolicyMatrixItem[] = [];
  for (const category of categories) {
    const suggestion = selectVerificationSuggestionForCategory(category, suggestions);
    const categoryFiles = files.filter(file => categorizeTouchedFile(file) === category);
    const satisfiedBy = suggestion ? checks.filter(check => check.success && commandMatchesSuggestion(check.command || check.toolName, suggestion)).map(check => check.command || check.toolName) : [];
    const required = category !== "docs" && category !== "other";
    const status: VerificationPolicyStatus = suggestion ? satisfiedBy.length > 0 ? "covered" : "missing" : required ? "missing" : "manual";
    matrix.push({
      id: `VP${matrix.length + 1}`,
      category,
      required,
      command: suggestion?.command,
      reason: buildVerificationPolicyReason(category, categoryFiles, suggestion),
      source: suggestion?.source || "touched files",
      touchedFiles: categoryFiles.slice(0, 12),
      satisfiedBy: dedupeStrings(satisfiedBy),
      status,
    });
  }
  if (matrix.length === 0 && suggestions.length > 0) {
    const suggestion = suggestions.find(item => item.confidence === "high") || suggestions[0];
    if (suggestion) {
      const satisfiedBy = checks.filter(check => check.success && commandMatchesSuggestion(check.command || check.toolName, suggestion)).map(check => check.command || check.toolName);
      matrix.push({
        id: "VP1",
        category: "workflow",
        required: true,
        command: suggestion.command,
        reason: "No touched files were inferred; use the strongest project-level verification command before finishing.",
        source: suggestion.source,
        touchedFiles: [],
        satisfiedBy: dedupeStrings(satisfiedBy),
        status: satisfiedBy.length > 0 ? "covered" : "missing",
      });
    }
  }
  const coverageGaps = matrix
    .filter(item => item.required && item.status === "missing")
    .map(item => item.command ? `Run or record ${item.command} for ${item.category} changes.` : `Select and record verification for ${item.category} changes.`);
  return {
    updatedAt,
    summary: summarizeVerificationPolicy(matrix, coverageGaps),
    touchedFiles: files,
    matrix,
    coverageGaps,
  };
}

function inferVerificationPolicyCategories(touchedFiles: string[]): VerificationPolicyCategory[] {
  return dedupeStrings(touchedFiles.map(categorizeTouchedFile)).filter(isVerificationPolicyCategory);
}

function categorizeTouchedFile(file: string): VerificationPolicyCategory {
  const normalized = file.replaceAll("\\", "/").toLowerCase();
  if (/^(src|lib|app|server|client)\//.test(normalized) || /\.(ts|tsx|js|jsx|mjs|cjs|py|rs|go|cs|java|kt|swift|cpp|c|h)$/.test(normalized)) return "source";
  if (/^(tests?|spec|__tests__)\//.test(normalized) || /\.(test|spec)\.[tj]sx?$/.test(normalized)) return "test";
  if (/\.(md|mdx|rst|txt)$/.test(normalized) || normalized.startsWith("docs/")) return "docs";
  if (/package\.json$|bun\.lock|pnpm-lock\.yaml|yarn\.lock|package-lock\.json$/.test(normalized)) return "package";
  if (/\.(json|toml|ya?ml|ini|cfg)$/.test(normalized)) return "config";
  if (normalized.startsWith(".project-flow/") || normalized.includes("workflow")) return "workflow";
  return "other";
}

function selectVerificationSuggestionForCategory(category: VerificationPolicyCategory, suggestions: VerificationSuggestion[]): VerificationSuggestion | undefined {
  const test = suggestions.find(item => /\b(test|pytest|cargo test|go test|dotnet test)\b/i.test(item.command));
  const check = suggestions.find(item => /\b(check|typecheck|lint|doctor|build)\b/i.test(item.command));
  if (category === "source") return check || test || suggestions[0];
  if (category === "test") return test || check || suggestions[0];
  if (category === "package" || category === "config") return check || test || suggestions[0];
  if (category === "workflow") return check || test || suggestions[0];
  return undefined;
}

function buildVerificationPolicyReason(category: VerificationPolicyCategory, files: string[], suggestion?: VerificationSuggestion): string {
  const target = files.length > 0 ? `${files.length} touched ${category} file(s)` : `touched ${category} files`;
  return suggestion ? `${target}; ${suggestion.reason}` : `${target}; manual review is safer than guessing a command.`;
}

function commandMatchesSuggestion(command: string | undefined, suggestion: VerificationSuggestion): boolean {
  if (!command) return false;
  const normalize = (value: string) => value.toLowerCase().replace(/^bun run\s+/, "").replace(/^npm run\s+/, "").trim();
  return normalize(command) === normalize(suggestion.command) || command.toLowerCase().includes(suggestion.command.toLowerCase()) || suggestion.command.toLowerCase().includes(command.toLowerCase());
}

function summarizeVerificationPolicy(matrix: VerificationPolicyMatrixItem[], coverageGaps: string[]): string {
  if (matrix.length === 0) return "No verification policy rows generated.";
  if (coverageGaps.length === 0) return `Verification policy covered ${matrix.length}/${matrix.length} row(s).`;
  return `Verification policy has ${coverageGaps.length} coverage gap(s) across ${matrix.length} row(s).`;
}

function isVerificationPolicyCategory(value: unknown): value is VerificationPolicyCategory {
  return value === "source" || value === "test" || value === "docs" || value === "config" || value === "package" || value === "workflow" || value === "other";
}

function isVerificationPolicyStatus(value: unknown): value is VerificationPolicyStatus {
  return value === "covered" || value === "missing" || value === "manual";
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

export async function readPrdReview(root: string, taskId: string): Promise<PrdReviewState | undefined> {
  const reviewPath = path.join(getProjectPaths(root).tasksDir, taskId, "prd-review.json");
  if (!(await pathExists(reviewPath))) return undefined;
  try {
    return normalizePrdReviewState(JSON.parse(await readFile(reviewPath, "utf8")) as Partial<PrdReviewState>);
  } catch {
    return undefined;
  }
}

export async function writePrdReview(root: string, task: TaskState, reason = "manual"): Promise<PrdReviewState> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  const currentTask = await loadTask(root, task.id) || task;
  const review = await buildPrdReviewState(root, currentTask, reason);
  await writeFile(path.join(taskDir, "prd-review.json"), `${JSON.stringify(review, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "prd-review.md"), formatPrdReview(currentTask, review), "utf8");
  return review;
}

export function formatPrdReviewSummary(review: PrdReviewState, max = 8): string {
  const coverage = review.planReview.coverage.slice(0, max).map(item => `${item.acceptanceId}:${item.status}${item.planStepIds.length > 0 ? `(${item.planStepIds.join(",")})` : ""}`);
  const actions = review.promotion.nextActions.slice(0, max).map(item => `- ${item}`);
  const decisions = review.decisions.slice(-max).map(item => `- ${item.id}: ${item.decision} — ${item.rationale}`);
  return [
    `stage: ${review.stage}`,
    `readiness: ${review.promotion.ready ? "ready-to-implement" : "blocked"}`,
    `completeness: ${review.completeness.blockers.length} blocker(s), ${review.completeness.warnings.length} warning(s), ${review.completeness.passes.length} pass(es)`,
    `plan review: ${review.planReview.blockers.length} blocker(s), ${review.planReview.warnings.length} warning(s), ${review.planReview.passes.length} pass(es)`,
    coverage.length > 0 ? `acceptance coverage: ${coverage.join("; ")}` : "acceptance coverage: none recorded",
    decisions.length > 0 ? `decisions: ${review.decisions.length}\ndecision log:\n${decisions.join("\n")}` : "decisions: 0",
    actions.length > 0 ? `next actions:\n${actions.join("\n")}` : undefined,
  ].filter(line => line !== undefined).join("\n");
}

function formatPrdReview(task: TaskState, review: PrdReviewState): string {
  return [
    "# PRD Review",
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Stage: ${review.stage}`,
    `Ready: ${review.promotion.ready ? "yes" : "no"}`,
    `Generated: ${review.updatedAt}`,
    review.generatedFrom ? `Reason: ${review.generatedFrom}` : undefined,
    "",
    "## PRD Snapshot",
    "",
    "### Goal",
    "",
    review.prd.goal || "Not recorded.",
    "",
    "### Scope",
    "",
    formatReviewList(review.prd.scope, "No explicit scope recorded."),
    "",
    "### Actors / Users",
    "",
    formatReviewList(review.prd.users, "No explicit actors or users recorded."),
    "",
    "### Non-goals",
    "",
    formatReviewList(review.prd.nonGoals, "No explicit non-goals recorded."),
    "",
    "### Constraints",
    "",
    formatReviewList(review.prd.constraints, "No explicit constraints recorded."),
    "",
    "### Acceptance Criteria",
    "",
    formatReviewList(review.prd.acceptanceCriteria, "No acceptance criteria recorded."),
    "",
    "### Verification",
    "",
    formatReviewList(review.prd.verification, "No explicit verification expectations recorded."),
    "",
    "### Risks",
    "",
    formatReviewList(review.prd.risks, "No explicit risks recorded."),
    "",
    "### Dependencies",
    "",
    formatReviewList(review.prd.dependencies, "No explicit dependencies recorded."),
    "",
    "### Open Questions",
    "",
    formatReviewList(review.prd.openQuestions, "No meaningful open questions recorded."),
    "",
    "## Decisions",
    "",
    review.decisions.length === 0 ? "No decision records captured yet." : review.decisions.map(formatPrdDecision).join("\n"),
    "",
    "## Completeness Checks",
    "",
    "### Blockers",
    "",
    formatReviewIssues(review.completeness.blockers, "No PRD completeness blockers."),
    "",
    "### Warnings",
    "",
    formatReviewIssues(review.completeness.warnings, "No PRD completeness warnings."),
    "",
    "### Passes",
    "",
    formatReviewList(review.completeness.passes, "No PRD completeness passes recorded."),
    "",
    "## Plan Quality Checks",
    "",
    "### Acceptance-To-Plan Coverage",
    "",
    review.planReview.coverage.length === 0 ? "No acceptance coverage rows recorded." : review.planReview.coverage.map(formatAcceptancePlanCoverage).join("\n"),
    "",
    "### Blockers",
    "",
    formatReviewIssues(review.planReview.blockers, "No plan quality blockers."),
    "",
    "### Warnings",
    "",
    formatReviewIssues(review.planReview.warnings, "No plan quality warnings."),
    "",
    "### Passes",
    "",
    formatReviewList(review.planReview.passes, "No plan quality passes recorded."),
    "",
    "## Promotion Gate",
    "",
    `Ready: ${review.promotion.ready ? "yes" : "no"}`,
    review.promotion.promotedAt ? `Promoted: ${review.promotion.promotedAt}` : undefined,
    "",
    "### Blockers",
    "",
    formatReviewIssues(review.promotion.blockers, "No promotion blockers."),
    "",
    "### Warnings",
    "",
    formatReviewIssues(review.promotion.warnings, "No promotion warnings."),
    "",
    "### Next Actions",
    "",
    formatReviewList(review.promotion.nextActions, "No promotion next actions."),
    "",
  ].filter(line => line !== undefined).join("\n");
}

interface PrdReviewBuildInputs {
  acceptance?: AcceptanceState;
  plan?: PlanState;
  verificationStrategy?: VerificationStrategy;
  clarification?: ClarificationState;
  research?: ResearchState;
}

async function buildPrdReviewState(root: string, task: TaskState, reason: string, inputs: PrdReviewBuildInputs = {}): Promise<PrdReviewState> {
  const [acceptance, plan, verificationStrategy, clarification, research] = await Promise.all([
    inputs.acceptance ? Promise.resolve(inputs.acceptance) : readAcceptance(root, task.id),
    inputs.plan ? Promise.resolve(inputs.plan) : readPlan(root, task.id),
    inputs.verificationStrategy ? Promise.resolve(inputs.verificationStrategy) : readVerificationStrategy(root, task.id),
    inputs.clarification ? Promise.resolve(inputs.clarification) : readTaskClarification(root, task.id),
    inputs.research ? Promise.resolve(inputs.research) : readTaskResearch(root, task.id),
  ]);
  const now = new Date().toISOString();
  const snapshot = buildPrdSnapshot(task, clarification);
  const decisions = (research?.decisionRecords || []).map(decision => ({
    id: decision.id,
    decision: decision.decision,
    rationale: decision.rationale,
    alternatives: decision.alternatives,
    sourcePackIds: decision.sourcePackIds,
    createdAt: decision.createdAt,
  }));
  const completeness = buildPrdCompleteness(snapshot, clarification);
  const planReview = buildPrdPlanReview(snapshot, acceptance, plan, verificationStrategy);
  const promotion = buildPrdPromotionGate(task, completeness, planReview, research, decisions, now);
  return {
    taskId: task.id,
    updatedAt: now,
    generatedFrom: reason,
    stage: derivePrdWorkflowStage(task, clarification, completeness.blockers, planReview.blockers, promotion.ready),
    prd: snapshot,
    decisions,
    completeness,
    planReview,
    promotion,
  };
}

function buildPrdSnapshot(task: TaskState, clarification?: ClarificationState): PrdSnapshot {
  const prd = extractPrd(task.initialPrompt);
  const draft = clarification?.draft;
  return {
    goal: draft?.goal || prd.goal,
    scope: draft && draft.scope.length > 0 ? draft.scope : inferPrdList(task.initialPrompt, /\b(scope|in scope|includes?|deliverables?)\b|范围|包含|只做|交付/i),
    users: draft && draft.users.length > 0 ? draft.users : inferPrdList(task.initialPrompt, /\b(users?|actors?|maintainers?|operators?|admins?)\b|用户|角色|维护者|使用者/i),
    nonGoals: draft && draft.nonGoals.length > 0 ? draft.nonGoals : inferPrdList(task.initialPrompt, /\b(non[- ]?goals?|out of scope|not included|do not)\b|非目标|不包括|不做|不要/i),
    constraints: draft && draft.constraints.length > 0 ? draft.constraints : prd.constraints,
    acceptanceCriteria: draft && draft.acceptanceCriteria.length > 0 ? draft.acceptanceCriteria : prd.acceptanceCriteria,
    verification: draft && draft.verification.length > 0 ? draft.verification : inferPrdList(task.initialPrompt, /\b(verification|verify|test|check|lint|qa)\b|验证|测试|检查/i),
    risks: draft && draft.risks.length > 0 ? draft.risks : inferPrdList(task.initialPrompt, /\b(risks?|failure|regression|migration|compatibility)\b|风险|失败|回归|迁移|兼容/i),
    dependencies: inferPrdList(task.initialPrompt, /\b(dependencies?|depends on|requires?|blocked by|prerequisites?)\b|依赖|前置|需要/i),
    openQuestions: (draft && draft.openQuestions.length > 0 ? draft.openQuestions : prd.openQuestions).filter(isMeaningfulOpenQuestion),
  };
}

function buildPrdCompleteness(prd: PrdSnapshot, clarification?: ClarificationState): PrdReviewState["completeness"] {
  const blockers: PrdReviewIssue[] = [];
  const warnings: PrdReviewIssue[] = [];
  const passes: string[] = [];
  if (!prd.goal.trim()) {
    addPrdReviewIssue(blockers, "prd", "blocker", "PRD goal is missing.", "Capture a concrete goal with /prd:refine --axes goal.");
  } else {
    passes.push("PRD goal recorded.");
  }
  if (prd.acceptanceCriteria.length === 0 || prd.acceptanceCriteria.every(isDefaultAcceptanceCriterion)) {
    addPrdReviewIssue(blockers, "acceptance", "blocker", "Acceptance criteria are missing or only default fallback criteria.", "Add task-specific acceptance criteria before planning.");
  } else {
    passes.push(`Acceptance criteria recorded: ${prd.acceptanceCriteria.length}.`);
  }
  if (prd.openQuestions.length > 0) {
    addPrdReviewIssue(blockers, "prd", "blocker", `${prd.openQuestions.length} meaningful PRD question(s) remain open.`, `Resolve: ${prd.openQuestions[0]}`);
  } else {
    passes.push("No meaningful PRD open questions remain.");
  }
  if (clarification?.enabled && clarification.required && clarification.status === "collecting") {
    addPrdReviewIssue(blockers, "prd", "blocker", "Required PRD clarification is still collecting.", "Answer or explicitly skip the current clarification question.");
  } else if (clarification?.enabled) {
    passes.push(`Clarification state is ${clarification.status}.`);
  }
  if (prd.scope.length === 0) addPrdReviewIssue(warnings, "prd", "warning", "Scope is not explicit.", "Record in-scope boundaries with /prd:refine --axes scope.");
  if (prd.users.length === 0) addPrdReviewIssue(warnings, "prd", "warning", "Actors/users are not explicit.", "Record affected actors or maintainers with /prd:refine --axes users.");
  if (prd.nonGoals.length === 0) addPrdReviewIssue(warnings, "prd", "warning", "Non-goals are not explicit.", "Capture out-of-scope behavior to prevent accidental scope expansion.");
  if (prd.verification.length === 0) addPrdReviewIssue(warnings, "verification", "warning", "PRD does not name verification expectations.", "Add expected checks or manual verification criteria.");
  if (prd.risks.length === 0) addPrdReviewIssue(warnings, "prd", "warning", "Risks are not explicit.", "Record regression, migration, or compatibility risks if any.");
  if (prd.dependencies.length === 0) addPrdReviewIssue(warnings, "prd", "warning", "Dependencies are not explicit.", "Record prerequisites or state that none are known.");
  return { blockers, warnings, passes };
}

function buildPrdPlanReview(prd: PrdSnapshot, acceptance: AcceptanceState, plan: PlanState, strategy: VerificationStrategy): PrdReviewState["planReview"] {
  const blockers: PrdReviewIssue[] = [];
  const warnings: PrdReviewIssue[] = [];
  const passes: string[] = [];
  const coverage = acceptance.items.map(item => buildAcceptanceCoverageRow(item, plan));
  if (plan.steps.length === 0) {
    addPrdReviewIssue(blockers, "plan", "blocker", "Implementation plan has no steps.", "Create a plan before promoting the task.");
  } else {
    passes.push(`Plan steps recorded: ${plan.steps.length}.`);
  }
  const blockedSteps = plan.steps.filter(step => step.status === "blocked");
  if (blockedSteps.length > 0) {
    addPrdReviewIssue(blockers, "plan", "blocker", `${blockedSteps.length} plan step(s) are blocked.`, `Unblock ${blockedSteps[0]?.id}: ${blockedSteps[0]?.text}`, blockedSteps.map(step => step.id));
  }
  const missingCoverage = coverage.filter(item => item.status === "missing");
  const genericCoverage = coverage.filter(item => item.status === "generic");
  if (missingCoverage.length > 0) {
    addPrdReviewIssue(blockers, "plan", "blocker", `${missingCoverage.length} acceptance item(s) have no plan coverage.`, `Add a plan step for ${missingCoverage[0]?.acceptanceId}.`, missingCoverage.map(item => item.acceptanceId));
  }
  if (genericCoverage.length > 0) {
    addPrdReviewIssue(warnings, "plan", "warning", `${genericCoverage.length} acceptance item(s) are covered only by generic plan steps.`, `Tighten the plan for ${genericCoverage[0]?.acceptanceId}.`, genericCoverage.map(item => item.acceptanceId));
  }
  if (coverage.length > 0 && missingCoverage.length === 0) {
    passes.push(`Acceptance-to-plan coverage recorded: ${coverage.length}/${coverage.length}.`);
  }
  const hasVerificationPlan = plan.steps.some(step => /\b(verify|verification|test|check|lint)\b|验证|测试|检查/i.test(`${step.text} ${step.evidence || ""}`));
  if (!hasVerificationPlan && prd.verification.length === 0 && strategy.suggestions.length === 0) {
    addPrdReviewIssue(blockers, "verification", "blocker", "Plan has no verification coverage.", "Add a verification plan step or record an expected check.");
  } else {
    passes.push("Verification coverage is represented by plan, PRD, or suggested checks.");
  }
  if (strategy.policy.coverageGaps.length > 0) {
    addPrdReviewIssue(warnings, "verification", "warning", `${strategy.policy.coverageGaps.length} verification policy coverage gap(s) remain.`, strategy.policy.coverageGaps[0] || "Review verification policy coverage.");
  }
  return { coverage, blockers, warnings, passes };
}

function buildPrdPromotionGate(
  task: TaskState,
  completeness: PrdReviewState["completeness"],
  planReview: PrdReviewState["planReview"],
  research: ResearchState | undefined,
  decisions: PrdDecisionEntry[],
  now: string,
): PrdReviewState["promotion"] {
  const blockers = [...completeness.blockers, ...planReview.blockers];
  const warnings = [...completeness.warnings, ...planReview.warnings];
  if (decisions.length === 0) {
    addPrdReviewIssue(warnings, "decision", "warning", "No decision records are captured yet.", "Record important tradeoffs with /research:decision when a choice affects implementation.");
  }
  const openResearchQuestions = (research?.questions || []).filter(question => question.status === "open" || question.status === "blocked");
  const conflictingFindings = (research?.findingRecords || []).filter(finding => finding.status === "conflicting");
  if (openResearchQuestions.length > 0) {
    addPrdReviewIssue(blockers, "research", "blocker", `${openResearchQuestions.length} research question(s) remain open or blocked.`, `Answer or block ${openResearchQuestions[0]?.id}: ${openResearchQuestions[0]?.text}`, openResearchQuestions.map(question => question.id));
  }
  if (conflictingFindings.length > 0) {
    addPrdReviewIssue(blockers, "research", "blocker", `${conflictingFindings.length} conflicting research finding(s) remain.`, `Resolve finding ${conflictingFindings[0]?.id}.`, conflictingFindings.map(finding => finding.id));
  }
  if (taskNeedsResearchSourcePack(task)) {
    const reviewed = (research?.sourcePacks || []).filter(pack => pack.reviewStatus === "reviewed");
    if (reviewed.length === 0) {
      addPrdReviewIssue(warnings, "research", "warning", "No reviewed research source pack recorded for upstream/parity work.", "Review a draft source or add reviewed source evidence before final review.");
    }
  }
  const ready = blockers.length === 0;
  const nextActions = dedupeStrings([...blockers, ...warnings].map(issue => issue.nextAction)).slice(0, 12);
  return { ready, blockers, warnings, nextActions, promotedAt: ready ? now : undefined };
}

function buildAcceptanceCoverageRow(item: AcceptanceItem, plan: PlanState): AcceptancePlanCoverage {
  const specific = plan.steps.filter(step => planStepMatchesAcceptance(step, item));
  if (specific.length > 0) {
    return { acceptanceId: item.id, acceptanceText: item.text, planStepIds: specific.map(step => step.id), status: "covered" };
  }
  const generic = plan.steps.filter(step => /\b(implement|build|verify|test|check|acceptance)\b|实现|验证|测试|检查|验收/i.test(`${step.text} ${step.evidence || ""}`));
  if (generic.length > 0) {
    return { acceptanceId: item.id, acceptanceText: item.text, planStepIds: generic.map(step => step.id), status: "generic" };
  }
  return { acceptanceId: item.id, acceptanceText: item.text, planStepIds: [], status: "missing" };
}

function planStepMatchesAcceptance(step: PlanStep, item: AcceptanceItem): boolean {
  const target = `${step.text} ${step.evidence || ""}`.toLowerCase();
  const tokens = extractTokens(item.text).filter(token => token.length >= 4);
  return tokens.length > 0 && tokens.some(token => target.includes(token));
}

function derivePrdWorkflowStage(task: TaskState, clarification: ClarificationState | undefined, completenessBlockers: PrdReviewIssue[], planBlockers: PrdReviewIssue[], promotionReady: boolean): PrdWorkflowStage {
  if (clarification?.enabled && clarification.required && clarification.status === "collecting") return "needs-clarification";
  if (completenessBlockers.length > 0) return "draft";
  if (planBlockers.length > 0) return "plan-review";
  if (promotionReady && (task.phase === "implementing" || task.phase === "verifying" || task.phase === "finished")) return "implementing";
  if (promotionReady) return "ready-to-implement";
  return "ready-to-plan";
}

function addPrdReviewIssue(target: PrdReviewIssue[], category: PrdReviewCategory, severity: Exclude<PrdReviewSeverity, "pass">, message: string, nextAction: string, relatedIds: string[] = []): void {
  target.push({
    id: `${category.toUpperCase()}-${severity === "blocker" ? "B" : "W"}${target.length + 1}`,
    severity,
    category,
    message,
    nextAction,
    relatedIds,
  });
}

function inferPrdList(prompt: string, pattern: RegExp, max = 6): string[] {
  return prompt
    .split(/\r?\n/)
    .map(line => stripListPrefix(line.trim()))
    .filter(line => line.length > 0 && pattern.test(line))
    .slice(0, max);
}

function formatReviewList(items: string[], empty: string): string {
  return items.length === 0 ? empty : items.map(item => `- ${item}`).join("\n");
}

function formatReviewIssues(issues: PrdReviewIssue[], empty: string): string {
  return issues.length === 0 ? empty : issues.map(issue => `- ${issue.id} [${issue.category}/${issue.severity}] ${issue.message} Next: ${issue.nextAction}${issue.relatedIds.length > 0 ? ` Related: ${issue.relatedIds.join(",")}` : ""}`).join("\n");
}

function formatPrdDecision(decision: PrdDecisionEntry): string {
  return `- ${decision.id}: ${decision.decision} — ${decision.rationale}${decision.sourcePackIds.length > 0 ? ` sources: ${decision.sourcePackIds.join(",")}` : ""}${decision.alternatives.length > 0 ? ` alternatives: ${decision.alternatives.join("; ")}` : ""}`;
}

function formatAcceptancePlanCoverage(row: AcceptancePlanCoverage): string {
  return `- ${row.acceptanceId} [${row.status}] ${row.acceptanceText}${row.planStepIds.length > 0 ? ` plan: ${row.planStepIds.join(",")}` : ""}`;
}

function normalizePrdReviewState(value: Partial<PrdReviewState> | undefined): PrdReviewState | undefined {
  if (!value || typeof value.taskId !== "string" || typeof value.updatedAt !== "string" || !value.prd) return undefined;
  return {
    taskId: value.taskId,
    updatedAt: value.updatedAt,
    generatedFrom: typeof value.generatedFrom === "string" ? value.generatedFrom : undefined,
    stage: isPrdWorkflowStage(value.stage) ? value.stage : "draft",
    prd: normalizePrdSnapshot(value.prd),
    decisions: Array.isArray(value.decisions) ? value.decisions.filter(isPrdDecisionEntry) : [],
    completeness: normalizePrdReviewSection(value.completeness),
    planReview: normalizePrdPlanReview(value.planReview),
    promotion: normalizePrdPromotion(value.promotion),
  };
}

function normalizePrdSnapshot(value: unknown): PrdSnapshot {
  const record = normalizeRecord(value);
  return {
    goal: typeof record.goal === "string" ? record.goal : "",
    scope: normalizeStringArray(record.scope),
    users: normalizeStringArray(record.users),
    nonGoals: normalizeStringArray(record.nonGoals),
    constraints: normalizeStringArray(record.constraints),
    acceptanceCriteria: normalizeStringArray(record.acceptanceCriteria),
    verification: normalizeStringArray(record.verification),
    risks: normalizeStringArray(record.risks),
    dependencies: normalizeStringArray(record.dependencies),
    openQuestions: normalizeStringArray(record.openQuestions),
  };
}

function normalizePrdReviewSection(value: unknown): PrdReviewState["completeness"] {
  const record = normalizeRecord(value);
  return {
    blockers: normalizePrdReviewIssues(record.blockers),
    warnings: normalizePrdReviewIssues(record.warnings),
    passes: normalizeStringArray(record.passes),
  };
}

function normalizePrdPlanReview(value: unknown): PrdReviewState["planReview"] {
  const record = normalizeRecord(value);
  return {
    coverage: Array.isArray(record.coverage) ? record.coverage.filter(isAcceptancePlanCoverage) : [],
    blockers: normalizePrdReviewIssues(record.blockers),
    warnings: normalizePrdReviewIssues(record.warnings),
    passes: normalizeStringArray(record.passes),
  };
}

function normalizePrdPromotion(value: unknown): PrdReviewState["promotion"] {
  const record = normalizeRecord(value);
  return {
    ready: record.ready === true,
    blockers: normalizePrdReviewIssues(record.blockers),
    warnings: normalizePrdReviewIssues(record.warnings),
    nextActions: normalizeStringArray(record.nextActions),
    promotedAt: typeof record.promotedAt === "string" ? record.promotedAt : undefined,
  };
}

function normalizePrdReviewIssues(value: unknown): PrdReviewIssue[] {
  return Array.isArray(value) ? value.filter(isPrdReviewIssue) : [];
}

function isPrdReviewIssue(value: unknown): value is PrdReviewIssue {
  const record = normalizeRecord(value);
  return typeof record.id === "string" &&
    (record.severity === "blocker" || record.severity === "warning") &&
    isPrdReviewCategory(record.category) &&
    typeof record.message === "string" &&
    typeof record.nextAction === "string" &&
    Array.isArray(record.relatedIds);
}

function isPrdDecisionEntry(value: unknown): value is PrdDecisionEntry {
  const record = normalizeRecord(value);
  return typeof record.id === "string" &&
    typeof record.decision === "string" &&
    typeof record.rationale === "string" &&
    Array.isArray(record.alternatives) &&
    Array.isArray(record.sourcePackIds) &&
    typeof record.createdAt === "string";
}

function isAcceptancePlanCoverage(value: unknown): value is AcceptancePlanCoverage {
  const record = normalizeRecord(value);
  return typeof record.acceptanceId === "string" &&
    typeof record.acceptanceText === "string" &&
    Array.isArray(record.planStepIds) &&
    (record.status === "covered" || record.status === "generic" || record.status === "missing");
}

function isPrdWorkflowStage(value: unknown): value is PrdWorkflowStage {
  return value === "draft" || value === "needs-clarification" || value === "ready-to-plan" || value === "plan-review" || value === "ready-to-implement" || value === "implementing";
}

function isPrdReviewCategory(value: unknown): value is PrdReviewCategory {
  return value === "prd" || value === "acceptance" || value === "plan" || value === "verification" || value === "research" || value === "decision" || value === "promotion";
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
  const clarification = await readTaskClarification(root, task.id);
  const research = await readTaskResearch(root, task.id);
  const prdReview = await writePrdReview(root, task, reason);
  const content = formatTaskHandoff(task, verification, acceptance, plan, strategy, clarification, research, prdReview, reason);
  await writeFile(path.join(taskDir, "handoff.md"), content, "utf8");
  await writeTaskInfo(root, task, reason);
  await writeTaskResume(root, task, reason);
  await writeTaskReadiness(root, task, reason);
  await writeTaskSnapshot(root, task, reason);
  await writeProjectOverview(root);
  return content;
}

export async function writeTurnJournal(root: string, reason = "turn", scope?: ActiveTaskScope): Promise<void> {
  const task = await loadActiveTask(root, scope);
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
  const clarification = await readTaskClarification(root, taskId);
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
  }, acceptance, verification, plan, note, research, clarification);
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
  const clarification = snapshot?.clarification;
  const research = snapshot?.research;
  const info = snapshot?.info;
  const prdReview = snapshot?.prdReview || (task ? await writePrdReview(root, task, "context") : undefined);
  const subtaskSummary = task ? await formatSubtaskTreeSummary(root, task, 8) : undefined;
  const subtaskPlan = task ? await readSubtaskPlan(root, task.id) : undefined;
  const roles = task ? await readRoleOrchestration(root, task.id) : undefined;
  const remediation = snapshot?.remediation || (task ? await readVerificationRemediationPlan(root, task.id) : undefined);
  const upstreamReport = shouldIncludeUpstreamSyncContext(prompt, task) ? await writeUpstreamSyncReport(root, "context") : undefined;
  const content = formatContextBundle(root, scored, task, acceptance, plan, verificationStrategy, remediation, handoff, resume, readiness, snapshot, clarification, subtaskSummary, subtaskPlan, roles, research, info, prdReview, upstreamReport);
  return { root, task, specs: scored, clarification, acceptance, plan, verificationStrategy, remediation, handoff, resume, readiness, snapshot, prdReview, subtasks: subtaskSummary, subtaskPlan, roles, research, info, upstreamReport, content };
}

export function formatContextBundle(
  root: string,
  specs: SpecDocument[],
  task?: TaskState,
  acceptance?: AcceptanceState,
  plan?: PlanState,
  verificationStrategy?: VerificationStrategy,
  remediation?: VerificationRemediationPlan,
  handoff?: string,
  resume?: ResumeState,
  readiness?: ReadinessState,
  snapshot?: TaskSnapshot,
  clarification?: ClarificationState,
  subtasks?: string,
  subtaskPlan?: SubtaskPlan,
  roles?: RoleOrchestrationPlan,
  research?: ResearchState,
  info?: string,
  prdReview?: PrdReviewState,
  upstreamReport?: UpstreamSyncReport,
): string {
  const lines: string[] = [
    "[PROJECT FLOW ACTIVE]",
    "",
    `Project root: ${root}`,
  ];

  if (task) {
    lines.push(
      ...[
        "",
        "Active task:",
        `- id: ${task.id}`,
        `- title: ${task.title}`,
        `- phase: ${task.phase}`,
        `- status: ${task.status}`,
        task.metadata ? `- metadata: ${formatTaskMetadataInline(task.metadata)}` : undefined,
        "- checkpoints:",
        ...task.checkpoints.map(checkpoint => `  - [${checkpoint.done ? "x" : " "}] ${checkpoint.id}: ${checkpoint.label}`),
      ].filter((line): line is string => line !== undefined),
    );
    if (clarification) {
      lines.push("", "Clarification loop:", formatClarificationContext(clarification));
    }
    if (subtasks && subtasks !== "No subtasks recorded.") {
      lines.push("", "Subtasks:", subtasks);
    }
    if (subtaskPlan && subtaskPlan.items.length > 0) {
      lines.push("", "Subtask plan:", formatSubtaskPlanSummary(subtaskPlan, 6));
    }
    if (roles) {
      lines.push("", "Role orchestration:", formatRoleOrchestrationSummary(roles, 3));
    }
    if (remediation) {
      lines.push("", "Verification remediation:", formatVerificationRemediationSummary(remediation));
    }
    if (acceptance) {
      lines.push("", "Acceptance:", formatAcceptanceSummary(acceptance, 6));
    }
    if (plan) {
      const next = nextPlanStep(plan);
      lines.push("", "Plan:", formatPlanSummary(plan, 6));
      if (next) lines.push(`Next plan step: ${next.id} - ${next.text}`);
    }
    if (prdReview) {
      lines.push("", "PRD review:", formatPrdReviewSummary(prdReview, 6));
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
    "- If clarification loop status is collecting, ask exactly the current clarification question and wait before planning or implementing.",
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

function formatPrd(task: TaskState, prd: ReturnType<typeof extractPrd>, clarification?: ClarificationState): string {
  const goal = clarification?.draft.goal || prd.goal;
  const constraints = clarification ? clarification.draft.constraints : prd.constraints;
  const acceptance = clarification ? clarification.draft.acceptanceCriteria : prd.acceptanceCriteria;
  const openQuestions = clarification ? clarification.draft.openQuestions : prd.openQuestions;
  return [
    `# ${task.title}`,
    "",
    `Task ID: ${task.id}`,
    `Created: ${task.createdAt}`,
    "",
    "## Goal",
    "",
    goal,
    "",
    "## Original Request",
    "",
    task.initialPrompt,
    "",
    "## Scope",
    "",
    clarification && clarification.draft.scope.length > 0 ? clarification.draft.scope.map(item => `- ${item}`).join("\n") : "- Not clarified.",
    "",
    "## Users",
    "",
    clarification && clarification.draft.users.length > 0 ? clarification.draft.users.map(item => `- ${item}`).join("\n") : "- Not clarified.",
    "",
    "## Non-goals",
    "",
    clarification && clarification.draft.nonGoals.length > 0 ? clarification.draft.nonGoals.map(item => `- ${item}`).join("\n") : "- Not clarified.",
    "",
    "## Constraints",
    "",
    ...constraints.map(item => `- ${item}`),
    "",
    "## Acceptance Criteria",
    "",
    ...acceptance.map(item => `- [ ] ${item}`),
    "",
    clarification && clarification.draft.verification.length > 0 ? "## Verification" : undefined,
    clarification && clarification.draft.verification.length > 0 ? "" : undefined,
    clarification && clarification.draft.verification.length > 0 ? clarification.draft.verification.map(item => `- ${item}`).join("\n") : undefined,
    clarification && clarification.draft.verification.length > 0 ? "" : undefined,
    clarification && clarification.draft.risks.length > 0 ? "## Risks" : undefined,
    clarification && clarification.draft.risks.length > 0 ? "" : undefined,
    clarification && clarification.draft.risks.length > 0 ? clarification.draft.risks.map(item => `- ${item}`).join("\n") : undefined,
    clarification && clarification.draft.risks.length > 0 ? "" : undefined,
    "## Open Questions",
    "",
    ...openQuestions.map(item => `- ${item}`),
    "",
    clarification ? "## Clarification Loop" : undefined,
    clarification ? "" : undefined,
    clarification ? formatClarificationSummary(clarification, 12) : undefined,
    clarification ? "" : undefined,
    clarification ? "### Answers" : undefined,
    clarification ? "" : undefined,
    clarification ? formatClarificationAnswers(clarification) : undefined,
    clarification ? "" : undefined,
  ].filter(line => line !== undefined).join("\n");
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
    .filter(line => /(完成|实现|支持|通过|\bworks?\b|\bpasses?\b|\bverify\b|\btest\b)/i.test(line))
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

function createClarificationState(
  taskId: string,
  prd: ReturnType<typeof extractPrd>,
  now: string,
  generatedFrom = "created",
  options: {
    enabled?: boolean;
    required?: boolean;
    maxQuestions?: number;
    seedDefaults?: boolean;
    mode?: ClarificationMode;
    requiredAxes?: ClarificationAxis[];
  } = {},
): ClarificationState {
  const maxQuestions = clampClarificationMax(options.maxQuestions);
  const meaningfulOpenQuestions = prd.openQuestions.filter(isMeaningfulOpenQuestion).slice(0, maxQuestions);
  const seedQuestions = meaningfulOpenQuestions.length > 0
    ? meaningfulOpenQuestions.map(text => ({ axis: inferClarificationAxis(text), text }))
    : options.seedDefaults
      ? DEFAULT_CLARIFICATION_QUESTIONS.slice(0, maxQuestions)
      : [];
  const enabled = options.enabled ?? seedQuestions.length > 0;
  const required = options.required ?? meaningfulOpenQuestions.length > 0;
  const questions: ClarificationQuestion[] = seedQuestions.map((question, index) => ({
    id: `C${index + 1}`,
    axis: question.axis,
    text: question.text,
    status: enabled && index === 0 ? "asking" : "queued",
    askedAt: enabled && index === 0 ? now : undefined,
  }));
  const state: ClarificationState = {
    taskId,
    enabled,
    required,
    status: enabled && questions.length > 0 ? "collecting" : "not_required",
    mode: options.mode || "questions",
    requiredAxes: dedupeClarificationAxes(options.requiredAxes || questions.map(question => question.axis)),
    updatedAt: now,
    generatedFrom,
    currentQuestionId: enabled && questions.length > 0 ? questions[0]?.id : undefined,
    maxQuestions,
    questions,
    draft: {
      goal: prd.goal,
      scope: [],
      users: [],
      nonGoals: [],
      constraints: prd.constraints.filter(item => item !== "Keep changes scoped to the requested workflow."),
      acceptanceCriteria: prd.acceptanceCriteria,
      verification: [],
      risks: [],
      openQuestions: meaningfulOpenQuestions,
    },
  };
  return finalizeClarificationState(state);
}

function buildDefaultClarificationQuestions(maxQuestions: number, now: string): ClarificationQuestion[] {
  return DEFAULT_CLARIFICATION_QUESTIONS.slice(0, maxQuestions).map((question, index) => ({
    id: `C${index + 1}`,
    axis: question.axis,
    text: question.text,
    status: index === 0 ? "asking" : "queued",
    askedAt: index === 0 ? now : undefined,
  }));
}

function buildPrdRefinementQuestions(state: ClarificationState, requiredAxes: ClarificationAxis[], now: string): ClarificationQuestion[] {
  return requiredAxes.map((axis, index) => {
    const existing = state.questions.find(question => question.axis === axis);
    const id = `C${index + 1}`;
    if (existing?.status === "answered" || existing?.status === "skipped") return { ...existing, id };
    if (existing && isClarificationAxisResolved(state.draft, axis)) {
      return {
        id,
        axis,
        text: existing?.text || PRD_REFINEMENT_QUESTIONS[axis],
        status: "answered" as const,
        answer: summarizeClarifiedDraftAxis(state.draft, axis),
        answeredAt: existing?.answeredAt || now,
        rationale: existing?.rationale || "resolved from draft PRD",
      };
    }
    return {
      id,
      axis,
      text: existing?.text || PRD_REFINEMENT_QUESTIONS[axis],
      status: "queued" as const,
      askedAt: undefined,
      answer: undefined,
      answeredAt: undefined,
      rationale: existing?.rationale,
    };
  });
}

function isClarificationAxisResolved(draft: ClarifiedPrdDraft, axis: ClarificationAxis): boolean {
  if (axis === "goal") return !!draft.goal?.trim();
  if (axis === "scope") return draft.scope.length > 0;
  if (axis === "users") return draft.users.length > 0;
  if (axis === "non_goals") return draft.nonGoals.length > 0;
  if (axis === "constraints") return draft.constraints.length > 0;
  if (axis === "risk") return draft.risks.length > 0;
  if (axis === "verification") return draft.verification.length > 0 || draft.acceptanceCriteria.some(item => /^Verification:/i.test(item));
  return draft.acceptanceCriteria.filter(item => !isDefaultAcceptanceCriterion(item)).length > 1;
}

function summarizeClarifiedDraftAxis(draft: ClarifiedPrdDraft, axis: ClarificationAxis): string {
  if (axis === "goal") return draft.goal || "Goal recorded in draft PRD.";
  if (axis === "scope") return draft.scope.join("; ");
  if (axis === "users") return draft.users.join("; ");
  if (axis === "non_goals") return draft.nonGoals.join("; ");
  if (axis === "constraints") return draft.constraints.join("; ");
  if (axis === "risk") return draft.risks.join("; ");
  if (axis === "verification") return draft.verification.length > 0 ? draft.verification.join("; ") : draft.acceptanceCriteria.filter(item => /^Verification:/i.test(item)).join("; ");
  return draft.acceptanceCriteria.filter(item => !isDefaultAcceptanceCriterion(item)).join("; ");
}

function isDefaultAcceptanceCriterion(item: string): boolean {
  return item === "The requested behavior is implemented." ||
    item === "Relevant project specs are respected." ||
    item === "Targeted verification is run or clearly documented.";
}

function dedupeClarificationAxes(axes: ClarificationAxis[]): ClarificationAxis[] {
  const seen = new Set<ClarificationAxis>();
  const result: ClarificationAxis[] = [];
  for (const axis of axes) {
    if (seen.has(axis)) continue;
    seen.add(axis);
    result.push(axis);
  }
  return result;
}
async function persistClarificationUpdate(
  root: string,
  task: TaskState,
  state: ClarificationState,
  eventType: string,
  data: Record<string, unknown>,
): Promise<void> {
  await writeClarificationFiles(root, task, state);
  await writeFile(path.join(getProjectPaths(root).tasksDir, task.id, "prd.md"), formatPrd(task, extractPrd(task.initialPrompt), state), "utf8");
  await appendTaskEvent(root, task.id, {
    type: eventType,
    timestamp: new Date().toISOString(),
    data,
  });
  await writeTaskHandoff(root, task, eventType);
}

async function writeClarificationFiles(root: string, task: TaskState, state: ClarificationState): Promise<void> {
  const taskDir = path.join(getProjectPaths(root).tasksDir, task.id);
  await mkdir(taskDir, { recursive: true });
  const normalized = finalizeClarificationState(state);
  await writeFile(path.join(taskDir, "clarification.json"), `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  await writeFile(path.join(taskDir, "clarification.md"), formatClarificationMarkdown(task, normalized), "utf8");
}

function normalizeClarificationState(parsed: Partial<ClarificationState>): ClarificationState | undefined {
  if (typeof parsed.taskId !== "string" || typeof parsed.updatedAt !== "string") return undefined;
  const maxQuestions = clampClarificationMax(parsed.maxQuestions);
  const questions = Array.isArray(parsed.questions)
    ? parsed.questions.map(normalizeClarificationQuestion).filter((question): question is ClarificationQuestion => !!question).slice(0, maxQuestions)
    : [];
  const status = isClarificationStatus(parsed.status) ? parsed.status : questions.length > 0 ? "collecting" : "not_required";
  const requiredAxes = normalizeClarificationAxes(parsed.requiredAxes);
  const state: ClarificationState = {
    taskId: parsed.taskId,
    enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : status !== "not_required",
    required: typeof parsed.required === "boolean" ? parsed.required : status === "collecting",
    status,
    mode: isClarificationMode(parsed.mode) ? parsed.mode : "questions",
    requiredAxes: requiredAxes.length > 0 ? requiredAxes : dedupeClarificationAxes(questions.map(question => question.axis)),
    updatedAt: parsed.updatedAt,
    generatedFrom: typeof parsed.generatedFrom === "string" ? parsed.generatedFrom : undefined,
    currentQuestionId: typeof parsed.currentQuestionId === "string" ? parsed.currentQuestionId : undefined,
    maxQuestions,
    questions,
    draft: normalizeClarificationDraft(parsed.draft),
    summary: typeof parsed.summary === "string" ? parsed.summary : undefined,
  };
  return state.status === "collecting" ? activateNextClarificationQuestion(state, state.updatedAt) : finalizeClarificationState(state);
}

function normalizeClarificationQuestion(value: unknown): ClarificationQuestion | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || typeof record.text !== "string") return undefined;
  const status = isClarificationQuestionStatus(record.status) ? record.status : "queued";
  return {
    id: record.id,
    axis: isClarificationAxis(record.axis) ? record.axis : inferClarificationAxis(record.text),
    text: record.text,
    status,
    answer: typeof record.answer === "string" ? record.answer : undefined,
    askedAt: typeof record.askedAt === "string" ? record.askedAt : undefined,
    answeredAt: typeof record.answeredAt === "string" ? record.answeredAt : undefined,
    rationale: typeof record.rationale === "string" ? record.rationale : undefined,
  };
}

function normalizeClarificationDraft(value: unknown): ClarifiedPrdDraft {
  const record = value && typeof value === "object" ? value as Record<string, unknown> : {};
  return {
    goal: typeof record.goal === "string" ? record.goal : undefined,
    scope: normalizeStringArray(record.scope),
    users: normalizeStringArray(record.users),
    nonGoals: normalizeStringArray(record.nonGoals),
    constraints: normalizeStringArray(record.constraints),
    acceptanceCriteria: normalizeStringArray(record.acceptanceCriteria),
    verification: normalizeStringArray(record.verification),
    risks: normalizeStringArray(record.risks),
    openQuestions: normalizeStringArray(record.openQuestions),
  };
}

function activateNextClarificationQuestion(state: ClarificationState, now: string): ClarificationState {
  if (!state.enabled) {
    return finalizeClarificationState({ ...state, status: "not_required", currentQuestionId: undefined });
  }
  if (state.status === "ready" || state.status === "skipped") return finalizeClarificationState(state);

  const current = state.currentQuestionId
    ? state.questions.find(question => question.id === state.currentQuestionId)
    : undefined;
  if (current?.status === "asking") {
    return finalizeClarificationState({ ...state, status: "collecting" });
  }

  const existingAsking = state.questions.find(question => question.status === "asking");
  if (existingAsking) {
    return finalizeClarificationState({ ...state, status: "collecting", currentQuestionId: existingAsking.id });
  }

  const nextQueued = state.questions.find(question => question.status === "queued");
  if (!nextQueued) {
    return finalizeClarificationState({ ...state, status: "ready", currentQuestionId: undefined });
  }

  const questions = state.questions.map(question =>
    question.id === nextQueued.id
      ? { ...question, status: "asking" as const, askedAt: question.askedAt || now }
      : question.status === "asking"
        ? { ...question, status: "queued" as const }
        : question,
  );
  return finalizeClarificationState({
    ...state,
    status: "collecting",
    currentQuestionId: nextQueued.id,
    questions,
  });
}

function finalizeClarificationState(state: ClarificationState): ClarificationState {
  const openQuestions = openClarificationQuestions(state);
  const answered = state.questions.filter(question => question.status === "answered").length;
  const skipped = state.questions.filter(question => question.status === "skipped").length;
  const currentQuestionId = state.status === "collecting" && openQuestions.length > 0
    ? state.currentQuestionId || openQuestions[0]?.id
    : undefined;
  return {
    ...state,
    currentQuestionId,
    draft: {
      ...state.draft,
      openQuestions: openQuestions.map(question => question.text),
    },
    summary: `Clarification ${state.status}: ${answered} answered, ${skipped} skipped, ${openQuestions.length} open.`,
  };
}

function updateClarificationDraft(
  draft: ClarifiedPrdDraft,
  question: ClarificationQuestion,
  answer: string,
): ClarifiedPrdDraft {
  const next: ClarifiedPrdDraft = {
    goal: draft.goal,
    scope: [...draft.scope],
    users: [...draft.users],
    nonGoals: [...draft.nonGoals],
    constraints: [...draft.constraints],
    acceptanceCriteria: [...draft.acceptanceCriteria],
    verification: [...draft.verification],
    risks: [...draft.risks],
    openQuestions: [...draft.openQuestions],
  };

  if (!answer.trim()) return next;

  if (question.axis === "goal") next.goal = answer;
  if (question.axis === "scope") next.scope = dedupeStrings([...next.scope, answer]);
  if (question.axis === "users") next.users = dedupeStrings([...next.users, answer]);
  if (question.axis === "non_goals") next.nonGoals = dedupeStrings([...next.nonGoals, answer]);
  if (question.axis === "constraints") next.constraints = dedupeStrings([...next.constraints, answer]);
  if (question.axis === "risk") next.risks = dedupeStrings([...next.risks, answer]);
  if (question.axis === "acceptance") next.acceptanceCriteria = dedupeStrings([...next.acceptanceCriteria.filter(item => !isDefaultAcceptanceCriterion(item)), answer]);
  if (question.axis === "verification") {
    next.verification = dedupeStrings([...next.verification, answer]);
    next.acceptanceCriteria = dedupeStrings([...next.acceptanceCriteria, `Verification: ${answer}`]);
  }
  return next;
}

function openClarificationQuestions(state: ClarificationState | undefined): ClarificationQuestion[] {
  if (!state) return [];
  return state.questions.filter(question => question.status === "queued" || question.status === "asking");
}

function getCurrentClarificationQuestion(state: ClarificationState): ClarificationQuestion | undefined {
  return state.currentQuestionId
    ? state.questions.find(question => question.id === state.currentQuestionId)
    : state.questions.find(question => question.status === "asking");
}

export function formatClarificationPrompt(task: TaskState, state: ClarificationState): string {
  const question = getCurrentClarificationQuestion(state);
  if (!question) {
    return `Clarification for ${task.id} is ${state.status}.`;
  }
  if (state.mode === "refine") {
    return [
      `Continue Project Flow PRD refinement for ${task.id}.`,
      "Ask exactly one focused PRD question and wait for the user's answer. Do not plan or implement yet.",
      `Required axes: ${state.requiredAxes.join(", ") || "none"}`,
      "",
      `Question ${question.id} (${question.axis}): ${question.text}`,
      "",
      "Draft so far:",
      formatClarifiedPrdDraft(state.draft),
    ].join("\n");
  }
  return [
    `Continue Project Flow clarification for ${task.id}.`,
    "Ask exactly one question and wait for the user's answer. Do not plan or implement yet.",
    "",
    `Question ${question.id}: ${question.text}`,
  ].join("\n");
}

export function formatClarificationSummary(state: ClarificationState, max = 8): string {
  const current = getCurrentClarificationQuestion(state);
  const lines = [
    `status: ${state.status}`,
    `mode: ${state.mode}`,
    `updated: ${state.updatedAt}`,
    `required: ${state.required ? "yes" : "no"}`,
    state.mode === "refine" ? `required axes: ${state.requiredAxes.join(", ") || "none"}` : undefined,
    `questions: ${state.questions.filter(question => question.status === "answered").length} answered, ${state.questions.filter(question => question.status === "skipped").length} skipped, ${openClarificationQuestions(state).length} open`,
    current ? `current: ${current.id} - ${current.text}` : undefined,
  ].filter((line): line is string => !!line);
  const answered = state.questions.filter(question => question.status === "answered").slice(-max);
  if (answered.length > 0) {
    lines.push("recent answers:", ...answered.map(question => `- ${question.id}: ${summarizeUnknown(question.answer || "", 180)}`));
  }
  return lines.join("\n");
}

function formatClarificationMarkdown(task: TaskState, state: ClarificationState): string {
  return [
    "# Clarification Loop",
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Status: ${state.status}`,
    `Mode: ${state.mode}`,
    `Required: ${state.required ? "yes" : "no"}`,
    state.mode === "refine" ? `Required axes: ${state.requiredAxes.join(", ") || "none"}` : undefined,
    `Updated: ${state.updatedAt}`,
    state.generatedFrom ? `Reason: ${state.generatedFrom}` : undefined,
    "",
    "## Summary",
    "",
    state.summary || formatClarificationSummary(state),
    "",
    "## Current Question",
    "",
    getCurrentClarificationQuestion(state)
      ? `- ${getCurrentClarificationQuestion(state)?.id}: ${getCurrentClarificationQuestion(state)?.text}`
      : "No current clarification question.",
    "",
    "## Questions",
    "",
    state.questions.length === 0 ? "No clarification questions recorded." : state.questions.map(formatClarificationQuestion).join("\n"),
    "",
    "## Draft PRD",
    "",
    formatClarifiedPrdDraft(state.draft),
    "",
  ].filter(line => line !== undefined).join("\n");
}

function formatClarificationQuestion(question: ClarificationQuestion): string {
  return [
    `- [${question.status}] ${question.id} (${question.axis}): ${question.text}`,
    question.answer ? `  - answer: ${summarizeUnknown(question.answer, 240)}` : undefined,
    question.rationale ? `  - rationale: ${summarizeUnknown(question.rationale, 160)}` : undefined,
  ].filter(line => line !== undefined).join("\n");
}

function formatClarifiedPrdDraft(draft: ClarifiedPrdDraft): string {
  return [
    `- Goal: ${draft.goal || "Not clarified."}`,
    draft.scope.length > 0 ? `- Scope: ${draft.scope.join("; ")}` : "- Scope: not clarified.",
    draft.users.length > 0 ? `- Users: ${draft.users.join("; ")}` : "- Users: not clarified.",
    draft.nonGoals.length > 0 ? `- Non-goals: ${draft.nonGoals.join("; ")}` : "- Non-goals: not clarified.",
    draft.constraints.length > 0 ? `- Constraints: ${draft.constraints.join("; ")}` : "- Constraints: not clarified.",
    draft.acceptanceCriteria.length > 0 ? `- Acceptance: ${draft.acceptanceCriteria.join("; ")}` : "- Acceptance: not clarified.",
    draft.verification.length > 0 ? `- Verification: ${draft.verification.join("; ")}` : "- Verification: not clarified.",
    draft.risks.length > 0 ? `- Risks: ${draft.risks.join("; ")}` : "- Risks: not clarified.",
    draft.openQuestions.length > 0 ? `- Open questions: ${draft.openQuestions.join("; ")}` : "- Open questions: none.",
  ].join("\n");
}

function formatClarificationAnswers(state: ClarificationState): string {
  const answered = state.questions.filter(question => question.status === "answered" || question.status === "skipped");
  if (answered.length === 0) return "No clarification answers recorded yet.";
  return answered.map(question => {
    const detail = question.status === "answered"
      ? question.answer || "answered without text"
      : question.rationale || "skipped";
    return `- ${question.id} [${question.status}] ${question.text}: ${summarizeUnknown(detail, 260)}`;
  }).join("\n");
}

function formatClarificationContext(state: ClarificationState, max = 1400): string {
  const current = getCurrentClarificationQuestion(state);
  const lines = [
    `- status: ${state.status}`,
    `- mode: ${state.mode}`,
    `- required: ${state.required ? "yes" : "no"}`,
    state.mode === "refine" ? `- required axes: ${state.requiredAxes.join(", ") || "none"}` : undefined,
    `- open questions: ${openClarificationQuestions(state).length}`,
    current ? `- current question: ${current.id} - ${current.text}` : "- current question: none",
    state.status === "collecting" && current && state.mode === "refine"
      ? "- guidance: ask exactly this PRD refinement question and wait; do not plan or implement until required axes are answered or skipped."
      : state.status === "collecting" && current
        ? "- guidance: ask exactly this one clarification question and wait; do not plan or implement yet."
        : "- guidance: proceed with the normal project workflow.",
    state.questions.some(question => question.status === "answered")
      ? `- recent answers: ${state.questions.filter(question => question.status === "answered").slice(-3).map(question => `${question.id} ${summarizeUnknown(question.answer || "", 120)}`).join("; ")}`
      : "- recent answers: none",
  ].filter((line): line is string => !!line);
  const content = lines.join("\n");
  return content.length <= max ? content : `${content.slice(0, max)}\n[Clarification context truncated by Project Flow]`;
}

function isMeaningfulOpenQuestion(question: string): boolean {
  const trimmed = question.trim();
  return !!trimmed && trimmed !== "None captured from the initial request.";
}

function isInternalClarificationPrompt(prompt: string): boolean {
  return /^Continue Project Flow clarification for\b/i.test(prompt) ||
    /^Continue Project Flow PRD refinement for\b/i.test(prompt) ||
    /^Clarification for\s+T-\d{8}-/i.test(prompt);
}

function inferClarificationAxis(text: string): ClarificationAxis {
  if (/(验收|acceptance|criteria|完成|done)/i.test(text)) return "acceptance";
  if (/(测试|验证|verify|test|check|lint|typecheck)/i.test(text)) return "verification";
  if (/(限制|约束|必须|不能|兼容|constraint|must|avoid|preserve|keep)/i.test(text)) return "constraints";
  if (/(风险|risk|unsafe|danger)/i.test(text)) return "risk";
  if (/(用户|角色|audience|user|persona)/i.test(text)) return "users";
  if (/(不做|排除|scope out|non.?goal|out of scope)/i.test(text)) return "non_goals";
  if (/(范围|scope|哪些|which|part)/i.test(text)) return "scope";
  return "goal";
}

function clampClarificationMax(value: unknown): number {
  const numeric = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : DEFAULT_CLARIFICATION_MAX_QUESTIONS;
  return Math.max(1, Math.min(12, numeric));
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter(item => typeof item === "string" && item.trim()).map(item => item.trim()) : [];
}

function isClarificationStatus(value: unknown): value is ClarificationStatus {
  return value === "not_required" || value === "collecting" || value === "ready" || value === "skipped";
}

function isClarificationMode(value: unknown): value is ClarificationMode {
  return value === "questions" || value === "refine";
}

function isClarificationQuestionStatus(value: unknown): value is ClarificationQuestionStatus {
  return value === "queued" || value === "asking" || value === "answered" || value === "skipped";
}

function isClarificationAxis(value: unknown): value is ClarificationAxis {
  return value === "goal" ||
    value === "scope" ||
    value === "users" ||
    value === "acceptance" ||
    value === "constraints" ||
    value === "non_goals" ||
    value === "verification" ||
    value === "risk";
}

function normalizeClarificationAxes(value: unknown): ClarificationAxis[] {
  return Array.isArray(value) ? dedupeClarificationAxes(value.filter(isClarificationAxis)) : [];
}

function createResearchQuestion(id: string, text: string, now: string, priority: ResearchPriority, sourcePackIds: string[] = []): ResearchQuestion {
  return {
    id,
    text,
    status: "open",
    priority,
    sourcePackIds: dedupeStrings(sourcePackIds),
    createdAt: now,
    updatedAt: now,
  };
}

async function extractLocalSourceExcerpt(root: string, source: string): Promise<{ source: string; file: string; lineRange?: string; excerpt: string } | undefined> {
  const parsed = parseLocalSourceSelector(source);
  if (!parsed) return undefined;
  const absolute = path.resolve(root, parsed.file);
  const relative = path.relative(root, absolute);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) return undefined;
  if (!(await pathExists(absolute))) return undefined;
  const content = await readFile(absolute, "utf8").catch(() => "");
  if (!content) return undefined;
  const lines = content.split(/\r?\n/);
  const start = parsed.start ? Math.max(1, parsed.start) : 1;
  const end = parsed.end ? Math.max(start, parsed.end) : parsed.start ? start : Math.min(lines.length, 40);
  const excerptLines = lines.slice(start - 1, Math.min(end, lines.length));
  if (excerptLines.length === 0) return undefined;
  const normalizedFile = relative.replaceAll("\\", "/");
  const lineRange = `${start}-${Math.min(end, lines.length)}`;
  return {
    source: `${normalizedFile}:${lineRange}`,
    file: normalizedFile,
    lineRange,
    excerpt: excerptLines.map((line, index) => `${start + index}:${line}`).join("\n"),
  };
}

function parseLocalSourceSelector(source: string): { file: string; start?: number; end?: number } | undefined {
  const trimmed = source.trim();
  if (!trimmed || /^https?:\/\//i.test(trimmed)) return undefined;
  const match = trimmed.match(/^(.*?):(\d+)(?:-(\d+))?$/);
  if (!match) return { file: trimmed };
  return { file: match[1] || "", start: Number.parseInt(match[2] || "1", 10), end: match[3] ? Number.parseInt(match[3], 10) : undefined };
}

function createResearchState(
  taskId: string,
  openQuestions: string[],
  now: string,
  generatedFrom = "created",
): ResearchState {
  const filteredQuestions = openQuestions.filter(item => item && item !== "None captured from the initial request.");
  return {
    taskId,
    updatedAt: now,
    generatedFrom,
    openQuestions: filteredQuestions,
    decisions: [],
    findings: [],
    openRisks: [],
    items: [],
    sourcePacks: [],
    questions: filteredQuestions.map((text, index) => createResearchQuestion(`Q${index + 1}`, text, now, "normal")),
    findingRecords: [],
    decisionRecords: [],
    riskRecords: [],
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
  await writeFile(path.join(researchDir, "source-packs.json"), `${JSON.stringify({ taskId: state.taskId, updatedAt: state.updatedAt, sourcePacks: state.sourcePacks }, null, 2)}\n`, "utf8");
  await writeFile(path.join(researchDir, "notes.md"), formatResearchNotes(task, state), "utf8");
  await writeFile(path.join(researchDir, "handoff.md"), formatResearchWorkflowHandoff(task, state), "utf8");
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
    "## Questions",
    "",
    state.questions.length === 0 ? "No research questions recorded." : state.questions.map(formatResearchQuestion).join("\n"),
    "",
    "## Findings",
    "",
    state.findingRecords.length === 0 ? formatResumeList(state.findings, "No research findings recorded.") : state.findingRecords.map(formatResearchFinding).join("\n"),
    "",
    "## Decisions",
    "",
    state.decisionRecords.length === 0 ? formatResumeList(state.decisions, "No research decisions recorded.") : state.decisionRecords.map(formatResearchDecision).join("\n"),
    "",
    "## Risks",
    "",
    state.riskRecords.length === 0 ? formatResumeList(state.openRisks, "No open research risks recorded.") : state.riskRecords.map(formatResearchRisk).join("\n"),
    "",
    "## Source Packs",
    "",
    state.sourcePacks.length === 0 ? "No research source packs recorded yet." : state.sourcePacks.map(formatResearchSourcePack).join("\n\n"),
    "",
    "## Items",
    "",
    state.items.length === 0 ? "No research items recorded yet." : state.items.map(formatResearchItem).join("\n\n"),
    "",
  ].filter(line => line !== undefined).join("\n");
}

export function formatResearchSummary(state: ResearchState, max = 8): string {
  const confidence = summarizeResearchConfidence(state.sourcePacks);
  return [
    `research items: ${state.items.length}`,
    `source packs: ${state.sourcePacks.length}${confidence ? ` (${confidence})` : ""}`,
    `questions: ${state.questions.filter(question => question.status === "answered").length} answered, ${state.questions.filter(question => question.status === "blocked").length} blocked, ${state.questions.filter(question => question.status === "open").length} open`,
    `findings: ${state.findingRecords.length || state.findings.length}`,
    `open risks: ${state.riskRecords.filter(risk => risk.status === "open").length || state.openRisks.length}`,
    `decisions: ${state.decisionRecords.length || state.decisions.length}`,
    state.sourcePacks.length > 0 ? ["source packs:", ...state.sourcePacks.slice(-max).map(item => `- ${item.id}: ${item.kind} ${item.source} [${item.reviewStatus}/${item.confidence}] ${item.claim}`)].join("\n") : "source packs: none",
    state.questions.length > 0 ? ["questions:", ...state.questions.slice(-max).map(item => `- ${item.id} [${item.status}/${item.priority}]: ${item.text}${item.answer ? ` => ${summarizeUnknown(item.answer, 120)}` : ""}`)].join("\n") : "questions: none",
    state.items.length > 0 ? ["recent research:", ...state.items.slice(-max).map(item => `- ${item.id}: ${item.summary}`)].join("\n") : "recent research: none",
  ].join("\n");
}

function formatResearchSourcePack(pack: ResearchSourcePack): string {
  return [
    `### ${pack.id}: ${pack.claim}`,
    "",
    `- kind: ${pack.kind}`,
    `- source: ${pack.source}`,
    `- status: ${pack.reviewStatus}`,
    `- created: ${pack.createdAt}`,
    pack.reviewedAt ? `- reviewed: ${pack.reviewedAt}` : undefined,
    `- confidence: ${pack.confidence}`,
    pack.extractedFrom ? `- extracted from: ${pack.extractedFrom}${pack.lineRange ? `:${pack.lineRange}` : ""}` : undefined,
    pack.staleAfter ? `- stale after: ${pack.staleAfter}` : undefined,
    pack.questionIds.length > 0 ? `- questions: ${pack.questionIds.join(", ")}` : undefined,
    pack.relatedItemIds.length > 0 ? `- related items: ${pack.relatedItemIds.join(", ")}` : undefined,
    pack.openRisks.length > 0 ? `- open risks: ${pack.openRisks.join("; ")}` : undefined,
    "",
    pack.excerpt,
  ].filter(line => line !== undefined).join("\n");
}

function summarizeResearchConfidence(sourcePacks: ResearchSourcePack[]): string {
  if (sourcePacks.length === 0) return "";
  const high = sourcePacks.filter(pack => pack.confidence === "high").length;
  const medium = sourcePacks.filter(pack => pack.confidence === "medium").length;
  const low = sourcePacks.length - high - medium;
  return `high ${high}, medium ${medium}, low ${low}`;
}

function formatResearchQuestion(question: ResearchQuestion): string {
  return `- ${question.id} [${question.status}/${question.priority}] ${question.text}${question.answer ? ` => ${summarizeUnknown(question.answer, 180)}` : ""}${question.blockedReason ? ` (blocked: ${summarizeUnknown(question.blockedReason, 120)})` : ""}${question.sourcePackIds.length > 0 ? ` sources: ${question.sourcePackIds.join(",")}` : ""}`;
}

function formatResearchFinding(finding: ResearchFinding): string {
  return `- ${finding.id} [${finding.status}/${finding.confidence}] ${finding.claim}${finding.questionId ? ` question: ${finding.questionId}` : ""}${finding.sourcePackIds.length > 0 ? ` sources: ${finding.sourcePackIds.join(",")}` : ""}${finding.risks.length > 0 ? ` risks: ${finding.risks.join("; ")}` : ""}`;
}

function formatResearchDecision(decision: ResearchDecision): string {
  return `- ${decision.id}: ${decision.decision} — ${decision.rationale}${decision.sourcePackIds.length > 0 ? ` sources: ${decision.sourcePackIds.join(",")}` : ""}${decision.alternatives.length > 0 ? ` alternatives: ${decision.alternatives.join("; ")}` : ""}`;
}

function formatResearchRisk(risk: ResearchRisk): string {
  return `- ${risk.id} [${risk.status}] ${risk.text}${risk.sourcePackIds.length > 0 ? ` sources: ${risk.sourcePackIds.join(",")}` : ""}`;
}

function formatResearchWorkflowHandoff(task: TaskState, state: ResearchState): string {
  const answered = state.questions.filter(question => question.status === "answered");
  const reviewed = state.sourcePacks.filter(pack => pack.reviewStatus === "reviewed");
  return [
    "# Research Workflow Handoff",
    "",
    `Task: ${task.id}`,
    `Title: ${task.title}`,
    `Updated: ${state.updatedAt}`,
    "",
    "## Implementation Handoff",
    "",
    answered.length === 0 ? "No answered research questions recorded." : answered.map(formatResearchQuestion).join("\n"),
    reviewed.length === 0 ? "No reviewed source packs recorded." : reviewed.map(pack => `- ${pack.id}: ${pack.claim} (${pack.source})`).join("\n"),
    state.decisionRecords.length === 0 ? "No research decisions recorded." : state.decisionRecords.map(formatResearchDecision).join("\n"),
    "",
    "## Check Handoff",
    "",
    state.findingRecords.length === 0 ? "No findings to verify." : state.findingRecords.map(formatResearchFinding).join("\n"),
    state.riskRecords.filter(risk => risk.status === "open").length === 0 ? "No open research risks recorded." : state.riskRecords.filter(risk => risk.status === "open").map(formatResearchRisk).join("\n"),
    state.sourcePacks.filter(pack => pack.reviewStatus === "draft").length === 0 ? "No draft source packs remain." : state.sourcePacks.filter(pack => pack.reviewStatus === "draft").map(pack => `- Draft ${pack.id}: ${pack.source}`).join("\n"),
    "",
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
  clarification: ClarificationState | undefined,
  subtaskSummary: string,
  subtaskPlan: SubtaskPlan | undefined,
  roles: RoleOrchestrationPlan | undefined,
  remediation: VerificationRemediationPlan | undefined,
  prdReview: PrdReviewState,
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
    "## Metadata",
    "",
    task.metadata ? formatTaskMetadataSummary(task.metadata, 12) : "No task metadata recorded yet.",
    "",
    "## PRD Review",
    "",
    formatPrdReviewSummary(prdReview, 12),
    "",
    "## Subtasks",
    "",
    subtaskSummary,
    "",
    "## Role Orchestration",
    "",
    roles ? formatRoleOrchestrationSummary(roles, 3) : "No role orchestration plan recorded yet.",
    "",
    "## Subtask Plan",
    "",
    subtaskPlan ? formatSubtaskPlanSummary(subtaskPlan, 12) : "No subtask plan recorded yet.",
    "",
    "## Verification Remediation",
    "",
    remediation ? formatVerificationRemediationSummary(remediation) : "No verification remediation loop recorded yet.",
    "",
    "## Research",
    "",
    research ? formatResearchSummary(research, 12) : "No research artifact recorded yet.",
    "",
    "## Clarification",
    "",
    clarification ? formatClarificationSummary(clarification, 12) : "No clarification artifact recorded yet.",
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

function normalizeResearchSourcePack(value: unknown): ResearchSourcePack | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  if (typeof record.id !== "string" || !isResearchSourceKind(record.kind) || typeof record.source !== "string" || typeof record.claim !== "string" || typeof record.excerpt !== "string" || !isResearchConfidence(record.confidence)) return undefined;
  const createdAt = typeof record.createdAt === "string" ? record.createdAt : typeof record.reviewedAt === "string" ? record.reviewedAt : new Date(0).toISOString();
  const reviewStatus: ResearchReviewStatus = isResearchReviewStatus(record.reviewStatus) ? record.reviewStatus : "reviewed";
  return {
    id: record.id,
    kind: record.kind,
    source: record.source,
    createdAt,
    reviewedAt: typeof record.reviewedAt === "string" ? record.reviewedAt : reviewStatus === "reviewed" ? createdAt : undefined,
    reviewStatus,
    claim: record.claim,
    excerpt: record.excerpt,
    confidence: record.confidence,
    openRisks: normalizeStringArray(record.openRisks).slice(0, 8),
    relatedItemIds: normalizeStringArray(record.relatedItemIds).slice(0, 8),
    questionIds: normalizeStringArray(record.questionIds).slice(0, 8),
    extractedFrom: typeof record.extractedFrom === "string" ? record.extractedFrom : undefined,
    lineRange: typeof record.lineRange === "string" ? record.lineRange : undefined,
    staleAfter: typeof record.staleAfter === "string" ? record.staleAfter : undefined,
  };
}

function isResearchQuestion(value: unknown): value is ResearchQuestion {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.text === "string" && isResearchQuestionStatus(record.status) && isResearchPriority(record.priority) && Array.isArray(record.sourcePackIds) && record.sourcePackIds.every(item => typeof item === "string") && typeof record.createdAt === "string" && typeof record.updatedAt === "string";
}

function isResearchFinding(value: unknown): value is ResearchFinding {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.claim === "string" && isResearchFindingStatus(record.status) && isResearchConfidence(record.confidence) && Array.isArray(record.sourcePackIds) && record.sourcePackIds.every(item => typeof item === "string") && Array.isArray(record.risks) && record.risks.every(item => typeof item === "string") && typeof record.createdAt === "string" && typeof record.updatedAt === "string";
}

function isResearchDecision(value: unknown): value is ResearchDecision {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.decision === "string" && typeof record.rationale === "string" && Array.isArray(record.sourcePackIds) && record.sourcePackIds.every(item => typeof item === "string") && Array.isArray(record.alternatives) && record.alternatives.every(item => typeof item === "string") && typeof record.acceptedAt === "string";
}

function isResearchRisk(value: unknown): value is ResearchRisk {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === "string" && typeof record.text === "string" && isResearchRiskStatus(record.status) && Array.isArray(record.sourcePackIds) && record.sourcePackIds.every(item => typeof item === "string") && typeof record.createdAt === "string";
}

function isResearchSourceKind(value: unknown): value is ResearchSourceKind {
  return value === "doc" || value === "code" || value === "upstream" || value === "user" || value === "command" || value === "web";
}

function isResearchConfidence(value: unknown): value is ResearchConfidence {
  return value === "low" || value === "medium" || value === "high";
}

function isResearchReviewStatus(value: unknown): value is ResearchReviewStatus {
  return value === "draft" || value === "reviewed";
}

function isResearchQuestionStatus(value: unknown): value is ResearchQuestionStatus {
  return value === "open" || value === "answered" || value === "blocked";
}

function isResearchPriority(value: unknown): value is ResearchPriority {
  return value === "low" || value === "normal" || value === "high";
}

function isResearchFindingStatus(value: unknown): value is ResearchFindingStatus {
  return value === "active" || value === "conflicting" || value === "superseded";
}

function isResearchRiskStatus(value: unknown): value is ResearchRiskStatus {
  return value === "open" || value === "mitigated" || value === "accepted";
}

function inferResearchSourceKind(source: string): ResearchSourceKind {
  const normalized = source.trim().toLowerCase();
  if (/^https?:\/\//.test(normalized)) return "web";
  if (/\b(ecc|omo|trellis|superpowers|upstream)\b/.test(normalized) || normalized.includes("upstreams/")) return "upstream";
  if (/\.(ts|tsx|js|jsx|py|rs|go|cs|java|cpp|c|h)(?::|$)/.test(normalized) || normalized.startsWith("src/") || normalized.startsWith("tests/")) return "code";
  if (/\.(md|mdx|rst|txt)(?::|$)/.test(normalized) || normalized.startsWith("docs/")) return "doc";
  if (/\b(bash|shell|bun|npm|pnpm|cargo|go test)\b/.test(normalized)) return "command";
  return "user";
}

async function readResearchSourcePacksFile(root: string, taskId: string): Promise<ResearchSourcePack[]> {
  const sourcePacksPath = path.join(getProjectPaths(root).tasksDir, taskId, "research", "source-packs.json");
  if (!(await pathExists(sourcePacksPath))) return [];
  try {
    const parsed = JSON.parse(await readFile(sourcePacksPath, "utf8")) as unknown;
    const candidate = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as Record<string, unknown>).sourcePacks)
      ? (parsed as Record<string, unknown>).sourcePacks
      : [];
    return candidate.map(normalizeResearchSourcePack).filter(isDefined);
  } catch {
    return [];
  }
}

function mergeResearchSourcePacks(primary: ResearchSourcePack[], secondary: ResearchSourcePack[]): ResearchSourcePack[] {
  const seen = new Set<string>();
  const result: ResearchSourcePack[] = [];
  for (const pack of [...primary, ...secondary]) {
    if (seen.has(pack.id)) continue;
    seen.add(pack.id);
    result.push(pack);
  }
  return result;
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
  clarification: ClarificationState | undefined,
  research: ResearchState | undefined,
  prdReview: PrdReviewState,
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
    task.metadata ? `- Metadata: ${formatTaskMetadataInline(task.metadata)}` : undefined,
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
    "## PRD Review",
    "",
    formatPrdReviewSummary(prdReview, 8),
    "",
    "## Clarification",
    "",
    clarification ? formatClarificationSummary(clarification, 8) : "No clarification artifact recorded yet.",
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
    "## Research",
    "",
    research ? formatResearchSummary(research, 6) : "No research artifact recorded yet.",
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
      metadata: task.metadata ? {
        kind: task.metadata.kind,
        source: task.metadata.source,
        priority: task.metadata.priority,
        risk: task.metadata.risk,
        labels: task.metadata.labels,
        parentTaskId: task.metadata.relationships.parentTaskId,
        childTaskIds: task.metadata.relationships.childTaskIds,
      } : undefined,
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
  const childInfo = task.metadata?.childTaskIds.length ? `, children ${task.metadata.childTaskIds.length}` : "";
  const parentInfo = task.metadata?.parentTaskId ? `, parent ${task.metadata.parentTaskId}` : "";
  const metadata = task.metadata ? `, ${task.metadata.kind}/${task.metadata.source}/${task.metadata.priority}/${task.metadata.risk}${childInfo}${parentInfo}` : "";
  return `- ${task.id} [${task.status}/${task.phase}, ${task.readiness}${metadata}] ${task.title} - acceptance ${task.acceptanceDone}/${task.acceptanceTotal}, checks ${task.verificationChecks}${latest}`;
}

async function buildTaskSnapshot(root: string, task: TaskState, reason: string): Promise<TaskSnapshot> {
  const currentTask = await loadTask(root, task.id) || task;
  const [acceptance, plan, verification, verificationStrategy, events, handoff, research, clarification] = await Promise.all([
    readAcceptance(root, currentTask.id),
    readPlan(root, currentTask.id),
    readVerification(root, currentTask.id),
    readVerificationStrategy(root, currentTask.id),
    readTaskEvents(root, currentTask.id),
    readTaskHandoff(root, currentTask.id),
    readTaskResearch(root, currentTask.id),
    readTaskClarification(root, currentTask.id),
  ]);
  const resume = await writeTaskResume(root, currentTask, reason);
  const readiness = await writeTaskReadiness(root, currentTask, reason);
  const info = await writeTaskInfo(root, currentTask, reason);
  const subtaskSummary = await formatSubtaskTreeSummary(root, currentTask, 12);
  const subtaskPlan = await readSubtaskPlan(root, currentTask.id);
  const roles = await readRoleOrchestration(root, currentTask.id);
  const remediation = await readVerificationRemediationPlan(root, currentTask.id);
  const prdReview = await writePrdReview(root, currentTask, reason);
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
    summary: summarizeSnapshot(currentTask, acceptance, plan, verification, readiness, clarification, prdReview),
    task: currentTask,
    acceptance,
    plan,
    verification,
    verificationStrategy,
    remediation,
    resume,
    readiness,
    recentEvents,
    touchedFiles: resume.touchedFiles,
    clarification,
    subtasks: subtaskSummary,
    subtaskPlan,
    roles,
    research,
    prdReview,
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
    "## PRD Review",
    "",
    snapshot.prdReview ? formatPrdReviewSummary(snapshot.prdReview, 8) : "No PRD review artifact recorded yet.",
    "",
    "## Metadata",
    "",
    snapshot.task.metadata ? formatTaskMetadataSummary(snapshot.task.metadata, 12) : "No task metadata recorded yet.",
    "",
    "## Subtasks",
    "",
    snapshot.subtasks || "No subtasks recorded.",
    "",
    "## Subtask Plan",
    "",
    snapshot.subtaskPlan ? formatSubtaskPlanSummary(snapshot.subtaskPlan, 12) : "No subtask plan recorded yet.",
    "",
    "## Role Orchestration",
    "",
    snapshot.roles ? formatRoleOrchestrationSummary(snapshot.roles, 3) : "No role orchestration plan recorded yet.",
    "",
    "## Clarification",
    "",
    snapshot.clarification ? formatClarificationSummary(snapshot.clarification, 12) : "No clarification artifact recorded yet.",
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
    "## Verification Remediation",
    "",
    snapshot.remediation ? formatVerificationRemediationSummary(snapshot.remediation) : "No verification remediation loop recorded yet.",
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
    snapshot.task.metadata ? `metadata: ${formatTaskMetadataInline(snapshot.task.metadata)}` : undefined,
    snapshot.subtasks && snapshot.subtasks !== "No subtasks recorded." ? `subtasks: ${snapshot.subtasks.split(/\r?\n/)[0]}` : undefined,
    snapshot.subtaskPlan && snapshot.subtaskPlan.items.length > 0 ? `subtask plan: ${countSubtaskPlanItems(snapshot.subtaskPlan.items).suggested} suggested` : undefined,
    snapshot.roles ? `roles: ${formatRoleOrchestrationSummary(snapshot.roles, 3).split(/\r?\n/)[0]}` : undefined,
    snapshot.remediation ? formatVerificationRemediationSummary(snapshot.remediation) : undefined,
    snapshot.clarification ? `clarification: ${snapshot.clarification.status}` : undefined,
    snapshot.prdReview ? `prd review: ${snapshot.prdReview.stage}/${snapshot.prdReview.promotion.ready ? "ready" : "blocked"}` : undefined,
    `acceptance: ${snapshot.acceptance.items.filter(item => item.status === "done").length}/${snapshot.acceptance.items.length} done`,
    `verification: ${snapshot.verification.checks.length} check(s)`,
    `touched files: ${snapshot.touchedFiles.length}`,
  ].filter(line => line !== undefined).join("\n");
}

function formatSnapshotContext(snapshot: TaskSnapshot, max = 1200): string {
  const content = [
    `- updated: ${snapshot.updatedAt}`,
    `- summary: ${snapshot.summary}`,
    `- next action: ${snapshot.resume.nextAction}`,
    `- readiness: ${snapshot.readiness.status}`,
    snapshot.task.metadata ? `- metadata: ${formatTaskMetadataInline(snapshot.task.metadata)}` : "- metadata: none",
    snapshot.subtasks && snapshot.subtasks !== "No subtasks recorded." ? `- subtasks: ${snapshot.subtasks.replace(/\r?\n/g, "; ")}` : "- subtasks: none",
    snapshot.subtaskPlan && snapshot.subtaskPlan.items.length > 0 ? `- subtask plan: ${formatSubtaskPlanSummary(snapshot.subtaskPlan, 4).replace(/\r?\n/g, "; ")}` : "- subtask plan: none",
    snapshot.roles ? `- roles: ${formatRoleOrchestrationSummary(snapshot.roles, 3).replace(/\r?\n/g, "; ")}` : "- roles: none",
    snapshot.remediation ? `- remediation: ${formatVerificationRemediationSummary(snapshot.remediation)}` : "- remediation: none",
    snapshot.clarification ? `- clarification: ${snapshot.clarification.status}, ${openClarificationQuestions(snapshot.clarification).length} open` : "- clarification: none",
    snapshot.prdReview ? `- prd review: ${snapshot.prdReview.stage}, ready ${snapshot.prdReview.promotion.ready ? "yes" : "no"}, blockers ${snapshot.prdReview.promotion.blockers.length}, warnings ${snapshot.prdReview.promotion.warnings.length}` : "- prd review: none",
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
  clarification?: ClarificationState,
  prdReview?: PrdReviewState,
): string {
  const doneAcceptance = acceptance.items.filter(item => item.status === "done").length;
  const donePlan = plan.steps.filter(step => step.status === "done").length;
  const lastCheck = verification.checks.at(-1);
  return [
    `${task.id} is ${task.status}/${task.phase}.`,
    `Acceptance ${doneAcceptance}/${acceptance.items.length} done.`,
    `Plan ${donePlan}/${plan.steps.length} done.`,
    task.metadata ? `Metadata ${formatTaskMetadataInline(task.metadata)}.` : undefined,
    clarification ? `Clarification is ${clarification.status}.` : undefined,
    prdReview ? `PRD review is ${prdReview.stage}/${prdReview.promotion.ready ? "ready" : "blocked"}.` : undefined,
    lastCheck ? `Latest verification ${lastCheck.success ? "passed" : "failed"}: ${lastCheck.command || lastCheck.toolName}.` : "No verification recorded.",
    `Finish readiness is ${readiness.status}.`,
  ].filter(line => line !== undefined).join(" ");
}

function formatSnapshotVerification(verification: VerificationState): string {
  if (verification.checks.length === 0) return "No verification checks recorded yet.";
  return verification.checks.slice(-10).map(check =>
    `- ${check.success ? "pass" : "fail"} ${check.command || check.toolName} (${check.timestamp})${check.summary ? ` - ${summarizeUnknown(check.summary, 180)}` : ""}`,
  ).join("\n");
}

function taskNeedsResearchSourcePack(task: TaskState): boolean {
  const metadata = task.metadata;
  const text = [
    task.title,
    task.initialPrompt,
    task.lastPrompt,
    metadata?.kind,
    metadata?.source,
    ...(metadata?.labels || []),
  ].filter(Boolean).join(" ").toLowerCase();
  return /\b(upstream|parity|trellis|everything claude code|ecc|oh my openagent|omo|superpowers)\b/.test(text) || /(上游|同等|参考)/.test(text);
}

function buildResearchReadinessSignals(research: ResearchState | undefined): { warnings: string[]; nextActions: string[]; passes: string[] } {
  if (!research) {
    return {
      warnings: ["No reviewed research source pack recorded for upstream/parity work."],
      nextActions: ["Add reviewed evidence with /research:add-source or draft local evidence with /research:extract-source before final review."],
      passes: [],
    };
  }
  const warnings: string[] = [];
  const nextActions: string[] = [];
  const passes: string[] = [];
  const reviewed = research.sourcePacks.filter(pack => pack.reviewStatus === "reviewed");
  const draft = research.sourcePacks.filter(pack => pack.reviewStatus === "draft");
  const openQuestions = research.questions.filter(question => question.status === "open" || question.status === "blocked");
  const lowConfidence = research.sourcePacks.filter(pack => pack.confidence === "low");
  const stale = research.sourcePacks.filter(pack => pack.staleAfter && Date.parse(pack.staleAfter) < Date.now());
  const conflicts = research.findingRecords.filter(finding => finding.status === "conflicting");
  const openRisks = research.riskRecords.filter(risk => risk.status === "open");

  if (reviewed.length === 0) {
    warnings.push("No reviewed research source pack recorded for upstream/parity work.");
    nextActions.push("Review a draft source with /research:review or add a reviewed source with /research:add-source.");
  } else {
    passes.push(`Reviewed research source packs recorded: ${reviewed.length}.`);
  }
  if (openQuestions.length > 0) {
    warnings.push(`${openQuestions.length} research question(s) remain open or blocked.`);
    nextActions.push(`Answer or block ${openQuestions[0]?.id}: ${openQuestions[0]?.text}`);
  }
  if (draft.length > 0) {
    warnings.push(`${draft.length} draft research source pack(s) still need review.`);
    nextActions.push(`Review draft source pack ${draft[0]?.id} with /research:review.`);
  }
  if (lowConfidence.length > 0 && reviewed.length < 2) {
    warnings.push("Low-confidence research evidence has no second reviewed source.");
    nextActions.push("Add a second reviewed source or raise confidence with reviewed evidence.");
  }
  if (stale.length > 0) {
    warnings.push(`${stale.length} research source pack(s) are stale.`);
    nextActions.push(`Refresh stale source pack ${stale[0]?.id}.`);
  }
  if (conflicts.length > 0) {
    warnings.push(`${conflicts.length} conflicting research finding(s) remain unresolved.`);
    nextActions.push(`Resolve conflicting finding ${conflicts[0]?.id}.`);
  }
  if (openRisks.length > 0) {
    warnings.push(`${openRisks.length} open research risk(s) remain.`);
    nextActions.push(`Mitigate or accept research risk ${openRisks[0]?.id}.`);
  }
  return { warnings, nextActions, passes };
}

async function buildReadinessState(root: string, task: TaskState, reason: string): Promise<ReadinessState> {
  const currentTask = await loadTask(root, task.id) || task;
  const [acceptance, verification, plan, clarification, strategy, research, remediation] = await Promise.all([
    readAcceptance(root, currentTask.id),
    readVerification(root, currentTask.id),
    readPlan(root, currentTask.id),
    readTaskClarification(root, currentTask.id),
    readVerificationStrategy(root, currentTask.id),
    readTaskResearch(root, currentTask.id),
    readVerificationRemediationPlan(root, currentTask.id),
  ]);
  const blockers: string[] = [];
  const warnings: string[] = [];
  const passes: string[] = [];
  const nextActions: string[] = [];
  const prdReview = await buildPrdReviewState(root, currentTask, reason, { acceptance, plan, verificationStrategy: strategy, clarification, research });

  if (clarification?.enabled && clarification.required && clarification.status === "collecting") {
    blockers.push(`${openClarificationQuestions(clarification).length} required clarification question(s) remain open.`);
    const current = getCurrentClarificationQuestion(clarification);
    nextActions.push(current ? `Answer /task:clarify for ${current.id}: ${current.text}` : "Answer remaining /task:clarify questions.");
  } else if (clarification?.enabled && (clarification.status === "ready" || clarification.status === "skipped")) {
    passes.push(`Clarification ${clarification.status}.`);
  }

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
  if (remediation && remediation.failedChecks.length > 0 && remediation.status !== "resolved") {
    warnings.push(`Verification remediation pending: ${formatVerificationRemediationSummary(remediation)}.`);
    nextActions.push(...remediation.nextActions.slice(0, 4));
  } else if (remediation?.status === "resolved") {
    passes.push(`Verification remediation resolved: ${formatVerificationRemediationSummary(remediation)}.`);
  }
  if (strategy.policy.coverageGaps.length > 0 && verification.checks.length > 0) {
    warnings.push(`${strategy.policy.coverageGaps.length} verification coverage gap(s) remain.`);
    nextActions.push(...strategy.policy.coverageGaps.slice(0, 4));
  }
  if (taskNeedsResearchSourcePack(currentTask)) {
    const researchSignals = buildResearchReadinessSignals(research);
    warnings.push(...researchSignals.warnings);
    nextActions.push(...researchSignals.nextActions);
    passes.push(...researchSignals.passes);
  }

  if (prdReview.promotion.blockers.length > 0) {
    blockers.push(`${prdReview.promotion.blockers.length} PRD/plan promotion blocker(s) remain.`);
    nextActions.push(...prdReview.promotion.nextActions.slice(0, 4));
  } else {
    passes.push(`PRD/plan promotion gate ready: ${prdReview.stage} (${prdReview.promotion.warnings.length} warning(s)).`);
  }

  if (currentTask.counters.failedToolCalls > 0) {
    warnings.push(`${currentTask.counters.failedToolCalls} failed tool call(s) were recorded.`);
  }

  const childTaskIds = currentTask.metadata?.relationships.childTaskIds || [];
  if (childTaskIds.length > 0) {
    const childTasks = (await Promise.all(childTaskIds.map(childId => loadTask(root, childId)))).filter(isDefined);
    const unfinishedChildren = childTasks.filter(child => child.status !== "finished");
    const finishedChildren = childTasks.filter(child => child.status === "finished");
    if (unfinishedChildren.length > 0) {
      blockers.push(`${unfinishedChildren.length} child task(s) are not finished.`);
      nextActions.push(...unfinishedChildren.slice(0, 4).map(child => `Finish child ${child.id}: ${child.title}`));
    }
    if (finishedChildren.length > 0 && unfinishedChildren.length === 0) {
      passes.push(`Child tasks complete: ${finishedChildren.length}/${childTasks.length}.`);
    }
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
  const [events, acceptance, verification, plan, clarification, strategy] = await Promise.all([
    readTaskEvents(root, currentTask.id),
    readAcceptance(root, currentTask.id),
    readVerification(root, currentTask.id),
    readPlan(root, currentTask.id),
    readTaskClarification(root, currentTask.id),
    readVerificationStrategy(root, currentTask.id),
  ]);
  const failedVerificationChecks = verification.checks.filter(check => !check.success);
  return {
    taskId: currentTask.id,
    updatedAt: new Date().toISOString(),
    nextAction: deriveNextAction(currentTask, plan, acceptance, failedVerificationChecks, clarification),
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
    verificationCoverageGaps: strategy.policy.coverageGaps.slice(0, 12),
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
    "## Verification Coverage Gaps",
    "",
    formatResumeList(resume.verificationCoverageGaps, "No verification coverage gaps recorded."),
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
  clarification?: ClarificationState,
): string {
  if (clarification?.enabled && clarification.required && clarification.status === "collecting") {
    const current = getCurrentClarificationQuestion(clarification);
    return current
      ? `Answer clarification ${current.id}: ${current.text}`
      : "Continue the clarification loop before planning or implementing.";
  }

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

  if (event.type === "research_source_added") {
    const source = typeof data.source === "string" ? data.source : "source";
    const confidence = typeof data.confidence === "string" ? ` [${data.confidence}]` : "";
    return `source ${data.id || "pack"}: ${source}${confidence}`;
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
    resume.verificationCoverageGaps.length > 0 ? `- verification coverage gaps: ${resume.verificationCoverageGaps.slice(0, 3).join("; ")}` : "- verification coverage gaps: none recorded",
    resume.touchedFiles.length > 0 ? `- touched files: ${resume.touchedFiles.slice(0, 8).join(", ")}` : "- touched files: none inferred",
    resume.recentEvents.length > 0
      ? `- recent events: ${resume.recentEvents.slice(-5).map(event => `${event.type} ${event.summary}`).join("; ")}`
      : "- recent events: none recorded",
  ];
  const content = lines.join("\n");
  return content.length <= max ? content : `${content.slice(0, max)}\n[Resume truncated by Project Flow]`;
}

export function formatTaskMetadataInline(metadata: TaskMetadata): string {
  const labels = metadata.labels.length > 0 ? ` labels=${metadata.labels.slice(0, 5).join(",")}` : "";
  const relation = metadata.relationships.parentTaskId ? ` parent=${metadata.relationships.parentTaskId}` : "";
  const owner = metadata.assignee ? ` assignee=${metadata.assignee}` : "";
  return `${metadata.kind}/${metadata.source} priority=${metadata.priority} risk=${metadata.risk}${labels}${relation}${owner}`;
}

export function formatTaskMetadataSummary(metadata: TaskMetadata, maxLabels = 8): string {
  return [
    `schema: ${metadata.schemaVersion}`,
    `kind: ${metadata.kind}`,
    `source: ${metadata.source}`,
    `priority: ${metadata.priority}`,
    `risk: ${metadata.risk}`,
    `labels: ${metadata.labels.slice(0, maxLabels).join(", ") || "none"}`,
    metadata.assignee ? `assignee: ${metadata.assignee}` : undefined,
    metadata.branch ? `branch: ${metadata.branch}` : undefined,
    metadata.prUrl ? `pr: ${metadata.prUrl}` : undefined,
    metadata.relationships.parentTaskId ? `parent: ${metadata.relationships.parentTaskId}` : undefined,
    metadata.relationships.childTaskIds.length > 0 ? `children: ${metadata.relationships.childTaskIds.slice(0, 8).join(", ")}` : undefined,
    metadata.relationships.relatedTaskIds.length > 0 ? `related tasks: ${metadata.relationships.relatedTaskIds.slice(0, 8).join(", ")}` : undefined,
    metadata.relatedSpecs.length > 0 ? `related specs: ${metadata.relatedSpecs.slice(0, 8).join(", ")}` : undefined,
    metadata.origin.toolName ? `origin tool: ${metadata.origin.toolName}` : undefined,
    metadata.origin.command ? `origin command: ${summarizeUnknown(metadata.origin.command, 180)}` : undefined,
    metadata.origin.note ? `origin note: ${summarizeUnknown(metadata.origin.note, 180)}` : undefined,
    `created: ${metadata.createdAt}`,
    `updated: ${metadata.updatedAt}`,
  ].filter((line): line is string => line !== undefined).join("\n");
}

function formatResearchContext(research: ResearchState, info?: string, max = 1400): string {
  const lines = [
    `- updated: ${research.updatedAt}`,
    `- items: ${research.items.length}`,
    `- source packs: ${research.sourcePacks.length}${research.sourcePacks.length > 0 ? ` (${summarizeResearchConfidence(research.sourcePacks)})` : ""}`,
    research.openQuestions.length > 0 ? `- open questions: ${research.openQuestions.slice(0, 4).join("; ")}` : "- open questions: none recorded",
    research.findings.length > 0 ? `- findings: ${research.findings.slice(0, 4).join("; ")}` : "- findings: none recorded",
    research.openRisks.length > 0 ? `- open risks: ${research.openRisks.slice(0, 4).join("; ")}` : "- open risks: none recorded",
    research.decisions.length > 0 ? `- decisions: ${research.decisions.slice(0, 4).join("; ")}` : "- decisions: none recorded",
    research.sourcePacks.length > 0
      ? `- reviewed sources: ${research.sourcePacks.slice(-4).map(pack => `${pack.id} ${pack.source} [${pack.confidence}]`).join("; ")}`
      : "- reviewed sources: none recorded",
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
  clarification?: ClarificationState,
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
    clarification ? `- Clarification: ${clarification.status}, ${clarification.questions.filter(question => question.status === "answered").length} answered` : undefined,
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
