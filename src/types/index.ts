export type TransactionType = 'income' | 'expense';

export interface Category {
  id: string;
  name: string;
  icon: string;
  color: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export interface MonthlyStats {
  month: string;
  income: number;
  expense: number;
}

export interface CategoryStats {
  category: string;
  amount: number;
  percentage: number;
  color: string;
}
