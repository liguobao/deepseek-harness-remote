# DSH Remote

中文 | [English](README.en.md)

DSH Remote 是基于 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 插件机制的多端远程访问方案，让桌面端与 Android 端安全连接并操作远程 Harness。本地 Harness 还可以在原生界面中切换 `Local` 与已配对的 `Remote Host`。

它不是远程桌面、Web Shell、SSH 替代品或通用文件管理器，也不会向客户端开放任意 Shell、文件系统或 Harness tool RPC。

> [!WARNING]
> 项目仍处于开发预览阶段，需要兼容 [Remote Protocol v1](docs/protocol.md) 的外部 Server。Noise IK 跨端一致性、独立安全审查和完整生产级互操作尚未完成，请勿用于生产环境。

## 特性

- 在原生 Harness 会话界面中切换本机与远端 Host
- 使用一次性设备码配对，并在 Host 本机核对 fingerprint 后确认
- 查看、创建和操作 Harness 会话，接收消息、工具调用和权限请求等实时事件
- Remote 权限仅允许 `Allow once` 或 `Deny`，异常和断线默认拒绝
- 业务消息通过 Noise IK 认证加密；Server 只负责账号、配对、在线状态和 Relay
- 支持双角色 Desktop Plugin 与 Android Client

Host 只建立出站连接，不监听公网端口。Harness 会话、Workspace、提示词和工具输出保留在 Host；Server membership 与 Host 本地 trusted peer 必须同时成立。

## 安装与使用

在 DSH Desktop 中打开 **扩展 → 管理插件…**，使用固定 Tag 或 Commit 安装：

```text
github:liguobao/deepseek-harness-remote#<tag-or-commit>
```

安装完成后的插件名称是 `dsh-remote`。重启 Harness 后，打开
**设置 → 插件 → DSH Remote** 完成接入：角色由一个 Host/Client 开关选择，设备名
自动读取本机名称，不需要手工填写。

然后：

1. 远端机器选择 **Host**，填写 Server 和站点账号密码，点击 **Save**；密码只用于本次 HTTPS 授权，不会保存。
2. 重启远端 Harness，在侧边栏生成一次性授权码。
3. 本地机器选择 **Client**，填写同一个 Server 和授权码，点击 **Save**。
4. 回到 Host 核对 Client fingerprint 并批准；本地显示保存成功后点击 **Exit**，再重启 Harness。
5. 在本地侧边栏选择已配对的 Remote Host；选择 `This machine (Local)` 可返回本机。

配置写入 `$DSH_HOME/settings.yaml` 的 `dsh-remote` namespace，并在 Harness 重启后生效。

没有设置服务可用时，也可以通过环境变量覆盖默认 Server：

```bash
export DSH_REMOTE_SERVER=https://your-server.example.com
```

生产环境必须使用 HTTPS/WSS。Server、Remote Web 和 Admin 由独立 Server 项目实现，接入要求见 [Server 设计](docs/server.md) 与 [Host Plugin 接入指南](docs/plugin-integration.md)。

## Android

Android Client 使用 `react-native-webrtc`，不能运行在 Expo Go 中，需要 development build：

```bash
pnpm install
pnpm --filter @dsh-remote/android android
pnpm --filter @dsh-remote/android start
```

详见 [Android README](apps/android/README.md)。

## 从源码构建

需要 Node.js 22 和 pnpm 9.15.4：

```bash
pnpm install
pnpm --filter './packages/**' -r build
pnpm -r check
pnpm -r test
NODE_ENV=production pnpm -r build
```

## 文档

- [Plugin 说明](packages/plugin/README.md)
- [Remote Protocol v1](docs/protocol.md)
- [设计文档](docs/design/README.md)
- [开发任务](TODO.md)
- [贡献与仓库约束](AGENTS.md)

## License

[MIT](packages/plugin/LICENSE)
