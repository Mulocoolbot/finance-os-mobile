import { Currency, Transaction } from '../types/finance';

export type ExchangeRates = Record<Currency, number>;

export function convertCurrencyAmount(
  amount: number,
  fromCurrency: Currency,
  toCurrency: Currency,
  exchangeRates: ExchangeRates
) {
  if (fromCurrency === toCurrency) {
    return amount;
  }

  const fromRate = exchangeRates[fromCurrency] || 1;
  const toRate = exchangeRates[toCurrency] || 1;

  const amountInIdr = amount * fromRate;

  return amountInIdr / toRate;
}

export function createExchangeRateSnapshot(exchangeRates: ExchangeRates): ExchangeRates {
  return {
    IDR: exchangeRates.IDR || 1,
    USD: exchangeRates.USD || 1,
    EUR: exchangeRates.EUR || 1,
  };
}

export function getTransactionHistoricalAmountInCurrency(
  transaction: Transaction,
  targetCurrency: Currency,
  fallbackExchangeRates: ExchangeRates
) {
  const transactionCurrency = transaction.currency || targetCurrency;

  if (
    transaction.baseCurrencyAtTransaction &&
    typeof transaction.baseAmountAtTransaction === 'number' &&
    transaction.exchangeRateSnapshot
  ) {
    return convertCurrencyAmount(
      transaction.baseAmountAtTransaction,
      transaction.baseCurrencyAtTransaction,
      targetCurrency,
      transaction.exchangeRateSnapshot
    );
  }

  return convertCurrencyAmount(
    transaction.amount,
    transactionCurrency,
    targetCurrency,
    transaction.exchangeRateSnapshot || fallbackExchangeRates
  );
}
