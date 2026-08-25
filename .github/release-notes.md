## English

This release includes changes since `v0.3.30` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.30...v0.3.32)).

### Desktop Remote

- Remote Host rows keep showing the Harness version by sending `harnessVersion` during Host device registration as well as the control `hello` frame.
- The Remote workspace Host heading now keeps the current-device control and account sign-out actions together, without repeating the local hostname.

### Plugin identity

- DSH plugin package, Cordis instance, settings namespace, and client module ids now use the unified `ds-harness-remote` id.

### Connection visibility

- Remote Client connection progress shows the LAN, P2P, TURN, and Relay probe sequence while opening a Host.
- Desktop connection details display the preferred transport order with localized labels.
- Android connection progress and device details show the same probe order before the secure channel is ready.

### File Viewer

- Remote File Viewer Save As is offered only on LAN, P2P, and TURN routes; Relay and disconnected routes keep Save As disabled while preview reads remain bounded and read-only.

### Compatibility and artifacts

- Ships Plugin `0.3.32` and Android `0.3.32` (`versionCode 16`).
- Supersedes the withdrawn `v0.3.31` release and includes its changelog entries.
- Remote workspaces and sessions remain compatible with `0.3.15` Hosts; newer settings, file-viewer, command-catalog, transfer, and version-display paths remain gated by Host and Server support.

## 中文

本版本包含自 `v0.3.30` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.30...v0.3.32)）。

### 桌面 Remote

- Remote 主机行会继续显示 Harness 版本：Host 在设备注册 descriptor 和控制连接 `hello` 中都会上报 `harnessVersion`。
- Remote 工作区窗口中，“主机”、当前设备控制开关和账号“退出”操作集中显示在同一处，不再重复显示本地主机名。

### 插件标识

- DSH 插件包、Cordis 实例、设置 namespace 与客户端模块 id 统一使用 `ds-harness-remote`。

### 连接可见性

- Remote Client 连接 Host 时会在进度中展示 LAN、P2P、TURN 与 Relay 的探测顺序。
- 桌面连接详情会用本地化标签展示首选传输顺序。
- Android 连接进度和设备详情也会显示同一组探测顺序。

### File Viewer

- 远端 File Viewer 的另存为只在 LAN、P2P 和 TURN 线路上启用；Relay 与断开状态会禁用另存为，同时预览读取仍保持有界只读。

### 兼容性与产物

- 发布 Plugin `0.3.32` 与 Android `0.3.32`（`versionCode 16`）。
- 替代已撤回的 `v0.3.31` release，并包含其变更日志条目。
- 远端 Workspace 与会话继续兼容 `0.3.15` Host；较新的设置、文件查看、命令目录、分块传输和版本显示路径仍按 Host 与 Server 支持情况启用。
