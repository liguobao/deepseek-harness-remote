## English

This release includes changes since `v0.4.2` ([full comparison](https://github.com/liguobao/ds-harness-remote/compare/v0.4.2...v0.4.3)).

### Highlights

- Ships Plugin `0.4.3` and Android `0.4.3` (`versionCode 23`).
- Adds the default-on experimental CodeX Remote domain inside the existing encrypted Plugin channel.
- Shows CodeX projects as virtual Workspaces and CodeX Threads as virtual Sessions, using the native DSH workspace list, conversation renderer, composer, tool cards, permission selector, and approval UI without writing CodeX data into DSH stores or logs.
- Routes CodeX traffic through a fixed `codex.app.*` allowlist backed by `project/list` authority checks, per-connection streams, bounded transfers, active-turn ownership, and one-time approval handles.
- Extends Android with direct `codex.app.*` support for CodeX project and Thread navigation, paged history, live reasoning/tool frames, model and reasoning controls, fixed permission presets, image prompts, interrupt, and approvals.
- Fixes CodeX message images in Remote history and chat by preserving safe PNG, JPEG, WebP, and GIF data-image blocks through the Desktop virtual Session projection and Android display projection.
- Keeps Protocol v1 frame limits and conformance fixtures in the release gate.

### Compatibility and notes

- Android `0.4.3` requires Android 12 or newer (`minSdk 31`), targets API 36, and ships ARM APK slices for `arm64-v8a` and `armeabi-v7a`.
- Existing Android `0.4.2` installs can upgrade in place to `0.4.3` (`versionCode 23`) with the same APK signing certificate.
- Android keeps the existing rc.2 ApiProxy and alpha.1/alpha.2 Typert Remote compatibility. CodeX is enabled only when the Host advertises both `codex.appserver.v1` and `codex.appserver.transfer.v1`.
- Desktop CodeX Remote cross-machine validation has passed for this release. App Server crash/reconnect recovery and Android real-device CodeX E2E remain tracked in `TODO.md`.

### Install and downloads

```sh
dsh plugin --profile web add ds-harness-remote@0.4.3
```

- [npm package](https://www.npmjs.com/package/ds-harness-remote/v/0.4.3)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.3/dsh-remote-android-v0.4.3.apk)
- Release assets also include the npm tarball and `SHA256SUMS.txt`.

## 中文

本版本包含自 `v0.4.2` 以来的改动（[完整对比](https://github.com/liguobao/ds-harness-remote/compare/v0.4.2...v0.4.3)）。

### 主要变更

- 发布 Plugin `0.4.3` 和 Android `0.4.3`（`versionCode 23`）。
- 在现有加密 Plugin 通道内新增默认开启的实验性 CodeX Remote 领域。
- 将 CodeX 项目展示为虚拟 Workspace，将 CodeX Thread 展示为虚拟 Session，并复用 DSH 原生工作区列表、会话渲染器、Composer、工具卡片、权限选择和审批 UI；CodeX 数据不会写入 DSH 存储或日志。
- CodeX 流量只经过固定 `codex.app.*` 白名单，并受 `project/list` 权威来源校验、按连接隔离的 stream、有界分块传输、active turn owner 和一次性审批 handle 保护。
- Android 直接接入同一套 `codex.app.*`：支持 CodeX 项目与 Thread 导航、分页 History、实时 reasoning/tool frame、模型与 reasoning 控制、固定权限预设、图片 Prompt、停止和审批。
- 修复 CodeX 消息图片在 Remote history/chat 中不可见的问题，安全的 PNG、JPEG、WebP、GIF data-image 块现在会经过 Desktop 虚拟 Session 投影和 Android 展示投影保留下来。
- 继续把 Protocol v1 frame limit 与 conformance fixture 纳入发布校验。

### 兼容性与说明

- Android `0.4.3` 需要 Android 12 或更新系统（`minSdk 31`），target API 36，并提供 `arm64-v8a` 与 `armeabi-v7a` ARM APK。
- 已安装 Android `0.4.2` 的用户可以用同一 APK 签名证书原地升级到 `0.4.3`（`versionCode 23`）。
- Android 继续兼容现有 rc.2 ApiProxy 与 alpha.1/alpha.2 Typert Remote。只有 Host 同时宣告 `codex.appserver.v1` 和 `codex.appserver.transfer.v1` 时，CodeX 才会启用。
- 本版本已完成 Desktop CodeX Remote 跨机整机验证。App Server crash/reconnect 恢复与 Android 真机 CodeX E2E 仍在 `TODO.md` 中跟踪。

### 安装与下载

```sh
dsh plugin --profile web add ds-harness-remote@0.4.3
```

- [npm 包](https://www.npmjs.com/package/ds-harness-remote/v/0.4.3)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.3/dsh-remote-android-v0.4.3.apk)
- Release 附件同时包含 npm tarball 和 `SHA256SUMS.txt`。
