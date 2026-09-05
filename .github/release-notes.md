## English

`v0.4.10` fixes Codex approval policy handling, remembers Android workspace tabs, and strengthens shared account authorization validation. It contains the changes since `v0.4.9` ([full comparison](https://github.com/liguobao/ds-harness-remote/compare/v0.4.9...v0.4.10)).

### What changed

- Web and Desktop Codex approval controls now show the Host-confirmed policy for each Thread, or indicate that Host settings are inherited when the policy is unknown. Explicit changes require Host confirmation and update connected observers; sending prompts and forking preserve the current Thread policy.
- Android remembers the selected DSH or CodeX workspace tab for each Host and removes the redundant permission hint below the chat composer.
- Desktop connection progress highlights one transport probe at a time. During direct negotiation, the visible cue advances from LAN to P2P while the completed connection still reports its actual route.
- Adds shared Account Authorization schemas for device registration, Host registration codes, token refresh, and Browser authorization exchange. Plugin, Android, Browser, and VS Code credential parsing now uses the shared validation.
- Expands Protocol v1 conformance fixtures and runs the shared suites in Android tests.
- Synchronizes the Plugin and Android app at version `0.4.10` with Android `versionCode 27`.

### Validation

CI checks workspace types and tests, verifies the committed Host bundle and GitHub plugin package, and performs production builds. The release workflow runs checks, tests, and builds before publishing npm and GitHub Packages artifacts and attaching the Android APK.

### Install and downloads

Install through DSH's plugin manager:

```sh
dsh plugin --profile web add ds-harness-remote@0.4.10
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.10
```

- [npm package](https://www.npmjs.com/package/ds-harness-remote/v/0.4.10)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.10/dsh-remote-android-v0.4.10.apk)
- Release assets also include the npm tarball and `SHA256SUMS.txt`.

## 中文

`v0.4.10` 修复 CodeX 审批策略处理，记住 Android 工作区分页，并加强共享账号授权校验。本版本包含自 `v0.4.9` 以来的改动（[完整对比](https://github.com/liguobao/ds-harness-remote/compare/v0.4.9...v0.4.10)）。

### 主要变更

- Web 与 Desktop 的 CodeX 审批控件按 Thread 显示 Host 已确认的策略，未知时显示沿用 Host 设置。显式切换须由 Host 确认并同步其他连接；发送 Prompt 和 fork 保留当前 Thread 的策略。
- Android 按 Host 记住上次选择的 DSH 或 CodeX 工作区分页，并移除聊天输入框下方重复的权限提示。
- Desktop 连接进度每次只高亮一个探测路径。直连协商期间，界面提示从 LAN 推进到 P2P，连接完成后仍显示实际使用的路径。
- 新增设备注册、主机匹配码、Token 刷新和 Browser 授权交换的共享 Account Authorization schema；Plugin、Android、Browser 和 VS Code 的凭证解析统一使用共享校验。
- 扩展 Protocol v1 conformance fixtures，并在 Android 测试中运行共享用例。
- Plugin 与 Android App 版本统一更新为 `0.4.10`，Android `versionCode` 更新为 `27`。

### 验证

CI 执行 workspace 类型检查与测试、校验已提交的 Host bundle 和 GitHub Plugin 包，并完成生产构建。Release workflow 在检查、测试和构建通过后发布 npm 与 GitHub Packages 产物，并附加 Android APK。

### 安装与下载

请通过 DSH Plugin 管理器安装：

```sh
dsh plugin --profile web add ds-harness-remote@0.4.10
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.10
```

- [npm 包](https://www.npmjs.com/package/ds-harness-remote/v/0.4.10)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.10/dsh-remote-android-v0.4.10.apk)
- Release 附件还包括 npm tarball 与 `SHA256SUMS.txt`。
