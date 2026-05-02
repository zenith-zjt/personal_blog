# 阶段 7 安全与部署加固记录

## 已实现目标

- 后台入口支持通过 `ADMIN_ROUTE_BASE` 修改，例如 `/private-desk-2026`。
- 启用自定义后台入口后，默认 `/admin-archive-portal` 会返回 404，降低入口被猜中的概率。
- 后台登录增加基于来源、账号、User-Agent 的内存限流：15 分钟窗口内失败 5 次后锁定 15 分钟。
- 会话 Cookie 使用 `httpOnly`、`sameSite=strict`、生产环境 `secure`、`priority=high`。
- 生产环境必须设置 `ADMIN_SESSION_SECRET`，不再允许使用默认会话签名密钥。
- 登录页不再展示默认账号密码，也不再自动填充默认凭据。
- 通过 `proxy.ts` 阻断 `/data/*` 与 `/content/*` 的直接访问，避免配置或内容源文件被静态路径误暴露。
- `next.config.ts` 增加基础安全响应头与后台 no-store/noindex 头。
- 新增 Docker 部署配置，参考 `docs/dev-ops` 中的另一项目配置，并适配本项目的 `data` 与 `content` 持久化目录。

## 部署环境变量

```env
ADMIN_ROUTE_BASE=/private-desk-2026
ADMIN_SESSION_SECRET=replace-with-a-long-random-secret
ADMIN_SESSION_SECURE=auto
APP_PORT=3000
IMAGE_TAG=latest
```

## 运维注意

- `ADMIN_ROUTE_BASE` 不要使用 `/api`、`/_next`、`/kb`、`/search` 等公开或系统路径前缀。
- `ADMIN_SESSION_SECRET` 建议使用至少 32 字节随机字符串；修改后，旧后台会话会立即失效。
- `ADMIN_SESSION_SECURE` 默认 `auto`：请求经过 HTTPS 或反向代理携带 `x-forwarded-proto=https` 时会自动启用 `Secure`；如果直接通过 `http://IP:端口` 访问容器，会自动关闭 `Secure` 以避免登录后刷新丢会话。也可显式设为 `true` 或 `false`。
- `data` 与 `content` 不应进入镜像，应通过 volume 持久化。
- 生产部署后应立即修改默认 `admin/admin` 凭据。
