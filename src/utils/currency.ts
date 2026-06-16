import { Currency } from '../types/finance';

export function formatCurrency(amount: number, currency: Currency = 'IDR') {
  return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: currency === 'IDR' ? 0 : 2,
  }).format(amount);
}