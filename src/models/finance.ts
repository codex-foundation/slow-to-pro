export interface Category {
  id: string;
  name: string;
  color: string;
}

export type BudgetPeriod = 'daily' | 'monthly' | 'annual';

export interface Budget {
  id: string;
  categoryId: string;
  monthlyLimit: number;
  month: string; // 'YYYY-MM'
}

export interface Expense {
  id: string;
  categoryId: string;
  amount: number;
  note?: string;
  date: number; // Unix ms
}
