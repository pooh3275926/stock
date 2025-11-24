import React, { useState, useMemo } from 'react';
import type { Stock, Dividend, Settings } from '../types';
import { SearchInput, SortableHeaderCell, SortConfig } from '../components/common';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';

interface TotalReturnPageProps {
  stocks: Stock[]; // Should pass active stocks
  dividends: Dividend[];
  settings: Settings;
}

type SortDirection = 'asc' | 'desc';

export const TotalReturnPage: React.FC<TotalReturnPageProps> = ({ stocks, dividends, settings }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<any>>({ key: 'symbol', direction: 'asc' });

  // Filter stocks by search term
  const filteredStocks = useMemo(() => {
      return stocks.filter(stock => 
          stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
          stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [stocks, searchTerm]);

  // Calculate Data
  const tableData = useMemo(() => {
    return filteredStocks.map(stock => {
      const financials = calculateStockFinancials(stock);
      
      // Calculate total dividend income for this stock
      const stockDividends = dividends.filter(d => d.stockSymbol === stock.symbol);
      const dividendIncome = stockDividends.reduce((sum, d) => sum + d.amount, 0);
      
      const totalPnL = financials.unrealizedPnl + dividendIncome;
      const returnRate = financials.totalCost > 0 ? (totalPnL / financials.totalCost) * 100 : 0;

      return {
        ...stock,
        ...financials,
        dividendIncome,
        totalPnL,
        returnRate
      };
    });
  }, [filteredStocks, dividends]);

  // Sorting
  const sortedData = useMemo(() => {
    return [...tableData].sort((a, b) => {
      const valA = a[sortConfig.key as keyof typeof a];
      const valB = b[sortConfig.key as keyof typeof b];
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig]);

  const requestSort = (key: keyof any) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold hidden md:block">含息損益 (持有中)</h1>
      
      <div className="flex items-center gap-4">
          <div className="flex-grow">
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="搜尋股票代號或名稱..."/>
          </div>
      </div>

      <div className="hidden md:block bg-light-card dark:bg-dark-card rounded-lg shadow-md">
        <table className="w-full text-left">
          <thead className="bg-light-bg dark:bg-dark-bg">
            <tr>
              <SortableHeaderCell label="代號/名稱" sortKey="symbol" sortConfig={sortConfig} onRequestSort={requestSort}/>
              <th className="px-6 py-4 font-semibold text-right">股數</th>
              <th className="px-6 py-4 font-semibold text-right">平均成本</th>
              <th className="px-6 py-4 font-semibold text-right">總成本</th>
              <th className="px-6 py-4 font-semibold text-right">現價</th>
              <th className="px-6 py-4 font-semibold text-right">市值</th>
              <SortableHeaderCell label="未實現損益" sortKey="unrealizedPnl" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
              <SortableHeaderCell label="股利收入" sortKey="dividendIncome" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
              <SortableHeaderCell label="總損益" sortKey="totalPnL" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
              <SortableHeaderCell label="報酬率" sortKey="returnRate" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
            </tr>
          </thead>
          <tbody>
            {sortedData.map(stock => {
                const pnlColor = stock.totalPnL >= 0 ? 'text-success' : 'text-danger';
                const unrealizedColor = stock.unrealizedPnl >= 0 ? 'text-success' : 'text-danger';

                return (
                    <tr key={stock.symbol} className="border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-light-bg dark:hover:bg-dark-bg">
                        <td className="px-6 py-4"><div className="font-bold">{stock.symbol}</div><div className="text-sm text-light-text/70 dark:text-dark-text/70">{stock.name}</div></td>
                        <td className="px-6 py-4 text-right">{stock.currentShares.toLocaleString()}</td>
                        <td className="px-6 py-4 text-right">{formatCurrency(stock.avgCost, settings.currency, 2)}</td>
                        <td className="px-6 py-4 text-right">{formatCurrency(stock.totalCost, settings.currency)}</td>
                        <td className="px-6 py-4 text-right">{formatCurrency(stock.currentPrice, settings.currency, 2)}</td>
                        <td className="px-6 py-4 text-right">{formatCurrency(stock.marketValue, settings.currency)}</td>
                        <td className={`px-6 py-4 text-right ${unrealizedColor}`}>{formatCurrency(stock.unrealizedPnl, settings.currency)}</td>
                        <td className="px-6 py-4 text-right text-success">{formatCurrency(stock.dividendIncome, settings.currency)}</td>
                        <td className={`px-6 py-4 text-right font-semibold ${pnlColor}`}>{formatCurrency(stock.totalPnL, settings.currency)}</td>
                        <td className={`px-6 py-4 text-right font-semibold ${pnlColor}`}>{stock.returnRate.toFixed(2)}%</td>
                    </tr>
                );
            })}
          </tbody>
        </table>
      </div>

      <div className="md:hidden space-y-4">
        {sortedData.map(stock => {
             const pnlColor = stock.totalPnL >= 0 ? 'text-success' : 'text-danger';
             const unrealizedColor = stock.unrealizedPnl >= 0 ? 'text-success' : 'text-danger';
             
             return (
                <div key={stock.symbol} className="bg-light-card dark:bg-dark-card rounded-lg shadow-md p-5">
                    <div className="flex justify-between items-start mb-3">
                        <div>
                            <div className="font-bold text-lg">{stock.symbol}</div>
                            <div className="text-sm text-light-text/70 dark:text-dark-text/70">{stock.name}</div>
                        </div>
                        <div className={`text-right font-semibold ${pnlColor}`}>
                            <div className="text-xl">{formatCurrency(stock.totalPnL, settings.currency)}</div>
                            <div className="text-base">({stock.returnRate.toFixed(2)}%)</div>
                        </div>
                    </div>
                    <div className="border-t border-light-border dark:border-dark-border my-4"></div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-base">
                        <div><span className="text-light-text/70 dark:text-dark-text/70">市值:</span> {formatCurrency(stock.marketValue, settings.currency)}</div>
                        <div><span className="text-light-text/70 dark:text-dark-text/70">總成本:</span> {formatCurrency(stock.totalCost, settings.currency)}</div>
                        <div><span className="text-light-text/70 dark:text-dark-text/70">股數:</span> {stock.currentShares.toLocaleString()}</div>
                        <div><span className="text-light-text/70 dark:text-dark-text/70">均價:</span> {formatCurrency(stock.avgCost, settings.currency, 2)}</div>
                        <div className={unrealizedColor}><span className="text-light-text/70 dark:text-dark-text/70">未實現:</span> {formatCurrency(stock.unrealizedPnl, settings.currency)}</div>
                        <div className="text-success"><span className="text-light-text/70 dark:text-dark-text/70">股利:</span> {formatCurrency(stock.dividendIncome, settings.currency)}</div>
                    </div>
                </div>
             );
        })}
      </div>
    </div>
  );
};