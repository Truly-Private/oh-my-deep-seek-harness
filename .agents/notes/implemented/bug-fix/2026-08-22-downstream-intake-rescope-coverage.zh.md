# Agent Note: 下游纳入重定作用域与覆盖率修正

Status: implemented

[English](2026-08-22-downstream-intake-rescope-coverage.md) | 中文

## Problem

上游纳入重定作用域把工作区包改为 `@truly-private/omdsh-*`，但动态客户端 bundle 纯度门禁和一项凭据不变量断言仍然选择 `@deepseek-ai/*`。因此，未声明的下游跨插件值导入会绕过构建错误，而不变量测试预期了错误的包标识。纳入适配器还把若干英文预期值改掉，却没有改动显式选择中文的 fixture，导致测试与自身设置矛盾。合并保留了下游 9Router 默认选择，却丢失了让该选择可执行的提供方配置。在完整 Linux 覆盖率工作负载下，真实 PowerShell PTY 与 Loader 组装套件在聚合插桩下跨广域和 process-bound 测试项目竞争时，可能丢失持久 shell 输出。串行化两个项目消除了重叠，但托管运行仍在启动 PowerShell 时超时，因为所有 process-bound 套件会在 PowerShell 执行器套件之后复用同一个插桩 Vitest 进程。全新进程隔离又暴露了第二个托管环境竞争：如果第一次就绪轮询发生在静默阈值之后，已提交的 PowerShell 输入可能沿用 shell 在写入前已经确认的 stdin 等待，并在 shell 消费输入前结算为 `inferred_idle`。阻止这条静默路径后，剩余的顺序缺陷暴露出来：为前一 send 发出的提示符标记可能在下一次提供方写入之后到达，并被误判为当前完成。本地 node-pty 提供方还会转发 PowerShell 的光标位置查询，却不返回响应。因此，bootstrap 可能在 PSReadLine 的原生提示符接受输入之前到达；同时，子串就绪检查会把回显的 bootstrap 源码误判为已安装提示符，因为源码本身含有提示符字面量。

六工作进程 Web snapshot 作业暴露了多项互不依赖的时序与产物所有权缺陷。HMR 场景恢复了动态插件 bundle，却把 `apps/web/dist` 留在重写后的状态，使已完成构建的摘要在内置 bundle 冒烟测试加载前失效。主题检查会在 Host 设置写入完成内存提交之前先观察到持久化文件，并且在下游重定作用域后仍拦截上游 bundle 路由。引用与 Markdown 图像 snapshot 可能在保存的 `trifecta` 选择到达前采集，subagent 悬浮目录可能在挂载前被查询，而双消息 steering fixture 在并发 CI 负载下没有为三次浏览器操作留下足够的流式时间。冷启动的 seeded-history 页面可能在恢复后的 Host agent 完成附加之前就渲染持久化对话，因此同一负载下直接追加实时事件会失败。DeepSeek 注释保活 snapshot 使用 150 毫秒空闲看门狗和 10 毫秒心跳，在并发 snapshot 池中没有留下足够的事件循环调度余量，可能触发一次非预期重试。无密钥 Web 重试冒烟测试还把完整真实 Host 生命周期限制为 30 秒，尽管其启动与恢复等待各自已有更长的显式界限。

其他发布形态检查依赖偶然的调度时序。history-and-streaming 场景可能在建立阅读锚点之前耗尽有限 replay；回答问题后的 transcript 采集可能仍保留离开底部的控件；响应式 queue 几何则可能在 viewport 改变后的浏览器布局完成前被测量。在测试完成必需的折叠区和响应式布局检查之后，Playwright 稳定子会话导航按钮时，实时 workflow fixture 可能已结束。subagent 目录测试会在没有证明打开菜单的 effect 已安装监听器时就派发 resize。一个进程密集型 Oxlint 重试仍使用默认五秒测试超时。PowerShell scrollback 可以用 LF 或 CRLF 结束提示符，但两个提示符安装循环都只接受 scrollback 中不带换行的提示符，因此可能在 shell 已就绪后继续无限等待。真实持久 PowerShell Loader 测试还忽略了状态初始化结果，并在完整插桩下只给工具二十秒，因此真实命令超时会重置 shell，随后表现为状态丢失。在结果变得显式且预算提高后，托管 x64 组装仍会让第一条包装命令超时，而同一 runner 上由提供方拥有的 PowerShell PTY 生命周期会通过。工具在 terminal provider 已经安装并验证稳定提示符之后又进行了冗余替换。删除这个重复生命周期后又暴露了提供方启动竞争：PowerShell 分支使用普通的空 send 等待原生提示符，而没有调用会话初始化操作。在较慢的 x64 启动中，零输出静默可能在 PSReadLine 绘制第一个提示符之前就结算该 send，使 bootstrap 排入未完成的输入状态，最终无法返回受控提示符。

