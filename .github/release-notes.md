## English

This release includes changes since `v0.3.29` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.29...v0.3.30)).

### Plugin and settings

- The authenticated Remote settings page can now manage every namespace currently registered by the Host through the official Harness ApiProxy, including `dsh-remote` itself and global credential references.
- Configuration remains bounded and fail-closed: unknown namespaces are rejected, credential values are write-only, and the Host-local `settings.openDocument` action is never exposed remotely.
- Model providers can be configured and queried from draft HTTPS endpoints (HTTP remains localhost-only). Discovery failures are normalized so adapter messages cannot echo submitted keys or endpoint details.

### Browser

- Adds a lightweight Chrome/Edge MV3 launcher that exchanges the existing signed-in Web authorization for isolated Browser device credentials, lists online Hosts, and opens the selected Host directly in Remote Web.
- Restricts extension host permissions to the production Remote Web origin and adds the Chrome Web Store privacy documentation.

### VS Code and reliability

- Keeps VS Code connection state consistent after disconnects and serializes sign-in/sign-out transitions so stale operations cannot restore cleared state.
- Revokes the device during sign-out using the latest rotated credentials.
- Makes pull-request file inspection fail closed and limits Android APK builds to relevant changes.

### Compatibility and artifacts

- Ships Plugin `0.3.30` and Android `0.3.30` (`versionCode 14`).
- Remote workspaces and sessions remain compatible with `0.3.15` Hosts; newer settings, file-viewer, command-catalog, and transfer capabilities remain gated by Host support.

## 中文

本版本包含自 `v0.3.29` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.29...v0.3.30)）。

### 插件与设置

- 已认证的 Remote 设置页现在可以通过 Harness 官方 ApiProxy 管理 Host 当前注册的全部命名空间，包括 `dsh-remote` 自身设置与全局 credential 引用。
- 配置写入继续保持有界并 fail closed：拒绝未知命名空间，credential 值保持只写，Host 本地的 `settings.openDocument` 操作不会暴露到远端。
- 支持远端配置模型 Provider，并从草稿 HTTPS 端点发现模型（HTTP 仍仅限 localhost）。模型发现失败会统一脱敏，adapter 错误无法回显提交的密钥或端点详情。

### 浏览器

- 新增轻量 Chrome/Edge MV3 入口：将 Web 端现有登录授权换取隔离的 Browser 设备凭证，展示在线 Host，并直接打开所选 Host 的 Remote Web。
- 扩展 host 权限收敛到正式 Remote Web 站点，并补充 Chrome Web Store 隐私说明。

### VS Code 与可靠性

- 断线后保持 VS Code 连接状态一致，并串行化登录/退出流程，避免过期异步操作恢复已经清除的状态。
- 退出登录时使用最新轮换后的凭证撤销设备。
- PR 文件检查改为 fail closed，并仅在相关改动出现时构建 Android APK。

### 兼容性与产物

- 发布 Plugin `0.3.30` 与 Android `0.3.30`（`versionCode 14`）。
- 远端 Workspace 与会话继续兼容 `0.3.15` Host；较新的设置、文件查看、命令目录和分块传输能力仍按 Host 支持情况启用。
