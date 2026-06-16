import type { ExchangeRateProviderMode } from '../stores/useFinanceStore';

export const EMBEDDED_EXCHANGE_RATE_CONFIG = {
  /**
   * Isi API key Alpha Vantage kamu di sini.
   *
   * Contoh:
   * alphaVantageApiKey: 'ABC123XYZ',
   *
   * Jangan upload file ini ke repo public kalau API key asli sudah diisi.
   */
  alphaVantageApiKey: '7R8L26FV8ZX3LC2N',

  /**
   * Provider default:
   * - 'alpha_vantage_realtime' = realtime provider dengan API key.
   * - 'open' = no-key provider, lebih lambat/reference rate.
   */
  defaultProviderMode: 'alpha_vantage_realtime' as ExchangeRateProviderMode,

  /**
   * Force refresh saat app dibuka / balik foreground.
   * true = langsung fetch rate terbaru tanpa perlu tap Refresh.
   */
  forceRefreshOnAppOpen: true,

  /**
   * Polling saat app aktif.
   *
   * Alpha Vantage free tier is request-limited. Since one full update uses
   * 2 requests (USD/IDR + EUR/IDR), 60 seconds will hit the free limit fast.
   *
   * Safe default for free key:
   * 2 * 60 * 60_000 = 2 hours
   *
   * If you upgrade to a premium or streaming provider, you can lower this.
   */
  realtimeRefreshIntervalMs: 2 * 60 * 60_000,

  /**
   * Soft guard for Alpha Vantage free tier.
   * A full update uses 2 requests, so 12 full refreshes ~= 24 requests.
   */
  dailyRequestLimit: 25,
  requestsPerFullRefresh: 2,

  /**
   * Open provider interval.
   * Dipakai kalau provider mode diganti ke open.
   */
  openProviderRefreshIntervalMs: 15 * 60_000,
};
