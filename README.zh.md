# DeepSeek Harness Remote

[English](README.md) | 中文

## 一次连接，随时可用。

从手机、平板或任意浏览器继续 DeepSeek Harness 会话。

无论使用哪台设备，都可以回到同一个 Harness 会话。Harness 始终运行在工作电脑上，原有的工作区、工具和项目配置保持不变。Remote 只是通往这个工作环境的另一个窗口。

> **开发者预览** — 安装时请固定到明确版本。

## 你可以

- 跟进正在进行的会话，查看最新进展
- 发送新的指令，或调整任务方向
- 回答问题，处理权限请求
- 打开任意已连接电脑上的工作区
- 在设备之间切换，而无需迁移工作

你可以在浏览器中打开 Remote，也可以从另一台电脑的 Harness 进入 **Remote** 工作区。

## 安装 Host 插件

在运行 Harness 和项目的电脑上安装插件。

在 DSH Desktop 中打开 **扩展 → 管理插件…**，安装：

```text
github:liguobao/deepseek-harness-remote#v0.2.23
```

也可以为 `web` profile 使用命令行安装：

```sh
dsh plugin --profile web add "github:liguobao/deepseek-harness-remote#v0.2.23"
```

重启 Harness，然后打开 **设置 → 插件 → 插件配置 → DeepSeek 远程连接**。

## 关联电脑

先使用邀请码 [NRAE-NUUM-C9UY](https://dsh.r2049.cn/app/register?invite_code=NRAE-NUUM-C9UY) 注册账号，然后：

1. 登录站点，生成一次性关联码。
2. 在 Host 插件中输入关联码。
3. 设备显示在线后，即可开始远程使用。

> **注意：** 自建中转节点方案将在稍后提供。

## 安全连接，边界清晰

- Host 只主动向外连接，不开放公网端口。
- 会话流量经过端到端加密；服务端只中继密文，不保存会话明文或设备私钥。
- Remote 仅开放界面所需的 Harness 能力，不提供 Shell 或远程桌面。
- 目录浏览只能列出文件夹，不能读取文件或修改文件系统。
- 移除设备后，对应的 Remote 访问立即失效。

实现细节请参阅[插件说明](packages/plugin/README.md)、[文档索引](docs/README.md)和[远程协议](docs/protocol.md)。

## License

[MIT](packages/plugin/LICENSE)
