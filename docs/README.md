# DSH Remote 文档

## 当前仓库边界

本仓库只实现以下内容：

- DeepSeek Harness 双角色 Plugin（Host + 本地 Remote 模式）
- Android Remote Client
- `protocol`、`crypto`、`webrtc`、`client-core`、`ui` 等共享包
- 用于客户端和插件联调的 Mock Host

本仓库**不实现 DSH Remote Server**。禁止在本仓库中新增：

- `apps/server`、`apps/server-web` 或其他 Server/Admin 后端源码目录
- `apps/web` 或其他 Remote Web 前端源码目录
- FastAPI、SQLAlchemy、Alembic、SQLite Server runtime
- Server migration、Server test、Server Docker image 或 Server deployment 目录
- Admin 后端或 Server 托管的 React 站点

Server、Remote Web 和 Admin 由独立 Server 项目作为同一站点实现。本仓库保留 Server 设计和协议，是因为 Plugin Host、Plugin Client 模式与 Android 必须基于同一份外部服务契约开发。

## 权威文档

- [Server 设计说明](server.md)：定义外部 Server 的职责、API、安全边界、数据模型和部署要求；只做设计，不授权在本仓库实现。
- [Host Plugin 接入指南](plugin-integration.md)：定义账号登录、Host 授权注册、设备凭证轮换、WebSocket 和本地状态隔离要求。
- [Remote Protocol v1](protocol.md)：定义 Host、Server、Client 的线协议，是本仓库 Plugin、Client 和共享协议包的实现依据。
- [产品与功能设计](design/README.md)：定义 Plugin、Client 和共享基础能力。

文档优先级：`protocol.md` 的线协议约束高于示例代码；Server 设计发生变化时必须同步检查协议兼容性和版本号。
