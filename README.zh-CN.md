# omp-project-flow

[English](./README.md) | [简体中文](./README.zh-CN.md)

Project Flow 是一个面向 Oh My Pi 的项目工作流、任务状态和规范注入插件。

状态：preview / beta。本仓库用于本地安装 Oh My Pi 插件，不用于发布 npm 包。

这个插件为 agent 项目开发提供一套原生工作流：

- 持久化项目规范
- 可审阅的规范提案
- 任务 PRD，并自动提取目标、约束、验收条件和开放问题
- 稳定任务 metadata：source、kind、priority、risk、labels、origin 和关系字段
- 父子 subtask tree，并汇总子任务 readiness
- 一问一答式 PRD 澄清流程
- 任务 research artifacts 和 `info.md` 技术笔记
- 结构化计划状态
- 验收状态
- 用于恢复中断工作的 handoff 摘要
- resume pack：下一步、最近事件、触碰文件、未完成验收和失败检查
- finish readiness gate：基于验收、计划和验证信号判断是否可以收尾
- task snapshot：用于审阅、交接、issue 和 pull request 的任务快照
- project overview：跨 active、paused、finished、blocked 和 proposed work 的项目总览
- upstream sync report：跟踪 ECC/OMO 启发能力和本地覆盖差距
- workflow 状态
- 工具调用事件日志
- 验证记录
- 验证命令建议
- workspace journal
- 自动隐藏上下文注入

运行时状态保存在项目本地 `.project-flow/` 目录中。插件代码通过 Oh My Pi 安装，但项目工作流数据不会写入 OMP 原生 `.omp/` 目录。

## 本地安装

克隆仓库：

```powershell
git clone git@github.com:springkai66/omp-project-flow.git
cd omp-project-flow
bun install
```

安装到 Oh My Pi：

```powershell
.\scripts\install-local.ps1 -Force
```

然后在项目中启动 Oh My Pi：

```powershell
omp
```

检查安装状态：

```powershell
omp plugin doctor
omp plugin list
```

## 自动流程

正常使用时不需要手动输入命令。

当用户提示看起来像代码工作时，扩展会自动：

1. 创建或恢复 active task
2. 写入 `.project-flow/tasks/<task-id>/prd.md`
3. 在 `task.json` 内保存稳定任务 metadata
4. 在 metadata 中追踪父子任务关系
5. 当 PRD 存在开放问题时创建 `clarification.json` 和 `clarification.md`
6. 创建 `research/research.json`、`research/notes.md` 和 `info.md`
7. 创建 `plan.json` 和 `plan.md`
8. 从 `.project-flow/spec` 读取相关规范
9. 在 agent 启动前注入隐藏的 project flow context
10. 将工具事件记录到 `events.jsonl`
11. 将 test/check/lint 风格命令记录到 `verification.json`
12. 在 `verification-strategy.json` 中建议验证命令
13. 在 `acceptance.json` 中维护验收状态
14. 任务完成时创建可审阅的 spec proposal
15. 刷新可恢复的 `handoff.md`
16. 刷新 `resume.json` 和 `resume.md`
17. 刷新 `readiness.json` 和 `readiness.md`
18. 刷新 `snapshot.json` 和 `snapshot.md`
19. 刷新项目级 `workspace/overview.json` 和 `workspace/overview.md`
20. 当关键完成信号缺失时阻止 `/task:finish`，除非提供 `--force`
21. 将 turn journal 写入 `.project-flow/workspace/journals`
22. 将上游同步审查包写入 `.project-flow/upstreams`

## 命令

