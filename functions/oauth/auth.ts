// Decap CMS GitHub OAuth 授权端 —— 部署为 CF Pages Function，路由 /oauth/auth
//
// 职责：接收 Decap 发起的授权请求，拼接 GitHub authorize URL 并 302 跳转过去。
//
// Decap 的 github backend 授权流程（弹窗 + postMessage）：
//   1. CMS 打开弹窗 -> <base_url>/<auth_endpoint>?provider=github&site_id=...
//   2. 本端 302 到 https://github.com/login/oauth/authorize?client_id=...&redirect_uri=.../oauth/callback
//   3. GitHub 回跳 /oauth/callback?code=...（见 callback.ts），由它换 token 并 postMessage 回 CMS
//
// 注意：redirect_uri 必须与 GitHub OAuth App 里登记的
//       Authorization callback URL 完全一致（https://blog.kssku.top/oauth/callback）。

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);

  // 健康检查 / CMS 探测（无 provider 参数时）
  const provider = url.searchParams.get('provider');
  if (!provider) {
    return new Response(JSON.stringify({ status: 'ok' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const clientId = env.GITHUB_CLIENT_ID;

  if (!clientId) {
    return new Response(JSON.stringify({ error: 'Missing GITHUB_CLIENT_ID' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' },
    });
  }

  // 回调地址固定指向本站的 /oauth/callback，与 GitHub OAuth App 登记值保持一致
  const redirectUri = `${url.origin}/oauth/callback`;

  const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
  authorizeUrl.searchParams.set('client_id', clientId);
  authorizeUrl.searchParams.set('redirect_uri', redirectUri);
  // 让 GitHub 回传的 code 只能换 token，不给多余权限
  authorizeUrl.searchParams.set('scope', 'repo');

  return Response.redirect(authorizeUrl.toString(), 302);
};
