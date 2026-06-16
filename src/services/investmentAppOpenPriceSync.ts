import {
  fetchInvestmentPriceForHolding,
  isPriceSyncSupportedHolding,
} from './investmentPriceSync';
import {
  addInvestmentPriceSyncHistory,
  InvestmentPriceSyncHistoryDetail,
} from './investmentPriceSyncHistory';
import { useFinanceStore } from '../stores/useFinanceStore';

let isAppOpenInvestmentPriceSyncRunning = false;
let lastAppOpenSyncStartedAt: string | null = null;

export type AppOpenInvestmentPriceSyncResult = {
  successCount: number;
  failedCount: number;
  skippedCount: number;
  summary: string;
  startedAt: string;
  completedAt: string;
};

export function getLastAppOpenInvestmentPriceSyncStartedAt() {
  return lastAppOpenSyncStartedAt;
}

export async function runInvestmentPriceSyncOnAppOpen(
  reason: 'startup' | 'foreground' = 'startup'
): Promise<AppOpenInvestmentPriceSyncResult | null> {
  if (isAppOpenInvestmentPriceSyncRunning) {
    return null;
  }

  isAppOpenInvestmentPriceSyncRunning = true;
  lastAppOpenSyncStartedAt = new Date().toISOString();

  try {
    const state = useFinanceStore.getState();
    const investmentHoldings = state.investmentHoldings;
    const exchangeRates = state.exchangeRates;
    const updateInvestmentHoldingPrice = state.updateInvestmentHoldingPrice;

    const supportedHoldings = investmentHoldings.filter(isPriceSyncSupportedHolding);
    const skippedHoldings = investmentHoldings.filter(
      (holding) => !isPriceSyncSupportedHolding(holding)
    );

    if (supportedHoldings.length === 0) {
      return {
        successCount: 0,
        failedCount: 0,
        skippedCount: skippedHoldings.length,
        summary: 'No supported investment holdings to update on app open.',
        startedAt: lastAppOpenSyncStartedAt,
        completedAt: new Date().toISOString(),
      };
    }

    let successCount = 0;
    let failedCount = 0;
    const providers = new Set<string>();
    const syncDetails: InvestmentPriceSyncHistoryDetail[] = skippedHoldings.map(
      (holding) => ({
        holdingId: holding.id,
        symbol: holding.symbol,
        name: holding.name,
        assetType: holding.assetType,
        currency: holding.currency,
        status: 'skipped',
        oldPrice: holding.currentPrice,
        newPrice: holding.currentPrice,
        message: 'This asset type is not supported by app-open price sync yet.',
      })
    );

    for (const holding of supportedHoldings) {
      const oldPrice = holding.currentPrice;

      try {
        const result = await fetchInvestmentPriceForHolding(holding, exchangeRates);
        const updateResult = updateInvestmentHoldingPrice({
          holdingId: holding.id,
          currentPrice: result.currentPrice,
          source: 'sync',
          provider: result.provider,
          recordedAt: result.sourceUpdatedAt,
        });

        if (updateResult.success) {
          successCount += 1;
          providers.add(result.provider);

          syncDetails.push({
            holdingId: holding.id,
            symbol: holding.symbol,
            name: holding.name,
            assetType: holding.assetType,
            currency: holding.currency,
            status: 'success',
            oldPrice,
            newPrice: result.currentPrice,
            provider: result.provider,
            sourceUpdatedAt: result.sourceUpdatedAt,
            message:
              reason === 'startup'
                ? 'Price updated automatically when app opened.'
                : 'Price updated automatically when app returned to foreground.',
          });
        } else {
          failedCount += 1;

          syncDetails.push({
            holdingId: holding.id,
            symbol: holding.symbol,
            name: holding.name,
            assetType: holding.assetType,
            currency: holding.currency,
            status: 'failed',
            oldPrice,
            newPrice: oldPrice,
            message: updateResult.message,
          });
        }
      } catch (error) {
        failedCount += 1;

        syncDetails.push({
          holdingId: holding.id,
          symbol: holding.symbol,
          name: holding.name,
          assetType: holding.assetType,
          currency: holding.currency,
          status: 'failed',
          oldPrice,
          newPrice: oldPrice,
          message:
            error instanceof Error
              ? error.message
              : 'Provider failed. Last/manual price is kept.',
        });
      }
    }

    const skippedCount = skippedHoldings.length;
    const providerText =
      providers.size > 0 ? Array.from(providers).join(', ') : 'no provider';
    const summary =
      failedCount === 0
        ? `App-open sync updated ${successCount}/${supportedHoldings.length} prices via ${providerText}.`
        : `App-open sync updated ${successCount}/${supportedHoldings.length} prices. ${failedCount} kept last/manual price.`;

    await addInvestmentPriceSyncHistory({
      summary,
      totalCount: investmentHoldings.length,
      successCount,
      failedCount,
      skippedCount,
      providers: Array.from(providers),
      details: syncDetails,
    });

    return {
      successCount,
      failedCount,
      skippedCount,
      summary,
      startedAt: lastAppOpenSyncStartedAt,
      completedAt: new Date().toISOString(),
    };
  } finally {
    isAppOpenInvestmentPriceSyncRunning = false;
  }
}
