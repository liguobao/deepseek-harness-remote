# DeepSeek Harness Remote

English | [中文](README.zh.md)

## Connect once. Ready whenever you are.

Continue a DeepSeek Harness session from your phone, tablet, or any browser.

Return to the same Harness session from whichever device is with you. Harness keeps running on your work computer, with the same workspaces, tools, and project setup. Remote is simply another window into that environment.

> **Developer preview** — pin an explicit version when installing.

## What you can do

- Follow an active session and review its latest progress
- Send new instructions or change direction
- Answer questions and respond to permission requests
- Open workspaces from any connected computer
- Move between devices without moving your work

Remote is available in a browser and through the **Remote** workspace entry in Harness on another computer.

## Install the Host plugin

Install the plugin on the computer where Harness and your projects run.

In DSH Desktop, open **Extensions → Manage plugins…** and install:

```text
github:liguobao/deepseek-harness-remote#v0.2.23
```

Or install it for the `web` profile:

```sh
dsh plugin --profile web add "github:liguobao/deepseek-harness-remote#v0.2.23"
```

Restart Harness, then open **Settings → Plugins → Plugin configuration → DeepSeek Remote Connection**.

## Link your computer

Create an account with invitation code [NRAE-NUUM-C9UY](https://dsh.r2049.cn/app/register?invite_code=NRAE-NUUM-C9UY), then:

1. Sign in and generate a one-time link code.
2. Enter the code in the Host plugin.
3. When the computer appears online, open it from Remote.

> **Note:** A self-hosted relay node option will be provided later.

## Secure by design

- The Host makes outbound connections only. No public port is opened.
- Session traffic is end-to-end encrypted. The service relays ciphertext without storing session plaintext or device private keys.
- Remote exposes only the Harness capabilities required by the interface. It does not provide a shell or remote desktop.
- Folder browsing lists directories only; it cannot read files or change the filesystem.
- Removing a device immediately revokes its Remote access.

For implementation details, see the [Plugin guide](packages/plugin/README.md), [documentation index](docs/README.md), and [Remote Protocol](docs/protocol.md).

## License

[MIT](packages/plugin/LICENSE)
