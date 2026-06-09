# Project Flow 相对 Trellis 的缺口清单

更新时间：2026-06-09

## 依据

本文件只记录 Project Flow 相对 Trellis 仍缺失、未闭环或只完成本地轻量版本的能力。旧版英文内容已移除。

对照来源：

- Trellis `core-rules/skills/process-gate/SKILL.md`：预合并流程门禁，固定输出 `MERGEABLE / NEEDS CHANGES / BLOCKED`，并为每个非通过项给出定位和修复建议。
- Trellis `core-rules/hooks.md`：三层钩子体系，包括 fast-local、heavy-gated、git-boundary。
- Trellis `engineering-process.md`：工程流程总则，包括规则继承、注册项目、审计、Definition of Done、文档纪律和反馈闭环。

## 总体结论

Project Flow 已经具备任务状态、验收项、计划、研究证据、PRD review、验证建议、验证失败分类、remediation next actions、handoff/resume/snapshot/context 等本地状态能力。

但相对 Trellis，Project Flow 仍主要是“记录与提示系统”，不是“强制流程门禁系统”。Trellis 的核心优势在于：规则可执行、检查可阻塞、失败有固定 verdict、项目间可继承、git 边界可兜底、定期审计可把问题重新纳入治理闭环。

## Oh My Pi 项目开发必备能力缺口

这一节从 Oh My Pi 作为“真实项目开发平台”的角度记录必备能力缺口。Project Flow 已经补上任务状态、验收、计划、研究证据、PRD review、验证建议、失败分类、remediation next actions、handoff/resume/snapshot/context 等基础能力；但平台层仍需要更强的工程闭环。

### 1. 项目级 Definition of Done

必备能力：

- 每个任务必须有机器可检查的完成条件。
- 完成时必须记录验收项、计划项、验证命令、退出码、变更文件、风险和证据。
- 缺少有效 receipt 时，finish readiness 应给出 blocker 或 warning。

当前缺口：

- Project Flow 已能记录验收、计划和验证，但 receipt schema 还不统一。
- “完成”仍依赖 agent 总结，缺少跨任务一致的证据格式。

### 2. 统一 process gate

必备能力：

- 在任务完成、提交或推送前输出统一工程门禁报告。
- 报告应覆盖 PR 卫生、secrets、bypass markers、tests/coverage、docs discipline、stack-specific gates。
- 输出稳定 verdict：`MERGEABLE / NEEDS CHANGES / BLOCKED`。

当前缺口：

- Project Flow 有 finish readiness 和 verification remediation，但还没有完整 process gate。
- 失败项缺少固定 finding block 和人工接受 warning 的记录机制。

### 3. 强验证策略与验证闭环

必备能力：

- 支持用户配置 typecheck、lint、unit test、integration test、e2e、build。
- 支持按项目栈、路径和变更类型选择必要验证。
- 验证失败后必须分类、记录证据、生成 next action，并阻止假完成。

当前缺口：

- Project Flow 可推断验证命令并记录结果，但验证策略主要靠自动识别。
- 还缺用户可声明的 verification/process policy。

### 4. git 边界保护

必备能力：

- 提交前检查 staged files。
- commit message 检查。
- push 前运行 gate。
- 阻止直接推送 protected branch。
- 检测 `--no-verify`、force push、hard reset、secrets 和危险 diff。

当前缺口：

- Project Flow 可以记录 git 操作，但没有 git-boundary 防线。
- 不应默认安装 hooks；应先做可审阅报告，再由用户 opt-in。

### 5. 安全与危险操作防护

必备能力：

- 拦截危险命令、敏感文件读取、破坏性 git 操作、数据库删除、secrets 访问。
- 对高风险操作要求明确确认。
- 所有 bypass 必须留下审计记录。

当前缺口：

- Project Flow 记录工具事件，但没有平台级 PreToolUse 风险拦截。
- OMP runtime 若未暴露稳定 hook，只能先实现报告型策略。

### 6. 代码审查 gate

必备能力：

- 对 edit-heavy diff 自动生成 code review。
- finding 应包含文件、行号、严重级别、问题、修复建议和置信度。
- critical finding 应阻塞完成。

当前缺口：

- Project Flow 有 check role handoff，但没有真正的自动 review gate。
- 缺少安全、性能、API 设计、测试覆盖、可维护性维度的统一审查。

### 7. UI 与可视化验证

必备能力：

- UI 文件变更后检查 dev server、打开页面、截图并记录 artifact。
- 截图不可用时给 advisory；工具可用且产物为空时 block。

当前缺口：

- Project Flow 没有 UI verify gate。
- 对前端项目仍主要依赖测试和人工判断。

### 8. 需求澄清与 PRD 深化

