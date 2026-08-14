# DSH Remote

中文 | [English](README.en.md)

DSH Remote 是 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) 的双角色 Desktop Plugin，让本地 Harness 通过官方 `ApiProxy` 安全连接另一台机器上的 Harness。

> [!WARNING]
> 项目仍处于开发预览阶段，需要兼容 [Remote Protocol v1](docs/protocol.md) 的外部 Server，尚未完成生产级互操作与独立安全审查，请勿用于生产环境。

## 安装与使用

在 DSH Desktop 的 **扩展 → 管理插件…** 中安装固定版本：

```text
github:liguobao/deepseek-harness-remote#<tag-or-commit>
```

重启 Harness，前往 **设置 → 插件 → 插件配置 → DSH Remote**：

1. 远端机器选择 **Host**，填写 Server 和站点账号密码并保存；密码仅用于本次 HTTPS 授权，不会存储。
2. 重启远端 Harness，在侧边栏生成一次性授权码。
3. 本地机器选择 **Client**，填写相同的 Server 和授权码并保存。
4. 在 Host 核对并批准 Client fingerprint；配对成功后重启本地 Harness。
5. 从本地侧边栏选择 Remote Host；选择 `This machine (Local)` 可切回本机。

配置保存在 `$DSH_HOME/settings.yaml` 的 `dsh-remote` namespace 中，重启后生效。没有设置服务时可用 `DSH_REMOTE_SERVER` 覆盖默认 Server；生产部署必须使用 HTTPS/WSS。

## 安全边界

- Host 只建立出站连接，不监听公网端口。
- 业务消息使用 Noise IK 认证加密；Server 仅负责账号、配对、在线状态和 Relay。
- Client 只能访问明确允许的 `ApiProxy` 能力，不提供 Shell、任意文件访问、远程桌面或通用 Harness tool RPC。
- Server membership 与 Host 本地 trusted peer 必须同时成立。

Android 原型已冻结，尚不兼容当前 ApiProxy-only 数据面。

## 文档

- [Plugin 说明](packages/plugin/README.md)
- [协议](docs/protocol.md) · [Server 设计](docs/server.md) · [Host 接入](docs/plugin-integration.md)
- [设计文档](docs/design/README.md) · [开发任务](TODO.md) · [贡献指南](AGENTS.md)

## License

[MIT](packages/plugin/LICENSE)
