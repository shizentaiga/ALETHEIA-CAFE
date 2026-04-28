/**
 * Google OAuth2.0 認証ユーティリティ
 * 複雑な通信ロジックをカプセル化し、呼び出し側をシンプルに保ちます。
 */
export const googleAuth = {
  /**
   * 1. ユーザーをGoogleのログイン画面へ飛ばすためのURLを生成します。
   * * @param clientId - Google Cloud Consoleから取得したクライアントID
   * @param redirectUri - ログイン後に戻ってくる先のURL（コールバックURL）
   */
  getAuthUrl: (clientId: string, redirectUri: string) => {
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',             // 認可コードを受け取る設定
      scope: 'openid email profile',      // 取得したい情報の範囲（プロフィールとメール）
      prompt: 'select_account',           // 常にアカウント選択画面を表示
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  /**
   * 2. Googleから届いた「認可コード」を使い、実際の「ユーザー情報」を取得します。
   * (認可コードをトークンに交換し、そのトークンで情報を取得する2段階の処理)
   */
  exchangeCodeForUser: async (
    code: string, 
    clientId: string, 
    clientSecret: string, 
    redirectUri: string
  ) => {
    // ステップA: 認可コードをアクセストークンと交換する
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code, 
        client_id: clientId, 
        client_secret: clientSecret,
        redirect_uri: redirectUri, 
        grant_type: 'authorization_code',
      }),
    });
    
    const tokens = await tokenRes.json() as any;
    if (!tokenRes.ok) {
      throw new Error(`Token Exchange Failed: ${JSON.stringify(tokens)}`);
    }

    // ステップB: アクセストークンを使用して、Googleからユーザー情報を取得する
    const userRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: { 
        Authorization: `Bearer ${tokens.access_token}` // 取得したトークンをヘッダーにセット
      },
    });

    if (!userRes.ok) {
      throw new Error('Failed to fetch User Info');
    }

    // sub(一意識別ID), email, name を含むオブジェクトを返す
    return await userRes.json() as { sub: string; email: string; name?: string };
  }
};