必备能力：

- 自动识别 goal、scope、user、acceptance、non-goals、constraints、verification、risk 的缺失项。
- 模糊需求必须一问一答澄清，不应由 agent 编造。
- 需求变更应有 diff 和决策记录。

当前状态：

- Project Flow 已有 `/prd:refine`、PRD review 和 acceptance coverage。
- 后续缺口主要是更强的交互式设计 review 和 agent-assisted planning。

### 9. 多 agent 编排

必备能力：

- 支持 researcher、implementer、reviewer、tester、designer、security reviewer 等角色。
- 每个角色都有输入、输出、owned files、expected artifacts、verification scope。
- 支持依赖、并行、冲突检测和子任务 rollup。

当前缺口：

- Project Flow 已有 role handoff packets，但还没有 runtime 级独立 agent 自动编排。
- 在 OMP 未暴露安全 agent/session API 前，只能保持显式、可审阅、手动启动。

### 10. 持久上下文与 session 恢复

必备能力：

- 记录 active task、分支、最近提交、dirty files、open risks、last verification、blocked reason。
- compact 前保存 context log，恢复后重新注入。

当前状态：

- Project Flow 已有 handoff/resume/snapshot/hidden context 和 session-scoped active task。
- 仍缺更完整的 session lifecycle hook 和跨 worktree context-log 策略。

### 11. 上游能力同步

必备能力：

- reviewed upstream snapshot。
- capability diff。
- evidence excerpt。
- source freshness 和 confidence。
- local status mapping。
- proposed implementation task。

当前缺口：

- Project Flow 有 upstream sync report，但上游变化仍主要靠人工 review。
- 缺少把 Trellis/ECC/OMO/Superpowers 新能力稳定映射为本地任务的闭环。

### 12. 审计与规则沉淀

必备能力：

- gotchas 记录。
- repeated issue clustering。
- drift audit。
- bypass audit。
- rule proposal。
- spec promotion。

当前缺口：

- Project Flow 有 spec proposals，但没有定期审计和重复问题聚类。
- 缺少把反复出现的问题提升为 durable rule 的自动建议机制。

### 13. 回滚与事故响应

必备能力：

- 变更批次记录。
- touched files snapshot。
- rollback plan。
- failed deployment / failed verification incident record。
- revert guidance。

当前缺口：

- Project Flow 记录任务过程，但没有专门的 rollback/incident artifact。
- 高风险变更缺少自动回滚方案提示。

### 14. 文档纪律

必备能力：

- 判断是否需要更新 README、CHANGELOG、docs、migration guide、API docs。
- 文档更新应发生在功能确认可工作之后。
- 文档不能替代实现。

当前状态：

- Project Flow 已将 docs discipline 纳入 gaps 和任务流程习惯。
- 仍缺 process gate 级的文档纪律检查。

## P0：最高优先级缺口

### 1. 预合并 process gate 尚未闭环

当前状态：

- Project Flow 可以记录验证命令、验收状态、计划状态和 finish readiness。
- `/verify:remediate` 可以生成失败分类和可审阅 next actions。
- 但这些能力主要服务于当前任务，不是完整的预合并门禁。

相对 Trellis 的缺口：

- 没有等价的 process gate 命令或技能。
- 没有固定的六类门禁：PR 卫生、密钥扫描、绕过标记、测试覆盖、文档纪律、栈特定检查。
- 没有统一 verdict：`MERGEABLE / NEEDS CHANGES / BLOCKED`。
- 没有为每个失败项输出稳定的 finding block：失败内容、位置、修复动作、是否允许人工接受 warning。
- 没有把 warning 的人工接受记录到 PR 或任务说明中。

建议闭环：

- 新增本地 `/process:gate` 或 `/task:gate`。
- 输出固定结构的门禁报告。
- 将门禁结果写入任务目录，并进入 readiness、handoff、snapshot、hidden context。
- 在未通过时阻止普通 finish，除非用户显式 force 并记录理由。

### 2. git-boundary 防线缺失

当前状态：

- Project Flow 可以记录 git 相关工具调用。
- 推送、提交、验证仍依赖用户或 agent 自觉执行。

相对 Trellis 的缺口：

- 没有 pre-commit、commit-msg、pre-push 的本地兜底策略。
- 没有阻止直接推送到 `main` / `master` 的策略。
- 没有检测 `--no-verify`、force push、hard reset 等绕过行为的持久审计。
- 没有在 push 前自动运行合并级 gate。
- 没有把 git 边界失败转成 Project Flow 可追踪的 finding。

建议闭环：

- 先实现 Project Flow 内部的 git 边界报告，不直接安装 hooks。
- 明确列出建议 hook、风险、触发条件和检测结果。
- 后续如要安装真实 git hooks，必须由用户显式命令触发。