## Decision

客户端纯度门禁把 `@truly-private/*` 视为自有工作区作用域，保留对 `@truly-private/omdsh-*` 线路包和生成的 Remote 贡献的显式内联许可，并在应用下游作用域检查之前允许独立入库的 `@deepseek-ai` 库。

官方客户端构建 profile 把 `oh-my-deepseek-harness` 嵌入为产品标题。因此，发布形态产物会使用下游标识，同时不改变明确的上游致谢。

凭据不变量测试预期下游包标识。基础 bundle 恢复第一方 9Router 提供方及其凭据引用、回环端点、OpenAI 兼容协议和用户要求的 `trifecta` 模型；配置中不嵌入凭据。

locale 测试断言各 fixture 所选的语言。将 locale 设为 `zh` 的 fixture 保留已交付的中文文案预期；当两套字典都需要验证时，测试会显式切换到 `en`。

真实 `pwsh-local` 执行器、`terminal-bash` 本地 PTY 与持久 PowerShell Loader 组装套件继续归入既有的 process-bound Vitest 项目。分区覆盖率只让 thread-safe 项目并发分片并等待全部完成，随后运行一次 process-bound 核心套件，再让每个真实 PowerShell 或 PTY 套件分别在全新的单工作进程 Vitest 进程中运行。最后合并全部覆盖率 blob 并执行相同阈值。真实进程所有者因此继续接受插桩，同时不会与另一覆盖率分片重叠，也不会继承更早 PowerShell 套件的进程全局状态。

本地 node-pty 提供方以最小的 `CSI 1;1 R` 响应处理完整或跨数据块拆分的 `CSI 6 n` 光标位置查询。PowerShell 的原生提示符等待通过 `LocalPtySession.initialize()` 执行，使会话保持初始化模式，因此零输出静默不能建立就绪状态。可打印原生提示符输出到达后，启动过程只提交一次编码与受控提示符 bootstrap；随后，只有已安装提示符位于 viewport 或 scrollback 末尾时才确认就绪。持久 PowerShell 工具复用该提供方拥有的提示符，不再替换它。其 `promptText` 配置声明所选 backend 的确切稳定可打印提示符，默认的 `dsh> ` 与 `terminal-bash` 一致。其组装后的无密钥 snapshot 会记录精确的 `PWSH_OK` 工具结果，不含 bootstrap 源码、截断提示或凭据材料。

当写入前检查能够提供前台证据时，提交了输入的 send 只有在轮询观察到前台进程组变化、脱离已证明的 stdin 等待，或成功中断之后，才能通过静默结算。静默推断从首次观察到这种写入后前台活动时开始测量一个全新的 `idleSilenceMs` 时间窗，而不会使用延迟轮询之前累计的静默时间。写入前已知的进程组只要仍在前台且处于忙碌状态，就不能通过静默结算；它必须回到可接受的 stdin 等待、完成精确提示符交接，或达到绝对超时。前台进程组在写入前已处于忙碌状态不算写入后活动；如果它在两次轮询之间回到 stdin 等待，则必须先观察到写入后可打印输出，该等待才能结算 send。只有在出现相同的前台活动、更早的可打印输出，或同一回调中标记之前的可打印文本后，提示符标记才成为当前 send 的证据。来自前一 send 的延迟标记与提示符不能完成其后继 send。`TerminalSendRequest.expectedPromptText` 让消费方声明提供方的确切稳定可打印提示符；持久 PowerShell 工具会在命令与轮询 send 上提供配置的提供方提示符。无论证据来自保留的 scrollback 还是操作的增量输出，工具层命令都要求当前包装器的唯一结束标记后紧跟数字状态才会完成。只轮询的 send 与无法提供前台证据的提供方保留现有静默回退。

HMR 场景会保存完整构建摘要覆盖的每个产物，在恢复前停止两个写入方，替换生成的 Web 目录，恢复全部原始字节，并在清理期间重新验证构建记录。浏览器检查等待 Host 的权威主题和模型状态，不再把文件或首次绘制当作提交完成的替代信号，其中包括每个记录持久化 `trifecta` 选择的 golden；同时拦截下游 `@truly-private/omdsh-client-ui-theme` 路由，并在选择条目前等待 subagent 目录树挂载。双消息 steering 场景使用为六工作进程池单独设置的 replay 间隔；其他 steering 场景继续使用较短间隔。seeded-history 场景会先等待 Host 的权威 agent 附加完成，再向冷恢复会话追加实时上下文。DeepSeek 注释保活 fixture 会在 500 毫秒空闲看门狗下以 25 毫秒间隔发送一秒心跳，既保留每次心跳二十倍的调度余量，也证明注释能让流存活超过看门狗时长。Web 重试冒烟测试保留 20 秒恢复轮询界限，并使用与其他真实 Host 冒烟测试相同的 120 秒外层生命周期预算。

