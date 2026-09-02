# 在 dsh-TUI 中使用 DSH Remote

DSH Remote 已适配 [dsh-TUI](https://github.com/ccch1mneyyy/dsh-TUI)。安装到
`dsh-tui` profile 后，可以直接在 TUI 内使用原生 `/remote` Slash Command 管理当前机器的
Remote Host，无需 Desktop 浏览器的 `connection` 服务，也不需要单独的 `remote` 命令。

这里的“已适配”指 dsh-TUI 的插件挂载、命令注册、状态界面和二维码登录流程已接通。
远程 Workspace 的实际数据面仍使用 DSH 官方 carrier；插件不会补写 Harness API，也不会实现
另一套兼容层。

## 兼容范围

| DSH 版本 | 官方 Remote carrier | 支持情况 |
| --- | --- | --- |
| `dsh-v0.1.1-rc.2` | `ApiProxy` | 支持；TUI profile 必须挂载官方 `@deepseek-ai/dsh-host-apiproxy` |
| `dsh-v0.1.2-alpha.1`–`alpha.2` | Typert Remote Gateway | 支持；只有 Gateway 公布完整 Remote carrier 时才开放 Workspace 能力 |

dsh-TUI 会继续跟随 DSH 更新，因此不要把这张表理解为对未来 DSH 版本的自动兼容承诺。
当前版本已经覆盖 TUI Host 激活和 `/remote` 管理流程；真实双机环境仍建议按本文最后的检查清单
完成一次 Workspace、Session 和 Prompt 验证。

## 安装

先按照 [dsh-TUI 项目说明](https://github.com/ccch1mneyyy/dsh-TUI) 安装 dsh-TUI，并确认其使用的
DSH 版本位于上面的兼容范围。然后把 Remote 插件安装到同一个 profile：

```sh
dsh plugin --profile dsh-tui add ds-harness-remote@0.4.3
```

安装完成后启动或重启 dsh-TUI：

```sh
dsh-tui
```

`dsh-tui` 与 `dsh --profile dsh-tui` 使用同一个 profile。Remote Host 控制在这个纯终端入口中
默认开启，Server 固定为 `https://dsh.r2049.cn`；当前不提供 Host 地址配置。

## 登录与 Host 管理

在 dsh-TUI 输入 `/remote`，可以使用以下命令：

```text
/remote                    # 打开状态界面
/remote status             # 打开状态界面
/remote login              # 默认使用知乎二维码登录
/remote login zhihu
/remote login github
/remote logout
```

子命令和登录平台均支持 Tab 补全。

### 扫码登录

1. 输入 `/remote login` 使用知乎，或输入 `/remote login github` 使用 GitHub。
2. 使用对应 App 扫描终端中的二维码；也可以直接点击二维码下方的授权 URL。
3. 在浏览器完成授权，等待 TUI 显示登录成功。
4. 输入 `/remote status`，确认授权状态和 Server 连接状态正常。

`/remote logout` 会撤销当前 Host 凭证并轮换本地设备身份。再次登录后，这台机器会作为新设备
重新授权。

## rc.2：补齐官方 ApiProxy

部分 `dsh-v0.1.1-rc.2` 的纯 TUI profile 没有默认挂载 ApiProxy。这种情况下，`/remote` 登录和
Host 在线状态仍可用，但 `/remote status` 会显示 Harness Remote API 不可用，远程客户端也不能
进入 Workspace。

先确保当前 profile 已安装 DSH 官方的 `@deepseek-ai/dsh-host-apiproxy@0.1.1-rc.2`。如果 TUI
profile 尚未挂载它，可以创建 `remote-rc2.patch.yml`：

```yaml
- insert:
    - id: remote-directory-picker
      name: '@deepseek-ai/dsh-host-directory-picker-browse'
    - id: remote-api-gateway
      name: '@deepseek-ai/dsh-host-apiproxy'
      config:
        nativeOpen: false
- id: ds-harness-remote-tui
  inject: [settings, typertGateway, apiProxy, commands, tuiCommandTrees, tuiScenes]
```

再用该覆盖启动 TUI：

```sh
dsh --profile dsh-tui --patch ./remote-rc2.patch.yml
```

这段配置只把 rc.2 官方 ApiProxy 和只读目录选择器挂进现有 profile；Remote 插件仍只负责加密
传输与固定白名单桥接，不会替代 Harness 的业务 API。

## 状态查询

`/remote` 与 `/remote status` 会显示当前 Host 的关键状态，包括：

- 固定 Server 地址和 Host 控制是否开启
- 当前设备、账号授权和 Server 连接状态
- Harness Remote API 是否可用，以及当前使用 ApiProxy 还是 Typert Remote
- 已连接的 Remote Client 数量
- 可选 Codex Remote 的状态

登录成功并不等于 Harness carrier 已就绪。用于远程操作 Workspace 时，授权、Server 连接和
Harness Remote API 三项都应正常。

## 从另一台设备连接

保持 dsh-TUI 运行，在另一台设备上使用同一账号登录 DSH Remote，然后选择这台 Host。客户端
可以是安装了 Remote 插件的 DSH Desktop、Android Client 或配套 Remote Web。

首次验证建议依次检查：

1. Host 在设备列表中在线。
2. 能列出并打开一个 Workspace。
3. 能打开或创建 Session。
4. 能发送一条 Prompt 并收到持续输出。
5. 退出远程 Workspace 后，本地 TUI 会话仍正常。

## 常见问题

### `The Host does not provide a compatible Harness Remote API`

Host 已登录并在线，但当前 profile 没有提供匹配的官方 carrier。rc.2 请检查 ApiProxy 是否按上节
挂载；alpha.1/alpha.2 请检查 Typert Gateway 是否公布完整 Remote carrier。两端 Desktop 还必须
使用同一 Harness transport 代际，rc.2 与 alpha 不能混连。

### 二维码无法扫描

优先点击二维码下方的授权 URL；如果授权场景已经退出，请重新运行 `/remote login`，或使用
`/remote login github` 指定 GitHub。

### 找不到 `/remote`

确认插件安装在 `dsh-tui` profile，而不是只安装在 `web` profile，然后完整重启 dsh-TUI。

### 为什么没有 `/remote config`

Host 控制默认开启，当前版本固定连接 `https://dsh.r2049.cn`，暂不开放 Host 配置，因此只提供
`login`、`status` 和 `logout`。
