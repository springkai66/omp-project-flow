# omp-project-flow

[English](./README.md) | [简体中文](./README.zh-CN.md)

Project Flow 是一个面向 Oh My Pi 的项目工作流、任务状态和规范注入插件。

状态：preview / beta。本仓库用于本地安装 Oh My Pi 插件，不用于发布 npm 包。

这个插件为 agent 项目开发提供一套原生工作流：

- 持久化项目规范
- 可审阅的规范提案
- 任务 PRD，并自动提取目标、约束、验收条件和开放问题
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
3. 创建 `plan.json` 和 `plan.md`
4. 从 `.project-flow/spec` 读取相关规范
5. 在 agent 启动前注入隐藏的 project flow context
6. 将工具事件记录到 `events.jsonl`
7. 将 test/check/lint 风格命令记录到 `verification.json`
8. 在 `verification-strategy.json` 中建议验证命令
9. 在 `acceptance.json` 中维护验收状态
10. 任务完成时创建可审阅的 spec proposal
11. 刷新可恢复的 `handoff.md`
12. 刷新 `resume.json` 和 `resume.md`
13. 刷新 `readiness.json` 和 `readiness.md`
14. 刷新 `snapshot.json` 和 `snapshot.md`
15. 刷新项目级 `workspace/overview.json` 和 `workspace/overview.md`
16. 当关键完成信号缺失时阻止 `/task:finish`，除非提供 `--force`
17. 将 turn journal 写入 `.project-flow/workspace/journals`
18. 将上游同步审查包写入 `.project-flow/upstreams`

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
/task:finish [--force] [note]
/task:pause [note]
/plan:status [id-prefix-or-title]
/plan:next [id-prefix-or-title]
/plan:done [id] [evidence]
/plan:block [id] [reason]
/plan:open [id] [note]
/verify:status [id-prefix-or-title]
/verify:suggest [id-prefix-or-title]
/verify:refresh [id-prefix-or-title]
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

上游命令用于 ECC 或 OMO 升级后的受控同步。它们会刷新本地同步报告、标记某个上游版本已审，或创建一个普通 Project Flow 任务来适配有价值的方案。

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
      acceptance.json
      handoff.md
      resume.json
      resume.md
      readiness.json
      readiness.md
      snapshot.json
      snapshot.md
      plan.json
      plan.md
      events.jsonl
      verification.json
      verification-strategy.json
  workflow/
    active-task.json
```

验证建议会从常见项目文件中推断，例如 `package.json`、`pyproject.toml`、`pytest.ini`、`Cargo.toml`、`go.mod`、`.sln`、`.csproj` 和 `Makefile`。

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
