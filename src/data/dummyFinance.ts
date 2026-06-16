import { Account, DashboardSummary, Transaction } from '../types/finance';

export const dashboardSummary: DashboardSummary = {
  availableBalance: 1500000,
  totalSavings: 500000,
  totalInvestment: 1200000,
  monthlyIncome: 3500000,
  monthlyExpense: 1750000,
  netWorth: 3200000,
  currency: 'IDR',
};

export const dummyAccounts: Account[] = [
  {
    id: 'acc-1',
    name: 'BCA',
    type: 'bank',
    currency: 'IDR',
    balance: 1000000,
    isActive: true,
  },
  {
    id: 'acc-2',
    name: 'DANA',
    type: 'e_wallet',
    currency: 'IDR',
    balance: 500000,
    isActive: true,
  },
  {
    id: 'acc-3',
    name: 'Saving Laptop',
    type: 'saving',
    currency: 'IDR',
    balance: 500000,
    isActive: true,
  },
];

export const dummyTransactions: Transaction[] = [
  {
    id: 'trx-1',
    type: 'income',
    title: 'Side Job',
    amount: 750000,
    currency: 'IDR',
    accountName: 'BCA',
    categoryName: 'Income',
    date: '2026-06-11',
  },
  {
    id: 'trx-2',
    type: 'expense',
    title: 'Coffee',
    amount: 25000,
    currency: 'IDR',
    accountName: 'DANA',
    categoryName: 'Food & Drink',
    date: '2026-06-11',
  },
  {
    id: 'trx-3',
    type: 'saving_deposit',
    title: 'Top Up Saving Laptop',
    amount: 300000,
    currency: 'IDR',
    accountName: 'Saving Laptop',
    categoryName: 'Saving',
    date: '2026-06-10',
  },
];