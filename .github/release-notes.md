## English

This release includes changes since `v0.3.36` ([full comparison](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.36...v0.4.0)).

- Ships Plugin `0.4.0` and Android `0.4.0` (`versionCode 20`).
- Adds DeepSeek Harness `dsh-v0.1.2-alpha.1` Desktop support through the official Typert Remote Gateway while retaining the `dsh-v0.1.1-rc.2` ApiProxy path.
- Adds encrypted Host capability discovery, alpha unary/stream/event forwarding, bounded large-envelope transfers, and a fixed fail-closed endpoint allowlist.
- A `0.4.0` Client running Harness rc.2 remains compatible with older rc.2 Hosts through the legacy capability fallback.
- Compatibility warning: `0.4.0` does not translate Harness generations. An alpha.1 Client cannot open an rc.2 Host, and an rc.2 Client cannot open an alpha.1 Host. Mixed generations are rejected before native UI switching or Workspace mutation.

## 中文

本版本包含自 `v0.3.36` 以来的改动（[完整对比](https://github.com/liguobao/deepseek-harness-remote/compare/v0.3.36...v0.4.0)）。

- 发布 Plugin `0.4.0` 和 Android `0.4.0`（`versionCode 20`）。
- 新增 DeepSeek Harness `dsh-v0.1.2-alpha.1` Desktop 支持，使用官方 Typert Remote Gateway，同时保留 `dsh-v0.1.1-rc.2` ApiProxy 路径。
- 新增加密 Host capability 探测、alpha unary/stream/event 转发、受限大 envelope 分块和固定 fail-closed endpoint allowlist。
- 运行 Harness rc.2 的 `0.4.0` Client 仍可通过 legacy capability 降级连接旧 rc.2 Host。
- 兼容性提示：`0.4.0` 不翻译 Harness 代际。alpha.1 Client 不能打开 rc.2 Host，rc.2 Client 也不能打开 alpha.1 Host；混连会在切换原生 UI 或修改 Workspace 前被拒绝。
