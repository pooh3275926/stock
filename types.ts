
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

export interface StockMetadata {
  symbol: string;
  name: string;
  market: string;      // 台股, 美股, 或自行輸入
  type: string;        // 高股息, 成長型, 市值型, 債券, 或自行輸入
  industry: string;    // 台灣50, 傳統產業, S&P500... 或自行輸入
  mode: string;        // 月配, 雙月配, 季配, 半年配, 年配, 不配息
  frequency: number;   // 12, 6, 4, 2, 1, 0
  exDivMonths: number[]; // 1-12
  payMonths: number[];   // 1-12
  defaultYield: number;  // 預設殖利率
}

export interface StockMetadataMap {
  [symbol: string]: StockMetadata;
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

export interface Strategy {
  id: string;
  name: string;
  targetSymbol: string;
  initialAmount: number;
  monthlyAmount: number;
  exDivExtraAmount: number;
  reinvest: boolean;
  expectedAnnualReturn: number;
  expectedDividendYield: number;
  manualActuals?: {
    [year: string]: {
      [month: string]: {
        divInflow: number;
        totalBuy: number;
      }
    }
  };
}

export interface Settings {
  currency: 'TWD' | 'USD';
  transactionFeeRate: number;
  taxRate: number;
  displayMode: 'PERCENTAGE' | 'AMOUNT';
}

export interface HistoricalPrice {
  stockSymbol: string;
  prices: {
    [yearMonth: string]: number;
  };
}

export type Page = 'DASHBOARD' | 'PORTFOLIO' | 'DIVIDENDS' | 'TOTAL_RETURN' | 'STRATEGY' | 'DONATION_FUND' | 'TRANSACTION_HISTORY' | 'HISTORICAL_PRICES' | 'SETTINGS' | 'BUDGET' | 'MORE';
