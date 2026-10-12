// Decap CMS GitHub OAuth 会话端点 —— 部署为 CF Pages Function，路由 /session
//
// 职责：
//   Decap 新版 github backend 的「无弹窗」认证流程会直接
//   POST /session（Content-Type: application/x-www-form-urlencoded），
//   body 里带 GitHub 回跳的 code。本端点用 code 换 access_token，
//   再以 JSON 形式返回给 Decap，前端收到后即完成登录。
//
// 与 /oauth/callback 的区别：
//   /oauth/callback 走的是「弹窗 + postMessage」老协议；
//   /session       走的是「前端直接 fetch」新协议。
//   两条路都保留，兼容不同版本的 Decap。
//
// 期望返回格式（Decap github backend）：
//   { "token": "gho_xxx", "provider": "github" }

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/** 统一的 JSON 响应构造 */
function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      // 与 auth.ts 保持一致：允许同源页面直接 fetch
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/** 从请求里提取 GitHub 回传的 code —— 兼容 form body / JSON body / query 三种传法 */
async function extractCode(request: Request): Promise<string | null> {
  const url = new URL(request.url);

  // 1. query 参数（部分版本会走 ?code=...）
  const fromQuery = url.searchParams.get('code');
  if (fromQuery) return fromQuery;

  // 2. 请求体
  if (request.method === 'POST' || request.method === 'PUT' || request.method === 'PATCH') {
    const contentType = request.headers.get('content-type') || '';
    try {
      if (contentType.includes('application/json')) {
        const body = (await request.json()) as Record<string, unknown>;
        const code = body?.code;
        if (typeof code === 'string' && code) return code;
      } else {
        // 默认按 form-urlencoded 解析（浏览器实测就是这种）
        const text = await request.text();
        const params = new URLSearchParams(text);
        const code = params.get('code');
        if (code) return code;
      }
    } catch {
      // 解析失败按无 code 处理，交给上层回 400
    }
  }

  return null;
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;

  // 健康检查：GET /session 无 code 时返回 ok，方便探测
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (!url.searchParams.get('code')) {
      return json({ status: 'ok' });
    }
  }

  // 预检请求直接放行
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return json({ error: 'missing_credentials', error_description: '服务端缺少 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET' }, 500);
  }

  const code = await extractCode(request);
  if (!code) {
    return json({ error: 'missing_code', error_description: '请求中未找到 GitHub 授权 code' }, 400);
  }

  // 用 code 换 access_token
  let tokenData: Record<string, string>;
  try {
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
      }),
    });
    tokenData = (await tokenResponse.json()) as Record<string, string>;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'token_exchange_failed';
    return json({ error: 'token_exchange_failed', error_description: reason }, 502);
  }

  if (!tokenData.access_token) {
    const reason = tokenData.error_description || tokenData.error || 'unknown_error';
    return json({ error: tokenData.error || 'unknown_error', error_description: reason }, 400);
  }

  // Decap github backend 期望的最小会话结构
  return json({
    token: tokenData.access_token,
    provider: 'github',
  });
};
