## English

This release includes changes since `v0.4.3` ([full comparison](https://github.com/liguobao/ds-harness-remote/compare/v0.4.3...v0.4.6)). It supersedes the revoked `v0.4.5` release.

### Highlights

- Ships Plugin `0.4.6` with the Remote directory picker fallback fix.
- Fixes Web/DSH path selection when the native alpha `directoryPicker.list` path requires the Browser capability and returns errors such as ``directoryPicker.list needs the Brower capability``.
- Provides read-only Host directory metadata fallback for Remote workspace browsing, including CodeX new-session folder selection and normal DSH workspace path selection.
- Keeps the fallback inside the existing encrypted Remote channel and preserves the repository safety boundary: directory metadata only, no file content reads, writes, uploads, shell, PTY, or remote desktop behavior.
- Keeps rc.2 ApiProxy and alpha.1/alpha.2 Typert Remote compatibility while normalizing Host capability checks so supported clients can enable path selection.

### Validation

- Release workflow passed package build, tests, npm publish, GitHub Packages publish, GitHub Release packaging, and Android APK attachment.
- Local pre-release checks passed: plugin check, focused picker tests, full plugin tests, build, DSH bundle verification, and `git diff --check`.

### Install and downloads

```sh
dsh plugin --profile web add ds-harness-remote@0.4.6
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.6
```

- [npm package](https://www.npmjs.com/package/ds-harness-remote/v/0.4.6)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.6/dsh-remote-android-v0.4.6.apk)
- Release assets also include the npm tarball and `SHA256SUMS.txt`.

## 中文

本版本包含自 `v0.4.3` 以来的改动（[完整对比](https://github.com/liguobao/ds-harness-remote/compare/v0.4.3...v0.4.6)）。它替代已撤销的 `v0.4.5`。

### 主要变更

- 发布 Plugin `0.4.6`，包含 Remote 目录选择 fallback 修复。
- 修复 Web/DSH 路径选择在原生 alpha `directoryPicker.list` 要求 Browser capability 时失败的问题，包括 ``directoryPicker.list needs the Brower capability`` 这类错误。
- 为 Remote workspace 浏览提供只读 Host 目录元数据 fallback，覆盖 CodeX 新会话文件夹选择和普通 DSH workspace 路径选择。
- fallback 仍限制在现有加密 Remote 通道内，并保持仓库安全边界：只返回目录元数据，不读取文件内容，不写入、不上传、不提供 shell、PTY 或远程桌面能力。
- 继续兼容 rc.2 ApiProxy 与 alpha.1/alpha.2 Typert Remote，并规范 Host capability 判断，让支持的客户端可以启用路径选择。

### 验证

- 发布 workflow 已通过 package build、测试、npm 发布、GitHub Packages 发布、GitHub Release 打包和 Android APK 附件上传。
- 本地发布前已通过 plugin check、目录选择相关测试、完整 plugin 测试、build、DSH bundle 校验和 `git diff --check`。

### 安装与下载

```sh
dsh plugin --profile web add ds-harness-remote@0.4.6
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.6
```

- [npm 包](https://www.npmjs.com/package/ds-harness-remote/v/0.4.6)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.6/dsh-remote-android-v0.4.6.apk)
- Release 附件同时包含 npm tarball 和 `SHA256SUMS.txt`。