### 3. Stop-time 强制验证未闭环

当前状态：

- Project Flow 可以推断验证命令并记录 pass/fail。
- finish readiness 会在没有验证或最新验证失败时阻塞。

相对 Trellis 的缺口：

- 没有 turn 结束时自动执行 Todo 检查、typecheck、lint、test 的 stop gate。
- 没有固定顺序的验证流水线。
- 没有按失败类型切片输出：typecheck/lint 取前部错误，test 取尾部断言。
- 没有预算上限、子目录作用域推断、monorepo 子树执行策略。
- 没有“打开的 todo 必须完成、放弃或说明原因”的强约束。

建议闭环：

- 在 Project Flow 中实现可审阅的 stop-check 计划和 receipt 检查。
- 如 OMP runtime 支持安全 Stop hook，再接入自动阻塞。
- 在没有 runtime hook 前，保持为本地显式命令，避免伪装自动执行。

### 4. Fast-local 反馈钩子未闭环

当前状态：

- Project Flow 通过工具事件记录 touched files。
- 没有对单次编辑立即做 per-file lint 或危险命令拦截。

相对 Trellis 的缺口：

- 没有 `block-destructive` 等价能力。
- 没有编辑后单文件 lint。
- 没有大输出或截断结果的即时提示策略。
- 没有 fast-local 与 heavy-gated 的分层预算。

建议闭环：

- 先实现本地策略矩阵：危险命令、敏感文件、单文件 lint、输出截断。
- 再根据 OMP 暴露的 tool hook 能力决定是否升级成真正阻塞钩子。

## P1：高优先级缺口

### 5. Definition of Done receipt 不完整

当前状态：

- Project Flow 记录验证事件、验收证据和 finish readiness。
- 已有任务 journal、handoff、snapshot。

相对 Trellis 的缺口：

- 没有统一 receipt marker，无法稳定表达命令、退出码和 diff 规模。
- 没有要求每次“完成”都携带可机器读取的 receipt。
- 没有把 receipt 与 finish gate、PR gate、验证记录统一起来。

建议闭环：

- 为 Project Flow 定义本地 receipt schema。
- 将最新有效 receipt 纳入 finish readiness。
- 对缺少 receipt 的完成动作给出 blocker 或 warning。

### 6. 规则继承与跨项目漂移审计缺失

当前状态：

- Project Flow 有 `.project-flow/spec/` 和 spec proposals。
- 规则主要在单仓库内生效。

相对 Trellis 的缺口：

- 没有父规则 / 子规则继承机制。
- 没有注册项目列表和临时豁免列表。
- 没有 parent-hook-drift 或 cross-project-process-audit。
- 没有“规则三次出现后提升为父规则”的治理流程。

建议闭环：

- 先实现单仓库内的规则漂移检查和 spec proposal 升级流程。
- 后续再支持多项目 registry，不默认扫描用户其他仓库。

### 7. 项目本地 stack profile 与可配置 gate 缺失

当前状态：

- Project Flow 可以根据 `package.json`、`Cargo.toml` 等推断验证建议。
- 验证策略矩阵已可记录覆盖状态。

相对 Trellis 的缺口：

- 没有 `local.config` 等价配置。
- 没有按项目声明 test/typecheck/lint 命令、PR 大小阈值、栈特定 validators。
- 没有 stack profile：web、native、Unity、n/a 等。
- 没有区分 canonical gates 和项目本地扩展 gates。

建议闭环：

- 增加 Project Flow verification/process policy 配置文件。
- 保持默认推断，但允许用户显式声明。
- 配置必须进入 readiness 与 gate 报告，避免静默失效。

### 8. 代码审查与 UI 验证未闭环

当前状态：

- Project Flow 有 role handoff，可记录 check role。
- 没有真正的自动 code review gate 或 UI screenshot gate。

相对 Trellis 的缺口：

- 没有 edit-heavy diff 触发的 code-review reviewer ladder。
- 没有 critical finding 阻塞策略。
- 没有 UI 文件变更后的 dev server 检查和截图 artifact。
- 没有“尝试失败 advisory、尝试后无 artifact 才 block”的细粒度决策表。

建议闭环：

- 先实现 review-plan 和 ui-verify-plan artifact。
- 只有在工具可用且用户同意时执行截图或 reviewer。
- 将 findings 和 artifacts 纳入 readiness。

### 9. 定期审计与反馈回路不足

当前状态：

- Project Flow 有 upstream sync report 和 research artifacts。
- 没有定期审计任务体系。

相对 Trellis 的缺口：

