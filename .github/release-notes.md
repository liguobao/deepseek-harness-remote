## English

This release includes changes since `v0.3.31` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.31...v0.3.32)).

### Desktop Remote

- Remote Host rows keep showing the Harness version by sending `harnessVersion` during Host device registration as well as the control `hello` frame.
- The Remote account sign-out action now sits next to the current device name in the Remote workspace window.

### Compatibility and artifacts

- Ships Plugin `0.3.32` and Android `0.3.32` (`versionCode 16`).
- Remote workspaces and sessions remain compatible with `0.3.15` Hosts; newer settings, file-viewer, command-catalog, transfer, and version-display paths remain gated by Host and Server support.

## 中文

本版本包含自 `v0.3.31` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.31...v0.3.32)）。

### 桌面 Remote

- Remote 主机行会继续显示 Harness 版本：Host 在设备注册 descriptor 和控制连接 `hello` 中都会上报 `harnessVersion`。
- Remote 工作区窗口中，账号“退出”操作已移动到当前设备名称旁边。

### 兼容性与产物

- 发布 Plugin `0.3.32` 与 Android `0.3.32`（`versionCode 16`）。
- 远端 Workspace 与会话继续兼容 `0.3.15` Host；较新的设置、文件查看、命令目录、分块传输和版本显示路径仍按 Host 与 Server 支持情况启用。
