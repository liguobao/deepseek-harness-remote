## English

`v0.4.8` refines workspace creation and reply feedback in the Android client. It contains the changes since `v0.4.7` ([full comparison](https://github.com/liguobao/ds-harness-remote/compare/v0.4.7...v0.4.8)).

### What changed

- Replaces the separate DSH and Codex creation actions with one **New workspace** flow. When Codex is available on the selected Host, the creation sheet lets you choose DSH or Codex as the workspace type before selecting a directory.
- Shows a generating indicator while Android is waiting for the first visible reply item, so an accepted prompt no longer leaves the conversation looking idle.
- Adds clearer activity feedback for streamed replies: active reasoning and running tools now use progress indicators, and the streaming cursor is animated.
- Keeps the underlying Remote protocol, Host transport, and security boundaries unchanged.
- Synchronizes the Plugin and Android app at version `0.4.8` with Android `versionCode 25`.

### Validation

The release pipeline runs workspace type checks and tests, verifies the committed DSH bundles, performs production builds, publishes the npm and GitHub Packages artifacts, and builds the Android APK.

### Install and downloads

Install through DSH's plugin manager rather than adding the npm package directly:

```sh
dsh plugin --profile web add ds-harness-remote@0.4.8
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.8
```

- [npm package](https://www.npmjs.com/package/ds-harness-remote/v/0.4.8)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.8/dsh-remote-android-v0.4.8.apk)
- Release assets also include the npm tarball and `SHA256SUMS.txt`.

## 中文

`v0.4.8` 主要优化 Android Client 的工作区创建流程与回复状态反馈。本版本包含自 `v0.4.7` 以来的改动（[完整对比](https://github.com/liguobao/ds-harness-remote/compare/v0.4.7...v0.4.8)）。

### 主要变更

- 将原先分开的 DSH 与 Codex 创建入口合并为一个**新建工作区**流程。当所选 Host 支持 Codex 时，用户可以先在创建面板中选择 DSH 或 Codex 工作区类型，再选择目录。
- Android 等待首个可见回复内容时会显示“正在生成”状态，Prompt 已被接受后，会话界面不再看起来没有响应。
- 增强流式回复的活动反馈：正在进行的推理和工具执行会显示进度指示器，流式输出光标也增加了动画。
- Remote 协议、Host transport 与安全边界均未改变。
- Plugin 与 Android App 版本统一更新为 `0.4.8`，Android `versionCode` 更新为 `25`。

### 验证

Release pipeline 会执行 workspace 类型检查与测试、校验已提交的 DSH bundle、完成生产构建、发布 npm 与 GitHub Packages 产物，并构建 Android APK。

### 安装与下载

请通过 DSH Plugin 管理器安装，不要直接将 npm 包加入项目：

```sh
dsh plugin --profile web add ds-harness-remote@0.4.8
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.8
```

- [npm 包](https://www.npmjs.com/package/ds-harness-remote/v/0.4.8)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.8/dsh-remote-android-v0.4.8.apk)
- Release 附件还包括 npm tarball 与 `SHA256SUMS.txt`。
