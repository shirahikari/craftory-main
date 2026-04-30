/* ════════════════════════════════════════════════════
   CRAFTORY — Environment Config v2.0
   ⚠️  Không commit file này lên git nếu có API key thật
   ════════════════════════════════════════════════════ */
window.ENV = {
  /*
   * AI Provider: ShopAIKey (https://shopaikey.com)
   * Tương thích hoàn toàn với định dạng OpenAI API.
   * Chỉ cần đổi endpoint → https://api.shopaikey.com/v1
   * Hỗ trợ: OpenAI, Claude, Gemini và 500+ models.
   *
   * Mua key tại: https://shopaikey.com
   * Backup endpoint: https://api-v2.shopaikey.com/v1
   */
  AI_MODEL:    'gpt-4.1-mini',
  AI_ENDPOINT: 'https://api.shopaikey.com/v1/chat/completions',
  AI_API_KEY:  'sk-UA1fvujI30z4xoRaRmrIIfJ6p0mwO6mw6o31ubntkSco3kUH',                // ← Điền API key từ shopaikey.com vào đây

  /* Backup endpoint nếu bị block */
  AI_ENDPOINT_BACKUP: 'https://api-v2.shopaikey.com/v1/chat/completions',

  /* Backend proxy (khuyến nghị cho production) */
  BACKEND_URL: 'http://localhost:3000',
  USE_BACKEND: false,

  /* App */
  APP_NAME:    'Craftory',
  APP_VERSION: '5.2',
  APP_ENV:     'development',
};
