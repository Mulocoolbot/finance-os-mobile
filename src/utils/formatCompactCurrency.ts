import { Currency } from '../types/finance';
import { formatCurrency } from './currency';

function getCurrencyPrefix(currency: Currency) {
  if (currency === 'IDR') {
    return 'Rp ';
  }

  if (currency === 'USD') {
    return '$';
  }

  if (currency === 'EUR') {
    return '€';
  }

  return '';
}

function formatCompactNumber(value: number, currency: Currency) {
  if (currency === 'IDR') {
    return value.toLocaleString('id-ID', {
      maximumFractionDigits: value >= 100 ? 0 : 1,
    });
  }

  return value.toLocaleString('en-US', {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  });
}

function getThousandSuffix(currency: Currency) {
  if (currency === 'IDR') {
    return ' rb';
  }

  return 'K';
}

function getMillionSuffix(currency: Currency) {
  if (currency === 'IDR') {
    return ' jt';
  }

  return 'M';
}

function getBillionSuffix(currency: Currency) {
  if (currency === 'IDR') {
    return ' M';
  }

  return 'B';
}

export function formatCompactCurrency(amount: number, currency: Currency) {
  const sign = amount < 0 ? '-' : '';
  const absoluteAmount = Math.abs(amount);
  const prefix = getCurrencyPrefix(currency);

  if (absoluteAmount >= 1000000000) {
    return `${sign}${prefix}${formatCompactNumber(
      absoluteAmount / 1000000000,
      currency
    )}${getBillionSuffix(currency)}`;
  }

  if (absoluteAmount >= 1000000) {
    return `${sign}${prefix}${formatCompactNumber(
      absoluteAmount / 1000000,
      currency
    )}${getMillionSuffix(currency)}`;
  }

  if (absoluteAmount >= 1000) {
    return `${sign}${prefix}${formatCompactNumber(
      absoluteAmount / 1000,
      currency
    )}${getThousandSuffix(currency)}`;
  }

  return formatCurrency(amount, currency);
}
