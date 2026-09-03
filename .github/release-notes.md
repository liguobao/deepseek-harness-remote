## English

`v0.4.9` improves remote workspace discovery and connection feedback across Desktop and Android. It contains the changes since `v0.4.8` ([full comparison](https://github.com/liguobao/ds-harness-remote/compare/v0.4.8...v0.4.9)).

### What changed

- Refines the Desktop Remote workspace chooser: the header shows the selected Host, platform, Harness version, and Plugin version, with a direct action to choose another Host.
- Shows three DSH and three CodeX workspaces by default, provides centered expand actions without nested scrollbars, uses DeepSeek and GPT workspace icons, and supports opening a workspace by double-clicking its row.
- Drives Desktop connection feedback from the Host runtime's real transport phases and selected route, and removes the extra simulated progress step when opening a workspace.
- Adds separate DSH and CodeX workspace tabs plus name/path search on Android, and opens the first conversation immediately after a workspace is created.
- Keeps the underlying Remote protocol, Host transport, and security boundaries unchanged.
- Synchronizes the Plugin and Android app at version `0.4.9` with Android `versionCode 26`.

### Validation

The release pipeline runs workspace type checks and tests, verifies the committed DSH bundles, performs production builds, publishes the npm and GitHub Packages artifacts, and builds the Android APK.

### Install and downloads

Install through DSH's plugin manager rather than adding the npm package directly:

```sh
dsh plugin --profile web add ds-harness-remote@0.4.9
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.9
```

- [npm package](https://www.npmjs.com/package/ds-harness-remote/v/0.4.9)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.9/dsh-remote-android-v0.4.9.apk)
- Release assets also include the npm tarball and `SHA256SUMS.txt`.

## 中文

`v0.4.9` 改进 Desktop 与 Android 的远程工作区发现和连接反馈。本版本包含自 `v0.4.8` 以来的改动（[完整对比](https://github.com/liguobao/ds-harness-remote/compare/v0.4.8...v0.4.9)）。

### 主要变更

- 优化 Desktop Remote 工作区选择器：顶部显示所选 Host、平台、Harness 版本和 Plugin 版本，并可直接选择其他 Host。
- DSH 与 CodeX 工作区默认各显示三项，通过整行居中的展开入口加载更多，不再使用嵌套滚动条；工作区行使用 DeepSeek 与 GPT 图标，并支持双击直接打开。
- Desktop 连接进度改为跟随 Host runtime 的真实 transport 阶段与最终路径，打开工作区时不再额外显示模拟进度步骤。
- Android 新增 DSH 与 CodeX 工作区分页、名称/路径搜索，并在创建工作区后直接打开首个会话。
- Remote 协议、Host transport 与安全边界均未改变。
- Plugin 与 Android App 版本统一更新为 `0.4.9`，Android `versionCode` 更新为 `26`。

### 验证

Release pipeline 会执行 workspace 类型检查与测试、校验已提交的 DSH bundle、完成生产构建、发布 npm 与 GitHub Packages 产物，并构建 Android APK。

### 安装与下载

请通过 DSH Plugin 管理器安装，不要直接将 npm 包加入项目：

```sh
dsh plugin --profile web add ds-harness-remote@0.4.9
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.9
```

- [npm 包](https://www.npmjs.com/package/ds-harness-remote/v/0.4.9)
- [Android APK](https://github.com/liguobao/ds-harness-remote/releases/download/v0.4.9/dsh-remote-android-v0.4.9.apk)
- Release 附件还包括 npm tarball 与 `SHA256SUMS.txt`。
