# HttpOnly 会话认证约定

前端不保存、读取或拼接 access token。登录态由后端写入的 HttpOnly Cookie 表示，Axios 与流式 `fetch` 请求均携带 `credentials`，应用启动时调用 `GET /api/auth/me` 恢复当前用户。

## 前后端契约

- `POST /api/auth/login` 和 `POST /api/auth/register`：成功时通过 `Set-Cookie` 写入会话 Cookie，并在响应中返回 `currentUser`。`accessToken` 可以缺失或为 `null`，前端不会使用它。
- `GET /api/auth/me`：Cookie 有效时返回当前用户；无效或过期时返回 `401`。
- `POST /api/auth/logout`：用过期 `Set-Cookie` 清除访问 Cookie。当前访问令牌是无服务端会话的短期 JWT，因此退出不会追溯吊销已经泄露的令牌；前端仅在请求成功后清除本地用户状态，失败时展示错误。
- Cookie 应至少使用 `HttpOnly`、`SameSite` 和合适环境下的 `Secure` 属性，并限定尽可能小的 `Path`/`Domain`。
- Cookie 认证的写请求需要 CSRF 防护。当前后端验证 `Origin`；若未来改为跨站部署，应使用明确的 CORS allowlist，并考虑同步 token 或双重提交 Cookie，而不是放宽到通配来源。

开发环境默认通过 Vite `/api` 代理保持同源。若设置 `VITE_API_BASE_URL` 指向其他源，后端必须返回精确的 `Access-Control-Allow-Origin`、`Access-Control-Allow-Credentials: true`，且浏览器 Cookie 属性必须允许该部署拓扑。

## 失败语义

- 任意受保护请求收到 `401` 时，统一清除内存中的 `currentUser`，并从受保护路由跳转到登录页。
- `/me` 因网络或服务端 `5xx` 失败时不会当作“没有数据”；登录页展示会话恢复错误并提供重试。
- 应用不会把认证材料写入 `localStorage`、`sessionStorage`、IndexedDB 或可被 JavaScript 读取的 Cookie。
