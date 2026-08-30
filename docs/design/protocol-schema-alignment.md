# Protocol Schema Alignment

状态：Draft
关联 Issue：[#34](https://github.com/liguobao/ds-harness-remote/issues/34)

## 目标

对齐 `packages/protocol` 与 `docs/protocol.md` 的线协议定义。
`docs/protocol.md` 是协议的权威来源。

## 范围

- Control hello 与 hello.ack
- Account Authorization
- Connect、Relay 与 Signaling
- ApiProxy tunnel
- Error 与 Limits
- 版本拒绝与 capability 协商
- frame、字段、counter 和 stream 限制
- 可供独立 Server 仓库复用的 conformance fixtures

## 约束

- 本仓库不实现 Server runtime。
- 业务消息只进入已认证的加密 channel。
- 本任务不扩大 ApiProxy 或 Typert Remote allowlist。
- 本任务不增加新的 Harness 业务协议。
- 每个边界变更必须增加协议测试。
- 线协议变更必须同步更新 `docs/protocol.md`。

## 实施顺序

1. 建立文档与代码 schema 差异表。
2. 固定 hello 版本拒绝和 capability 规则。
3. 固定 frame、字段和 counter 限制。
4. 对齐 Control、Connect、Relay、Error 和 tunnel schema。
5. 增加 golden vectors 和 conformance fixtures。
6. 在 Plugin、Android 和 VS Code 中验证兼容性。

## 完成标准

- 文档和运行时 schema 使用相同字段与限制。
- 非法版本、字段、长度和 counter 均 fail closed。
- 核心协议测试通过。
- fixtures 不依赖生产账号或生产 Server。
