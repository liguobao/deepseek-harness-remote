# DeepSeek 远程连接

中文 | [English](README.en.md)

DeepSeek 远程连接（DSH Remote）是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的 Remote Host Plugin。仓库保留 Desktop Client 实现，但当前版本暂不开放 Client 模式和本地/远程切换入口。

> [!WARNING]
> 项目仍处于开发预览阶段，需要兼容 [Remote Protocol v1](docs/protocol.md) 的外部 Server，尚未完成生产级互操作与独立安全审查，请勿用于生产环境。

## 安装与使用

在 DSH Desktop 的 **扩展 → 管理插件…** 中安装固定版本：

```text
github:liguobao/deepseek-harness-remote#v0.2.12
```

也可以使用命令行为 `web` profile 安装：

```sh
dsh plugin --profile web add "github:liguobao/deepseek-harness-remote#v0.2.12"
```

需要安装其他版本时，将 `v0.2.12` 替换为对应的 tag 或 commit；使用自定义 profile 时，将 `web` 替换为对应的 profile 名称。

重启 Harness，前往 **设置 → 插件 → 插件配置 → DeepSeek 远程连接**：

1. 配置 Server 地址。
2. 输入登录 Server 网页后生成的一次性设备授权码；授权码只用于本次 HTTPS 接入。
3. 重启 Harness，使 Host 常驻连接生效。

当前 Plugin 固定运行 Host 模式；Client 配置和侧边栏本地/远程切换入口暂时隐藏。

配置保存在 `$DSH_HOME/settings.yaml` 的 `dsh-remote` namespace 中，重启后生效。没有设置服务时可用 `DSH_REMOTE_SERVER` 覆盖默认 Server；生产部署必须使用 HTTPS/WSS。

## 安全边界

- Host 只建立出站连接，不监听公网端口。
- 业务消息使用 Noise IK 认证加密；Server 仅负责账号授权、membership、在线状态和 Relay。
- Client 只能访问明确允许的 `ApiProxy` 能力，不提供 Shell、任意文件访问、远程桌面或通用 Harness tool RPC。
- Client/Host 都会通过受 membership 保护的设备详情固定对端公钥；Server membership 与本地 trusted peer 必须同时成立。

Android 原型已冻结，尚不兼容当前 ApiProxy-only 数据面。

## 文档

- [Plugin 说明](packages/plugin/README.md)
- [协议](docs/protocol.md) · [Server 设计](docs/server.md) · [Host 接入](docs/plugin-integration.md)
- [设计文档](docs/design/README.md) · [开发任务](TODO.md) · [贡献指南](AGENTS.md)

## License

[MIT](packages/plugin/LICENSE)