history-and-streaming 场景使用专用的 600-delta replay，并在验证并发到达之前断言流式输出仍在进行。回答问题后的采集会返回 transcript 底部；queue 与上下文面板几何则在响应式布局稳定后轮询已渲染不变量。实时 workflow 场景使用为 replay 设置的间隔，使六工作进程浏览器池在完成之前的折叠区和响应式布局断言时，仍保留子会话导航时间窗。subagent 目录测试会等待打开菜单的 effect，并验证 resize 驱动的菜单定位。进程密集型 Oxlint 重试使用显式的二十秒测试超时。

提供方的 PowerShell 提示符安装循环会把受控提示符识别为不带换行的末尾，或后接 LF、CRLF 的末尾。回归 fixture 会验证以换行结束的 scrollback 就绪状态，并区分原生提示符成功之后的安装超时。持久工具不再增加第二个提示符安装生命周期。真实 Loader 组装会先要求明确的 `state-ready` 结果再检查持久性，在 120 秒测试预算内为 PowerShell 启动提供三十秒，并为插桩命令提供六十秒；因此，超时会在初始化处失败，而不会伪装成状态丢失。

## Alternatives considered

**把 fixture 改为英文。** 受影响的客户端界面有意交付中文产品文案，而测试已明确选择中文。改动 fixture 只会隐藏纳入不匹配，不能保留上游行为。

**重定作用域后删除纯度断言。** 这会允许客户端插件内联第二份工作区运行时，或请求它从未声明的模块表行。下游作用域需要与上游作用域相同的强制约束。

**重试 PTY 断言或仅延长其超时。** 两种做法都会隐藏聚合竞争或进程全局污染下持久 shell 边界的丢失。process-bound 清单与分区协调器会为每个真实 PowerShell 或 PTY 套件提供一个全新的插桩进程。

**提高 PowerShell 静默阈值，或在当前开始标记之后接受提示符。** 调度器竞争可以超过任何选定的启发式阈值，因此更长阈值只会降低竞争出现频率，也无法保证 bootstrap 位于第一个原生提示符之后。初始化模式通过拒绝零输出静默来提供这一顺序保证。PSReadLine 会在 shell 执行包装器之前回显包装器（包括其开始标记）；命令仍在等待时，延迟提示符可能紧跟在该回显之后。要求唯一结束标记与数字状态，才能把完成归因于已执行的包装器。

**只要捕获输出中任意位置出现提示符字面量就确认就绪。** 提交的 PowerShell 函数在实际执行前就含有该字面量。只有最终提示符位于输出末尾，才能证明 shell 已接受 bootstrap 并回到受控输入状态。

**保留第二个由工具拥有的提示符 bootstrap。** 所选 terminal backend 已经拥有 PowerShell 编码、OSC 就绪标记与稳定可打印提示符。替换这一已验证提示符会增加一次 PSReadLine 提交和就绪生命周期，却不会增强命令归因；命令归因仍由唯一命令标记与数字状态负责。

**忽略或重试 Web snapshot 失败。** 构建记录拒绝揭示了真实的共享产物变更，而浏览器失败表明测试没有与权威状态同步。重试会让发布证据取决于调度器运气。

## Consequences

下游浏览器构建会再次拒绝未声明的工作区值导入，同时入库的框架库仍然可用。包标识断言和 locale fixture 与下游运行时保持一致，基础 profile 能解析其选择的 9Router 路由，完整覆盖率门禁会分别隔离每个真实 PowerShell 或 PTY 生命周期但不会把它们从覆盖率中移除，Web snapshot 池则会保留客户端产物摘要并等待持久 UI 状态。响应式、重试、注释保活与流式检查会在发布工作进程池中保留原有行为断言；以换行结束的 PowerShell 提示符不会再使 shell 创建停滞；调度延迟也不能通过静默或前一 send 的延迟提示符把提供方已证明尚未消费的输入结算为完成。持久工具现在只有一个 PowerShell 提示符所有者，并以显式提供方提示符配置取代冗余 bootstrap。一个全新的无网络原生 ARM64 Ubuntu OrbStack 容器使用 Proto 提供的运行时与非特权测试用户，通过插桩的持久 Loader 测试和全部八项本地终端生命周期测试。另一个全新的 amd64 Ubuntu OrbStack 容器使用固定的 Proto Node 与 pnpm 版本，通过了真实提供方 PowerShell 生命周期和插桩 Loader 组装；初始化修正之前，该容器能稳定复现托管环境失败。完整无密钥 snapshot 套件通过 127 项测试，并有两项预期跳过。这些修正不会把上游纳入提升到 `candidate` 以上，也不会授权发布。
