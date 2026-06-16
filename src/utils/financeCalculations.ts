import {
  Account,
  Currency,
  DashboardSummary,
  Transaction,
} from '../types/finance';

function isSameMonth(dateString: string, now = new Date()) {
  const date = new Date(dateString);

  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth()
  );
}

export function calculateDashboardSummary(
  accounts: Account[],
  transactions: Transaction[],
  currency: Currency = 'IDR'
): DashboardSummary {
  const activeAccounts = accounts.filter((account) => account.isActive);

  const availableBalance = activeAccounts
    .filter(
      (account) =>
        account.type !== 'saving' &&
        account.type !== 'broker' &&
        account.type !== 'crypto_wallet'
    )
    .reduce((total, account) => total + account.balance, 0);

  const totalSavings = activeAccounts
    .filter((account) => account.type === 'saving')
    .reduce((total, account) => total + account.balance, 0);

  const totalInvestment = activeAccounts
    .filter(
      (account) =>
        account.type === 'broker' || account.type === 'crypto_wallet'
    )
    .reduce((total, account) => total + account.balance, 0);

  const monthlyIncome = transactions
    .filter(
      (transaction) =>
        transaction.type === 'income' && isSameMonth(transaction.date)
    )
    .reduce((total, transaction) => total + transaction.amount, 0);

  const monthlyExpense = transactions
    .filter(
      (transaction) =>
        transaction.type === 'expense' && isSameMonth(transaction.date)
    )
    .reduce((total, transaction) => total + transaction.amount, 0);

  const netWorth = activeAccounts.reduce(
    (total, account) => total + account.balance,
    0
  );

  return {
    availableBalance,
    totalSavings,
    totalInvestment,
    monthlyIncome,
    monthlyExpense,
    netWorth,
    currency,
  };
}