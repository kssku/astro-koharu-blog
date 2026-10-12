// Decap CMS GitHub OAuth 回调端 —— 部署为 CF Pages Function，路由 /oauth/callback
//
// 职责：
//   1. 接收 GitHub 回跳的 ?code=...
//   2. 用 code 换 access_token
//   3. 返回一段 HTML，通过 window.opener.postMessage 把 token 送回打开弹窗的 CMS 页面
//
// 注意：这里**不能**直接返回 JSON。Decap 的 github backend 走的是弹窗 + postMessage
// 协议（见 decaporg/decap-cms 的 authenticate 流程），返回 JSON 会卡在回调页不关闭。

const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

/** 转义放进 HTML/JS 字符串里的内容，避免注入与语法破坏 */
function escapeForJs(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

/** 构建回传给 CMS 父窗口的 HTML 页面 */
function renderHtml(status: 'success' | 'error', payload: string, message: string): string {
  const payloadJs = escapeForJs(payload);
  const messageJs = escapeForJs(message);

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>Decap CMS 授权</title>
</head>
<body>
<p id="msg">${message}</p>
<script>
(function () {
  var payload = ${payloadJs};
  var message = ${messageJs};
  var status = ${escapeForJs(status)};

  function receiveMessage() {
    // Decap 的握手：父窗口先发 "authorizing:github"，子窗口回发带 token 的消息
    // 收窄 targetOrigin：CMS 与回调页同域，用本页 origin 即可，避免 token 流向任意窗口
    window.opener.postMessage(message, window.location.origin);
    window.removeEventListener('message', receiveMessage, false);
    if (status === 'success') {
      setTimeout(function () { window.close(); }, 500);
    }
  }

  if (window.opener) {
    window.addEventListener('message', receiveMessage, false);
    // 同域回发握手，targetOrigin 收窄到本页 origin
    window.opener.postMessage('authorizing:github', window.location.origin);
  } else {
    document.getElementById('msg').textContent =
      message === '' ? '授权完成，但未找到父窗口，请手动关闭本页。' : message;
  }
})();
</script>
</body>
</html>`;
}

export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const errorParam = url.searchParams.get('error');

  // GitHub 侧拒绝授权
  if (errorParam) {
    const desc = url.searchParams.get('error_description') || errorParam;
    return new Response(renderHtml('error', `error: ${desc}`, `授权失败：${desc}`), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  }

  // 健康检查 / CMS 探测（无 code 时）
  if (!code) {
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
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(
      renderHtml('error', 'error: missing_credentials', '服务端缺少 GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET。'),
      {
        status: 500,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
      },
    );
  }

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
    return new Response(renderHtml('error', `error: ${reason}`, `换取 token 失败：${reason}`), {
      status: 502,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  }

  if (!tokenData.access_token) {
    const reason = tokenData.error_description || tokenData.error || 'unknown_error';
    return new Response(renderHtml('error', `error: ${reason}`, `换取 token 失败：${reason}`), {
      status: 400,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  }

  // Decap 期望的消息格式："authorization:github:success:{\"token\":\"...\"}"
  const tokenPayload = JSON.stringify({ token: tokenData.access_token });
  const cmsMessage = `authorization:github:success:${tokenPayload}`;

  return new Response(renderHtml('success', cmsMessage, '授权成功，正在关闭窗口…'), {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
};
