## English

This release includes changes since `v0.4.6` ([full comparison](https://github.com/liguobao/ds-harness-remote/compare/v0.4.6...v0.4.7)).

### Highlights

- Ships Plugin `0.4.7`.
- Extends Harness compatibility to the official Typert Remote carrier on `dsh-v0.1.2-rc.1`: Remote workspace capabilities, the Desktop connection flow, and the native dsh-TUI `/remote` command now cover `dsh-v0.1.1-rc.2` and `dsh-v0.1.2-alpha.1`–`rc.1` while the rc.2 ApiProxy path keeps working unchanged.
- Completes Codex workspace and session creation across devices. The Desktop workspace chooser and a new Android action next to `New workspace` can add an existing Host directory to the Codex project catalog through the fixed `codex.app.*` allowlist and then open or start sessions in it.
- Hardens the Host side of `project/create`: exactly one existing absolute directory is accepted, validated with lexical and `realpath` checks with no traversal or symlink escape, and only the upstream-created project can extend workspace authority.
- Keeps new Codex projects and sessions inside the in-memory projection over the encrypted channel: nothing is written to DSH SessionStore, workspace storage, or Harness logs, and the directory picker continues to expose read-only directory metadata only.
- Refreshes Codex documentation and validation status: a dedicated `docs/codex-remote.md` guide, a condensed README / `README.zh.md` overview, and Android copy clarifying that Codex workspace rows are added from the phone while rename, reorder, and deletion remain managed by Codex on the computer.

Real-device E2E for the new Codex creation flow and long-running recovery work remain tracked in `TODO.md`.

### Validation

- Local pre-release checks pass on the v0.4.7 tree: workspace package build, workspace type checks, DSH bundle verification, and `git diff --check`.
- The v0.4.7 release workflow gates the same tag with full workspace tests in CI before publishing the npm and GitHub Packages artifacts and attaching the Android APK to the GitHub Release.

### Install and downloads

```sh
dsh plugin --profile web add ds-harness-remote@0.4.7
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.7
```

- [npm package](https://www.npmjs.com/package/ds-harness-remote/v/0.4.7)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.7/dsh-remote-android-v0.4.7.apk)
- Release assets also include the npm tarball and `SHA256SUMS.txt`.

## 中文

本版本包含自 `v0.4.6` 以来的改动（[完整对比](https://github.com/liguobao/ds-harness-remote/compare/v0.4.6...v0.4.7)）。

### 主要变更

- 发布 Plugin `0.4.7`。
- 扩展 Harness 兼容性到 `dsh-v0.1.2-rc.1` 官方 Typert Remote carrier：Remote workspace 能力、Desktop 连接链路与原生 dsh-TUI `/remote` 命令现已覆盖 `dsh-v0.1.1-rc.2` 与 `dsh-v0.1.2-alpha.1`–`rc.1`，rc.2 ApiProxy 路径保持不变继续可用。
- 完成跨设备的 Codex workspace/session 创建：Desktop workspace 选择器和 Android 上 `New workspace` 旁的新入口，可通过固定 `codex.app.*` allowlist 将 Host 上已存在的目录加入 Codex project 目录，并在其中打开或新建 session。
- 加固 Host 侧 `project/create`：只接受单个已存在的绝对目录，经词法路径与 `realpath` 双重校验，不允许目录穿越或 symlink 逃逸；只有上游创建返回的新 Project 才能扩展 workspace authority。
- 新建的 Codex project/session 仍只存在于加密通道内的内存展示投影：不写入 DSH SessionStore、workspace 存储或 Harness 日志；目录选择器依旧只返回只读目录元数据。
- 刷新 Codex 文档与验证状态：新增 `docs/codex-remote.md` 指南，精简 README / `README.zh.md` 概述，并更新 Android 文案，明确 Codex workspace 行可从手机端添加，而重命名、排序与删除仍由电脑端 Codex 管理。

新 Codex 创建流程的真机跨设备 E2E 与长期恢复类工作仍在 `TODO.md` 中跟踪。

### 验证

- v0.4.7 代码树已通过本地发布前检查：workspace package build、workspace 类型检查、DSH bundle 校验与 `git diff --check`。
- v0.4.7 release workflow 会在 CI 上对同一 tag 运行完整 workspace 测试，随后发布 npm 与 GitHub Packages 产物，并将 Android APK 附到 GitHub Release。

### 安装与下载

```sh
dsh plugin --profile web add ds-harness-remote@0.4.7
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.7
```

- [npm 包](https://www.npmjs.com/package/ds-harness-remote/v/0.4.7)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.7/dsh-remote-android-v0.4.7.apk)
- Release 附件同时包含 npm tarball 和 `SHA256SUMS.txt`。
