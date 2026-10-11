# Decap CMS 部署核对清单

> 面向：站点维护者（红尘笑）
> 场景：`public/admin/` 已随仓库发布，CMS 后台在 `/admin/`，
> 但**登录链路依赖两处外部配置**（Cloudflare 环境变量 + GitHub OAuth App），
> 这两处不在仓库里，无法由 CI 自动校验。本清单用于人工核对。

## 链路总览

```plain
浏览器 /admin/
  └─ 点「Login with GitHub」
      └─ GET https://blog.kssku.top/oauth/github        （CF Pages Function）
          └─ 302 到 github.com/login/oauth/authorize    ← 需要 GITHUB_CLIENT_ID
              └─ 用户授权后回调 /oauth/github?code=...
                  └─ POST github.com/login/oauth/access_token ← 需要 GITHUB_CLIENT_SECRET
                      └─ 302 回 /admin/ 并带上 token
```

任一处缺失，症状不同（见下表），可据此反推缺的是哪一环。

## 1. Cloudflare Pages 环境变量

**位置**：Cloudflare Dashboard → Workers & Pages → 选中本项目 → Settings → Environment variables

**要点**：CF Pages 的变量分 **Production** 和 **Preview** 两套，互不影响。
线上是 Production，所以**变量必须挂在 Production 上**（或两套都挂）。

需存在以下两个变量（值不要贴进任何文件/提交）：

| 变量名 | 来源 | 缺失症状 |
|--------|------|----------|
| `GITHUB_CLIENT_ID` | GitHub OAuth App 的 Client ID | 授权页报 `The client_id is not valid` 或直接 500 |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App 的 Client Secret | 回调后报 `bad_verification_code` / 换 token 失败 |

**自查命令**（公开端点，不泄露密钥，只反映「函数有没有拿到变量」）：

```bash
# 健康检查：不带 code 时函数应返回 {"status":"ok"} 或类似
curl -s https://blog.kssku.top/oauth/github | head -c 200
```

> 注意：健康检查分支**不校验** client_id/secret 是否有效，
> 返回 ok 只能证明函数已部署，**不能**证明变量配对正确。

## 2. GitHub OAuth App

**位置**：GitHub → Settings → Developer settings → OAuth Apps

**要点**：如果这里没有对应条目，说明 App 尚未创建，需要新建：

| 字段 | 值 |
|------|-----|
| Application name | 任意，如 `astro-koharu-blog CMS` |
| Homepage URL | `https://blog.kssku.top` |
| Authorization callback URL | `https://blog.kssku.top/oauth/github` |

创建后：
- `Client ID` → 填到 CF 的 `GITHUB_CLIENT_ID`
- `Generate a new client secret` → 填到 CF 的 `GITHUB_CLIENT_SECRET`
  （secret 只显示一次，关掉页面就得重新生成）

**Callback URL 必须完全一致**：协议、域名、路径都不能差，
末尾多一个 `/` 也会导致 GitHub 拒绝并报 `redirect_uri_mismatch`。

## 3. 常见错误对照表

| 浏览器/回调看到的错误 | 缺哪一环 |
|----------------------|----------|
| `The client_id is not valid` | CF 未配 `GITHUB_CLIENT_ID`，或配到了 Preview 而非 Production |
| `redirect_uri_mismatch` | GitHub OAuth App 的 callback URL 与 `/oauth/github` 不一致 |
| `bad_verification_code` | CF 的 `GITHUB_CLIENT_SECRET` 错误或过期 |
| 授权成功但回不到 `/admin/` | `config.yml` 的 `base_url` / `auth_endpoint` 有误 |
| 进后台但读不到文章列表 | `config.yml` 的 `repo` / `branch` 与仓库实际不符 |

## 4. 本地文件对照（仓库内，可被校验）

以下字段在 `public/admin/config.yml`，改动后需重新构建部署：

```yaml
backend:
  name: github
  repo: kssku/astro-koharu-blog   # 必须与实际仓库一致
  branch: main                     # 必须与实际默认分支一致
  base_url: https://blog.kssku.top # 站点线上域名
  auth_endpoint: oauth/github      # 对应 functions/oauth/github.ts
```

`media_folder` / `public_folder` 决定图片上传落点：

```yaml
media_folder: public/img/uploads   # 仓库内实际路径
public_folder: /img/uploads        # 线上访问路径
```

## 5. 改动后的验证步骤

1. 改 CF 环境变量 → **需要重新部署**才生效（Deployments → Retry deployment）
2. 改 GitHub OAuth App → 立即生效，无需部署
3. 改 `config.yml` → 需 `pnpm build` 后重新部署
4. 验证：浏览器开 `https://blog.kssku.top/admin/`，点登录，应能走完授权并进入后台