
export interface Transaction {
  id: string;
  type: 'BUY' | 'SELL';
  shares: number;
  price: number;
  date: string;
  fees: number;
}

export interface Dividend {
  id:string;
  stockSymbol: string;
  amount: number;
  date: string;
  sharesHeld?: number;
  dividendPerShare?: number;
}

export interface Stock {
  symbol: string;
  name: string;
  transactions: Transaction[];
  currentPrice: number;
}

export interface Donation {
  id: string;
  amount: number;
  date: string;
  description: string;
}

export interface BudgetEntry {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  date: string;
  description: string;
}

export interface Portfolio {
  stocks: Stock[];
  dividends: Dividend[];
}

export interface Settings {
  currency: 'TWD' | 'USD';
  transactionFeeRate: number;
  taxRate: number;
  displayMode: 'PERCENTAGE' | 'AMOUNT';
  tejApiKey: string;
}

export interface HistoricalPrice {
  stockSymbol: string;
  prices: {
    [yearMonth: string]: number; // Format: "YYYY-MM"
  };
}

export type Page = 'DASHBOARD' | 'PORTFOLIO' | 'DIVIDENDS' | 'DONATION_FUND' | 'TRANSACTION_HISTORY' | 'HISTORICAL_PRICES' | 'SETTINGS' | 'BUDGET' | 'MORE';
