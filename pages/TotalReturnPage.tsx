
import React, { useState, useMemo } from 'react';
import type { Stock, Dividend, Settings, StockMetadataMap } from '../types';
import { SearchInput, SortableHeaderCell, SortConfig, StockTags } from '../components/common';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';

interface TotalReturnPageProps {
  stocks: Stock[];
  dividends: Dividend[];
  settings: Settings;
  stockMetadata: StockMetadataMap;
}

export const TotalReturnPage: React.FC<TotalReturnPageProps> = ({ stocks, dividends, settings, stockMetadata }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig<any>>({ key: 'symbol', direction: 'asc' });

  const filteredStocks = useMemo(() => {
      return stocks.filter(stock => 
          stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
          stock.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [stocks, searchTerm]);

  const tableData = useMemo(() => {
    return filteredStocks.map(stock => {
      const financials = calculateStockFinancials(stock);
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
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">帳戶含息損益分析</h1>
            <p className="text-lg opacity-30 font-black mt-1 tracking-[0.2em] uppercase">Total Performance Review</p>
          </div>
      </div>
      
      <div className="p-2">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="搜尋股票代號或名稱..."/>
      </div>

      <div className="bg-dark-card rounded-[2rem] shadow-xl border border-dark-border overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left text-lg">
              <thead className="bg-dark-bg/50 opacity-40 uppercase tracking-widest font-black">
                <tr>
                  <SortableHeaderCell label="代號/名稱" sortKey="symbol" sortConfig={sortConfig} onRequestSort={requestSort}/>
                  <th className="px-6 py-5 font-black text-right">股數</th>
                  <th className="px-6 py-5 font-black text-right">總成本</th>
                  <th className="px-6 py-5 font-black text-right">市值</th>
                  <SortableHeaderCell label="未實現損益" sortKey="unrealizedPnl" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
                  <SortableHeaderCell label="累計股利" sortKey="dividendIncome" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
                  <SortableHeaderCell label="含息總損益" sortKey="totalPnL" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
                  <SortableHeaderCell label="報酬率" sortKey="returnRate" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border/40 font-bold">
                {sortedData.map(stock => {
                    const pnlColor = stock.totalPnL >= 0 ? 'text-success' : 'text-danger';
                    const unrealizedColor = stock.unrealizedPnl >= 0 ? 'text-success' : 'text-danger';

                    return (
                        <tr key={stock.symbol} className="hover:bg-primary/5 transition-colors">
                            <td className="px-6 py-5">
                                <div className="font-black text-xl">{stock.symbol}</div>
                                <div className="text-lg text-dark-text/40">{stock.name}</div>
                                <div className="mt-2"><StockTags symbol={stock.symbol} stockMetadata={stockMetadata} /></div>
                            </td>
                            <td className="px-6 py-5 text-right">{stock.currentShares.toLocaleString()}</td>
                            <td className="px-6 py-5 text-right opacity-60">{formatCurrency(stock.totalCost, settings.currency)}</td>
                            <td className="px-6 py-5 text-right font-black">{formatCurrency(stock.marketValue, settings.currency)}</td>
                            <td className={`px-6 py-5 text-right ${unrealizedColor}`}>{formatCurrency(stock.unrealizedPnl, settings.currency)}</td>
                            <td className="px-6 py-5 text-right text-success">{formatCurrency(stock.dividendIncome, settings.currency)}</td>
                            <td className={`px-6 py-5 text-right font-black ${pnlColor}`}>{formatCurrency(stock.totalPnL, settings.currency)}</td>
                            <td className={`px-6 py-5 text-right font-black ${pnlColor} text-xl`}>{stock.returnRate.toFixed(2)}%</td>
                        </tr>
                    );
                })}
              </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};