命令主要用于诊断、检查和手动控制：

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
/task:info [id-prefix-or-title]
/task:metadata [id-prefix-or-title]
/task:child <prompt>
/task:tree [id-prefix-or-title]
/task:subtasks [--refresh|--apply] [--mode off|suggest|auto] [id-prefix-or-title]
/task:roles [--refresh|--start|--done|--block <research|implement|check>] [id-prefix-or-title] [note]
/task:clarify [answer|--refine|--skip note|--finish [--force]]
/task:finish [--force] [note]
/task:pause [note]
/clarify:start [id-prefix-or-title] [--max N]
/clarify:status [id-prefix-or-title]
/clarify:answer <answer>
/clarify:skip [reason]
/clarify:finish [--force] [note]
/prd:refine [id-prefix-or-title] [--axes a,b] [--max N]
/research:status [id-prefix-or-title]
/research:add <note>
/plan:status [id-prefix-or-title]
/plan:next [id-prefix-or-title]
/plan:done [id] [evidence]
/plan:block [id] [reason]
/plan:open [id] [note]
/verify:status [id-prefix-or-title]
/verify:suggest [id-prefix-or-title]
/verify:refresh [id-prefix-or-title]
/verify:remediate [--refresh|--start|--pass|--fail|--stop] [id-prefix-or-title] [note]
/acceptance:status [id-prefix-or-title]
/acceptance:done <id> [evidence]
/acceptance:block <id> [reason]
/acceptance:open <id> [note]
/spec:update [note]
/spec:proposals
/spec:show <id-prefix-or-title>
/spec:apply <id-prefix-or-title>
/sources:check
/upstream:status
/upstream:report
/upstream:review <source-id> <reference> [note]
/upstream:sync [note]
```

普通工作不需要命令。任务命令适合在你想检查、恢复或切换长期任务时使用。

Subtask 规划策略由 `autoSubtaskMode` 插件设置控制：`off` 禁用新 root task 的自动计划，`suggest` 只记录可审阅建议，`auto` 会从建议中创建已关联 child tasks。项目级覆盖可在 `.omp/plugin-overrides.json` 或 `.pi/plugin-overrides.json` 中设置 `settings["omp-project-flow"].autoSubtaskMode`。`/task:subtasks --mode off|suggest|auto` 可对单个任务用显式策略重新生成计划。

Role orchestration handoff 会写入每个任务的 `roles/` 目录。`/task:roles` 查看 research/implement/check 所有权计划，`/task:roles --refresh` 按当前任务状态重新生成 prompts，`/task:roles --start|--done|--block <role> [note]` 记录角色进度，同时仍由主 OMP runtime 控制执行。

当初始 PRD 有开放问题时，clarification 会自动进入一问一答流程。必需澄清仍在 collecting 时，下一条普通用户输入会被记录为当前问题答案，隐藏上下文会要求 agent 只问下一题，暂不进入计划或实现。日常使用 `/task:clarify` 即可；`/task:clarify --refine` 或 `/prd:refine` 会围绕 goal/scope/users/acceptance/constraints/non-goals/verification/risk 运行聚焦 PRD refinement；需要显式控制时可以用 `/clarify:*` 系列命令。

上游命令用于 ECC 或 OMO 升级后的受控同步。它们会刷新本地同步报告、标记某个上游版本已审，或创建一个普通 Project Flow 任务来适配有价值的方案。

`info.md` 会在任务创建时生成一次，之后不会被 Project Flow 自动覆盖，适合写人工技术笔记。`research/notes.md` 是从 `research/research.json` 生成的摘要；长期 research note 建议用 `/research:add` 记录，或把自由格式人工笔记写入 `info.md`。

## 项目目录

```text
.project-flow/
  spec/
    README.md
  spec-proposals/
    S-YYYYMMDD-slug.md
  upstreams/
    sources.json
    capabilities.json
    sync-report.json
    sync-report.md
  workspace/
    overview.json
    overview.md
    journals/
  tasks/
    T-YYYYMMDD-slug/
      task.json
      prd.md
      clarification.json
      clarification.md
      info.md
      research/
        research.json
        notes.md
      acceptance.json
      handoff.md
      resume.json
      resume.md
      readiness.json
      readiness.md
      snapshot.json
      snapshot.md
      subtasks/
        plan.json
        plan.md
      roles/
        plan.json
        plan.md
        research.md
        implement.md
        check.md
      plan.json
      plan.md
      events.jsonl
      verification.json
      verification-strategy.json
      verification-remediation.json
      verification-remediation.md
  workflow/
    active-task.json
    active-task-scopes.json
