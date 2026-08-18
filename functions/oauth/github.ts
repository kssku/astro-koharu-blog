export const onRequest: PagesFunction = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  // 1. 处理无 code 的请求（OAuth 流程第一步，检查代理是否存活）
  if (!code) {
    return new Response(
      JSON.stringify({
        status: 'ok',
        message: 'OAuth proxy is ready',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }

  // 2. 处理有 code 的请求（OAuth 流程第二步，交换 token）
  const clientId = env.GITHUB_CLIENT_ID;
  const clientSecret = env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return new Response(JSON.stringify({ error: 'Missing OAuth credentials' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
    });
  }

  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
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

  const tokenData = await tokenResponse.json();

  if (tokenData.access_token) {
    return new Response(JSON.stringify(tokenData), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } else {
    return new Response(
      JSON.stringify({
        error: tokenData.error_description || 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        },
      },
    );
  }
};
