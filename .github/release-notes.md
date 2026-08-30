## English

This release includes changes since `v0.4.1` ([full comparison](https://github.com/liguobao/ds-harness-remote/compare/v0.4.1...v0.4.2)).

### Highlights

- Ships Plugin `0.4.2` and Android `0.4.2` (`versionCode 22`).
- Adds DeepSeek Harness `dsh-v0.1.2-alpha.2` support while retaining the alpha.1 Typert Remote and rc.2 ApiProxy paths.
- Fixes Host startup with alpha.2 after Harness removed the `settingsNamespace` export.
- Preserves alpha.2 Remote failure identity across Desktop stream forwarding instead of collapsing failures to `gateway/internal`.
- Corrects prerelease peer ranges and validates strict npm installation with both the `0.1.1-rc.2` and `0.1.2-alpha.2` Harness package families.
- Aligns package and project metadata with the canonical `liguobao/ds-harness-remote` repository for verified npm provenance.

### Install and downloads

```sh
dsh plugin --profile web add ds-harness-remote@0.4.2
```

- [npm package](https://www.npmjs.com/package/ds-harness-remote/v/0.4.2)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.2/dsh-remote-android-v0.4.2.apk)
- Release assets also include the npm tarball and `SHA256SUMS.txt`.

## 中文

本版本包含自 `v0.4.1` 以来的改动（[完整对比](https://github.com/liguobao/ds-harness-remote/compare/v0.4.1...v0.4.2)）。

### 主要变更

- 发布 Plugin `0.4.2` 和 Android `0.4.2`（`versionCode 22`）。
- 新增 DeepSeek Harness `dsh-v0.1.2-alpha.2` 支持，同时保留 alpha.1 Typert Remote 与 rc.2 ApiProxy 路径。
- 修复 Harness alpha.2 删除 `settingsNamespace` 导出后导致的 Host 启动失败。
- 保持 alpha.2 Remote stream 错误身份与错误码，不再被本机 Harness mux 折叠为 `gateway/internal`。
- 修正 prerelease peer range，并分别使用 `0.1.1-rc.2` 与 `0.1.2-alpha.2` Harness 包族完成严格 npm 安装验证。
- 将包与项目元数据统一到新的规范仓库 `liguobao/ds-harness-remote`，确保 npm provenance 验证通过。

### 安装与下载

```sh
dsh plugin --profile web add ds-harness-remote@0.4.2
```

- [npm 包](https://www.npmjs.com/package/ds-harness-remote/v/0.4.2)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.2/dsh-remote-android-v0.4.2.apk)
- Release 附件同时包含 npm tarball 和 `SHA256SUMS.txt`。