```

任务 metadata 存在每个 `task.json` 的 `metadata` 字段中。它只记录稳定、非派生信息，例如 `kind`、`source`、`priority`、`risk`、`labels`、`origin` 和任务关系。readiness、验证数量、触碰文件等派生状态仍由 snapshot/resume/readiness artifacts 生成。

当 OMP 暴露 session id 时，active task 指针会按 session 隔离。Project Flow 将这些指针保存在 `.project-flow/workflow/active-task-scopes.json`，并保留 `.project-flow/workflow/active-task.json` 作为 legacy 或无 session 场景的项目级兼容指针。Commands、lifecycle hooks、tool events、turn journal 和 status 更新都会从当前 session scope 解析 active task。

Subtask 是通过 `metadata.relationships.parentTaskId` 和 `childTaskIds` 关联的普通任务。Project Flow 会为复杂 root task 在 `subtasks/plan.json` 和 `subtasks/plan.md` 下生成受控子任务计划；每个计划都会记录确定性的 complexity scoring，以及当前 `off`、`suggest` 或 `auto` 策略。使用 `/task:subtasks` 查看建议，`/task:subtasks --refresh` 重新生成，`/task:subtasks --mode auto --refresh` 重新生成并立即创建 child tasks，`/task:subtasks --apply` 从现有建议创建已关联 child tasks。也可以用 `/task:child <prompt>` 手动创建子任务，用 `/task:tree` 查看任务树。当子任务尚未完成时，父任务 readiness 会阻止收尾；仍可用 `/task:finish --force` 覆盖。

Role orchestration 会记录 research、implementation、verification/review 的 role prompt、负责 artifacts、预期输出和角色本地 checks。它本身不会启动独立 agent；它提供明确 handoff packets 和状态追踪，让主 OMP 会话或手动启动的角色 agent 不需要猜测所有权。

验证建议会从常见项目文件中推断，例如 `package.json`、`pyproject.toml`、`pytest.ini`、`Cargo.toml`、`go.mod`、`.sln`、`.csproj` 和 `Makefile`。当检查失败时，`/verify:remediate` 会创建 opt-in 修复循环，记录失败检查证据、有界 attempts、stop conditions，以及显式 pass/fail/stop 状态。它不会静默运行修复或验证命令；循环只记录 agent/user 选择做什么，以及返回了什么证据。

Spec proposal 会保存在 `.project-flow/spec-proposals/` 下供审阅。除非显式运行 `/spec:apply`，它们不会应用到 `.project-flow/spec/`。

## 设计说明

- OMO 启发了可恢复的 workflow state。
- ECC 启发了小型可组合 hook 和可审阅 source pack 的思路。
- Oh My Pi 仍然是执行运行时。

规范更新会被建议出来，而不是静默应用。

上游同步也是受控流程。Project Flow 会跟踪上游来源和能力覆盖状态，但不会自动合并或执行上游代码。

审查流程见 [docs/upstream-sync.md](./docs/upstream-sync.md)。

## 开发

```powershell
bun run check
bun test
```

本包设置了 `private: true`，避免意外发布到 npm。

## 许可证

MIT。见 [LICENSE](./LICENSE)。

## 版本记录

### 0.21.0

- 新增 focused PRD refinement mode，命令为 `/prd:refine` 和 `/task:clarify --refine`。
- PRD refinement 会按 required axis 一次只问一个问题，并把答案写入 draft PRD。
- Refined PRD 状态现在进入 clarification artifacts、task PRD、隐藏上下文、readiness、handoff 和 snapshots。

### 0.20.0

- 新增 `.project-flow/workflow/active-task-scopes.json`，用于 session-scoped active task 指针。
- Commands、lifecycle hooks、tool events、turn journals 和 status 现在使用当前 OMP session scope。
- 保留 `.project-flow/workflow/active-task.json` 作为项目级兼容指针。

### 0.19.0

- 新增 opt-in verification remediation loop artifacts 和 `/verify:remediate`。
- Remediation attempts 现在记录失败检查、重跑命令、证据、attempt 限制和 stop conditions。
- Remediation 摘要现在进入 task info、snapshots 和隐藏上下文。

### 0.18.0

- 新增 `roles/` 下的 research/implement/check role orchestration handoffs。
- 新增 `/task:roles`，用于查看、刷新和标记角色状态。
- Role 摘要现在进入 task info、snapshots 和隐藏上下文。

### 0.17.0

- 暴露 `autoSubtaskMode`，支持 `off`、`suggest` 和 `auto` 策略。
- 支持通过 `.omp/plugin-overrides.json` 和 `.pi/plugin-overrides.json` 做项目级覆盖。
- 子任务计划和摘要现在包含确定性的 complexity scoring。
- 新增 `/task:subtasks --mode off|suggest|auto` 以及快捷 flag。

### 0.16.0

- 新增 Auto Subtask Planner v1：生成子任务建议。
- 新增 `/task:subtasks [--refresh|--apply] [id-prefix-or-title]`。
- 子任务计划摘要现在会进入隐藏上下文、task info 和 snapshot。
- 应用子任务计划会创建已关联的 child tasks，并保持 parent task 为 active。

### 0.15.0

- 新增 Subtask Trees v1：父子任务关系。
- 新增 `/task:child <prompt>` 和 `/task:tree [id-prefix-or-title]`。
- 父任务 readiness 现在会汇总未完成子任务。
- 子任务摘要现在会进入隐藏上下文、task info、snapshot、project overview 和 task tree 输出。

### 0.14.0

- 新增 Task Metadata v1，存储在 `task.json` 内。
- Metadata 记录稳定任务字段：kind、source、priority、risk、labels、origin、relationships、related specs 和 custom values。
- 新增 `/task:metadata [id-prefix-or-title]`。
- Metadata 摘要现在会进入 task status、隐藏上下文、handoff、task info、snapshot 和 project overview。
- 工具推断任务和 upstream sync 任务现在会记录不同的 metadata source 和 origin。

### 0.13.0

- 新增任务 PRD clarification artifacts：`clarification.json` 和 `clarification.md`。
- 新增 `/task:clarify` 和 `/clarify:start/status/answer/skip/finish`。
- 当必需 clarification 仍在 collecting 时，下一条普通用户输入会自动记录为当前问题答案。
- Clarification 状态现在会进入隐藏上下文、handoff、resume pack、readiness、snapshot、task info、PRD 和 spec proposal。

### 0.12.0

- 新增任务 research artifacts：`research/research.json`、`research/notes.md` 和 `info.md`。
- 新增 `/task:info`、`/research:status` 和 `/research:add`。
- Research 摘要现在会进入 task snapshot、隐藏上下文和 spec proposal。

### 0.11.1

- 修复检查、排查、验证和故障定位类提示没有自动创建任务的问题。
- 新增工具事件兜底追踪：没有 active task 时，修改或验证工具也能补建任务。

### 0.11.0

- 新增 `.project-flow/upstreams/` 上游同步状态。
- 新增 `sources.json`、`capabilities.json`、`sync-report.json` 和 `sync-report.md`。
- 新增 `/upstream:status`、`/upstream:report`、`/upstream:review` 和 `/upstream:sync`。
- 当存在待审上游同步工作时，隐藏上下文会包含紧凑的 upstream sync next actions。

### 0.10.0

- 新增项目级 `workspace/overview.json` 和 `workspace/overview.md`。
- 新增 `/flow:overview`。
- `/flow:status` 现在包含任务总数、readiness 汇总和 proposed spec 数量。
- Project overview 汇总 active task、task readiness、next actions、blocked tasks 和 spec proposals。

### 0.9.0

- 新增每个任务的 `snapshot.json` 和 `snapshot.md` review pack。
- 新增 `/task:snapshot [id-prefix-or-title]`。
- Snapshot 汇总 task 元数据、acceptance、plan、verification、verification suggestions、resume、readiness、recent events、touched files 和 handoff。
- 隐藏上下文现在包含紧凑的 task snapshot 摘要。

### 0.8.0

- 新增 finish readiness pack：`readiness.json` 和 `readiness.md`。
- 新增 `/task:readiness [id-prefix-or-title]`。
- 隐藏上下文和 task status 现在包含 finish readiness。
- 当 acceptance、plan 或 verification 信号未就绪时，`/task:finish` 会阻止收尾；可使用 `/task:finish --force` 覆盖。

### 0.7.0

- 新增每个任务的 `resume.json` 和 `resume.md`。
- Resume pack 记录 next action、recent events、touched files、open acceptance 和 failed checks。
- 隐藏上下文自动包含紧凑 resume 摘要。
- 新增 `/task:resume [id-prefix-or-title]`，用于从最新 resume pack 触发继续工作。

### 0.6.0

- 新增 `.project-flow/spec-proposals/` 用于保存可审阅 spec proposal。
- 新增 `/spec:proposals`、`/spec:show` 和 `/spec:apply`。
- `/spec:update` 现在创建本地 proposal，而不是直接要求 agent 修改 specs。
- 完成任务会创建 spec proposal，但应用仍需要显式命令。

### 0.5.0

- 新增 `verification-strategy.json` 用于保存建议验证命令。
- 新增 `/verify:suggest` 和 `/verify:refresh`。
- 隐藏上下文和 handoff 摘要现在包含验证建议。
- Strategy 检测支持常见 JavaScript、Python、Rust、Go、.NET 和 Makefile 项目。

### 0.4.0

- 新增 `plan.json` 用于结构化任务计划状态。
- 新增 `/plan:status`、`/plan:next`、`/plan:done`、`/plan:block` 和 `/plan:open`。
- 隐藏上下文现在包含计划状态和下一步计划。
- 工具和验证事件会轻量推进结构化计划。

### 0.3.0

- 新增 `acceptance.json` 用于保存每个任务的验收条件状态。
- 新增 `handoff.md`，会在提示、工具执行、暂停、完成和压缩前刷新。
- 隐藏上下文现在包含验收状态和最新 handoff 摘要。
- 新增 `/task:handoff` 和 `/acceptance:*` 命令。

### 0.2.0

- 新增任务列表、状态、展示和切换命令。
- 从初始请求中确定性提取 PRD。
- 新增对 test/check/lint 风格工具调用的验证记录。
- `/task:finish` 会在没有验证记录时提示。