- 没有 weekly/monthly audits。
- 没有 gotchas rollup。
- 没有 bypass tripwire。
- 没有 drift audit。
- 没有把重复问题提升成规则候选的流程。

建议闭环：

- 增加本地 audit proposal artifacts。
- 先让用户显式触发 `/audit:run` 或 `/audit:plan`。
- 不自动扫描仓库外路径，不自动创建跨项目任务。

## P2：中优先级缺口

### 10. Session context 与 context-log 闭环不足

当前状态：

- Project Flow 有 handoff、resume、snapshot 和 hidden context。
- active task 已支持 session-scoped 指针。

相对 Trellis 的缺口：

- 没有等价的 SessionStart context 注入：分支、最近提交、dirty file count、未解决 gotchas。
- 没有 compact 前保存 session context log 的 hook。
- 没有 compact 后恢复 context log 的 hook。
- 没有跨 worktree 的 canonical root context-log 策略。

建议闭环：

- 复用现有 handoff/resume/snapshot。
- 增加更明确的 session context log artifact。
- 在 OMP 支持 session lifecycle hook 前，不声称自动注入。

### 11. 多 harness 覆盖不足

当前状态：

- Project Flow 是 OMP 插件。
- 文档中记录了上游来源，但没有多 harness 部署。

相对 Trellis 的缺口：

- 没有 Claude Code / Codex / AntiGravity 的规则、技能、命令、hook 覆盖矩阵。
- 没有不同 harness envelope 的分离实现。
- 没有 AntiGravity 仅 advisory、Claude/Codex 可 block 的策略表达。

建议闭环：

- 先在文档和 upstream sync capability 中记录 harness 差异。
- 不为未接入的 harness 生成配置文件。

### 12. 上游同步仍未形成完整智能闭环

当前状态：

- Project Flow 记录 ECC 和 OMO 作为设计来源。
- 可以生成 upstream sync report 和 review-first 任务。

相对 Trellis 的缺口：

- 没有 reviewed upstream snapshot。
- 没有 capability diff。
- 没有把上游变化映射成可审阅实现提案。
- 没有记录 source freshness、confidence、evidence excerpt、local status mapping 的完整闭环。

建议闭环：

- 当前下一步可以优先实现 reviewed source snapshots 与 capability diff proposals。
- 该能力会降低后续“参考 Trellis 实现”的研究成本。

### 13. 子任务与角色编排仍偏提示，不是执行闭环

当前状态：

- Project Flow 可以生成 subtask suggestions、child tasks、role handoff packets。
- 能记录 role status 和 expected outputs。

相对 Trellis 的缺口：

- 没有自动 dispatch 独立 agent。
- 没有 role 执行结果的强制验收门禁。
- 没有子任务依赖顺序和阻塞传播策略达到 Trellis process gate 级别。

建议闭环：

- 在 OMP 暴露安全 agent/session API 前，保持为显式、可审阅、手动启动。
- 增加 dependency 和 per-role receipt 后再考虑自动执行。

## 已接近闭环但仍低于 Trellis 强制性的能力

### 研究证据与 PRD/计划审查

已完成：

- research source packs、questions、findings、decisions、risks。
- PRD review、plan quality、acceptance coverage、verification coverage。
- summaries 进入 info、handoff、snapshot、hidden context、readiness。

仍低于 Trellis：

- 没有 scheduled audit。
- 没有跨项目规则提升。
- 没有强制 process gate。

### 验证失败分类与 remediation next actions

已完成：

- 失败分类、证据、confidence、signals、impacted files、retryability、stop reason。
- next-action records 和 remediation ledger。
- `/verify:remediate --next`。

仍低于 Trellis：

- 不自动执行 Stop hook。
- 不自动运行 typecheck/lint/test。
- 不作为 git-boundary gate 阻塞 push。

## 当前推荐开发顺序

1. 先补 process gate 的本地报告与 readiness 阻塞，这是项目交付前最关键的总门禁。
2. 再补 configurable verification/process policy，把自动推断升级为用户可声明策略。
3. 再补 receipt / Definition of Done，让每次完成都有统一证据格式。
4. 再补 git-boundary guard、code review gate、UI verify gate。
5. 继续补 upstream reviewed snapshots 与 capability diff proposals，降低后续参考 Trellis/ECC/OMO/Superpowers 的研究成本。
6. 最后在 OMP runtime 支持安全 hook 或 agent session 后，接入真正的阻塞式 stop gate、fast-local gate 和角色执行闭环。

## 明确边界

- 不自动安装 git hooks。
- 不自动扫描仓库外项目。
- 不自动执行上游代码。
- 不静默推送、force push 或绕过验证。
- 未有 OMP runtime 能力前，不声称实现 Trellis 等价的强制 hook 系统。
