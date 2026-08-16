# DeepSeek 远程连接

中文 | [English](README.en.md)

DeepSeek 远程连接（DSH Remote）是一套面向 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的安全远程访问方案，让用户可以通过手机或浏览器连接自己的本地 Harness。Host 仅建立出站 HTTPS/WSS 连接，无需开放本机公网端口；传输层支持 WebSocket Relay，并为 WebRTC、STUN/TURN 与网络切换后的自适应传输保留协议能力。

Host 与 Client 使用长期 X25519 设备身份密钥和 Noise IK 协议完成对端认证与端到端加密。Server 仅负责账号与设备授权、在线状态、连接协调及密文转发，无法读取会话内容。远程端只能访问明确允许的 Harness `ApiProxy` 能力，不开放 Shell、任意文件访问、远程桌面或通用工具调用；同一 Host 支持多个 Client 并发连接，每条连接的加密通道、RPC 状态和事件流相互隔离。

Desktop Plugin 默认同时提供 Host 服务和 Remote 客户端能力，无需切换或启动 Client 模式。侧边栏的 **Remote** 入口用于选择自己的在线 Host 和远端工作目录；随后继续使用当前设备上的原生 Harness UI，业务请求通过端到端加密通道在远端执行。

> [!WARNING]
> 项目仍处于开发预览阶段，需要兼容 [Remote Protocol v1](docs/protocol.md) 的外部 Server，尚未完成生产级互操作与独立安全审查，请勿用于生产环境。

## 安装与使用

在 DSH Desktop 的 **扩展 → 管理插件…** 中安装固定版本：

```text
github:liguobao/deepseek-harness-remote#v0.2.13
```

也可以使用命令行为 `web` profile 安装：

```sh
dsh plugin --profile web add "github:liguobao/deepseek-harness-remote#v0.2.13"
```

需要安装其他版本时，将 `v0.2.13` 替换为对应的 tag 或 commit；使用自定义 profile 时，将 `web` 替换为对应的 profile 名称。

重启 Harness，前往 **设置 → 插件 → 插件配置 → DeepSeek 远程连接**：

1. 配置 Server 地址。
2. 输入登录 Server 网页后生成的一次性设备授权码；授权码只用于本次 HTTPS 接入。
3. 重启 Harness，使 Host 常驻连接生效。

直接从侧边栏 **Remote** 选择 Host，再选择已有远端 Workspace 或输入远端绝对目录。首次使用时可在该页面完成 Client 身份的账号授权，无需切换插件模式或重启 Harness。进入远端工作区后仍使用本地 Harness UI；从 Remote 入口可重新打开本地工作区。

配置保存在 `$DSH_HOME/settings.yaml` 的 `dsh-remote` namespace 中，重启后生效。没有设置服务时可用 `DSH_REMOTE_SERVER` 覆盖默认 Server；生产部署必须使用 HTTPS/WSS。

## 安全边界

- Host 只建立出站连接，不监听公网端口。
- 业务消息使用 Noise IK 认证加密；Server 仅负责账号授权、membership、在线状态和 Relay。
- Client 只能访问明确允许的 `ApiProxy` 能力，不提供 Shell、任意文件访问、远程桌面或通用 Harness tool RPC。
- Client/Host 都会通过受 membership 保护的设备详情固定对端公钥；Server membership 与本地 trusted peer 必须同时成立。
- 同一 Host 支持手机 Web、电脑 Web 等不同 Client 设备同时连接；每条连接的 RPC 与原生事件流独立管理。

Android Client 与 Plugin 共享同一 ApiProxy-only 数据面：账号登录注册、成员设备列表与
identity key 固定、Adaptive transport + Noise 加密通道、`harness.api` tunnel 与 mux 事件流。
仍在开发预览阶段，需配合外部 Server 联调验证。

## 文档

- [Plugin 说明](packages/plugin/README.md)
- [协议](docs/protocol.md) · [Server 设计](docs/server.md) · [Host 接入](docs/plugin-integration.md)
- [设计文档](docs/design/README.md) · [开发任务](TODO.md) · [贡献指南](AGENTS.md)

## License

[MIT](packages/plugin/LICENSE)
