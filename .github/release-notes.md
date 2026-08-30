## English

This release includes changes since `v0.4.1` ([full comparison](https://github.com/liguobao/ds-harness-remote/compare/v0.4.1...v0.4.2)).

- Ships Plugin `0.4.2` and Android `0.4.2` (`versionCode 22`).
- Adds DeepSeek Harness `dsh-v0.1.2-alpha.2` support while retaining the alpha.1 Typert Remote and rc.2 ApiProxy paths.
- Fixes Host startup with alpha.2 after Harness removed the `settingsNamespace` export.
- Preserves alpha.2 Remote failure identity across Desktop stream forwarding instead of collapsing failures to `gateway/internal`.
- Validates the committed GitHub/npm Bundle against the alpha.2 package surface.

## 中文

本版本包含自 `v0.4.1` 以来的改动（[完整对比](https://github.com/liguobao/ds-harness-remote/compare/v0.4.1...v0.4.2)）。

- 发布 Plugin `0.4.2` 和 Android `0.4.2`（`versionCode 22`）。
- 新增 DeepSeek Harness `dsh-v0.1.2-alpha.2` 支持，同时保留 alpha.1 Typert Remote 与 rc.2 ApiProxy 路径。
- 修复 Harness alpha.2 删除 `settingsNamespace` 导出后导致的 Host 启动失败。
- 保持 alpha.2 Remote stream 错误身份与错误码，不再被本机 Harness mux 折叠为 `gateway/internal`。
- 使用 alpha.2 包表面验证提交的 GitHub/npm Bundle。
