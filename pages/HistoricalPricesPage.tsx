
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Stock, HistoricalPrice, StockMetadataMap } from '../types';
import { ChevronDownIcon, ChevronUpIcon } from '../components/Icons';
import { calculateStockFinancials } from '../utils/calculations';
import { StockTags } from '../components/common';

const getMonthInputsForStock = (stock: Stock): string[] => {
    if (!stock || stock.transactions.length === 0) return [];
    const sortedTransactions = [...stock.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const minDate = new Date(sortedTransactions[0].date);
    const { currentShares } = calculateStockFinancials(stock);
    let maxDate = currentShares > 0 ? new Date() : new Date(new Date(sortedTransactions[sortedTransactions.length - 1].date).getFullYear(), new Date(sortedTransactions[sortedTransactions.length - 1].date).getMonth() - 1, 1);
    const months: string[] = [];
    let currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    while (currentDate <= maxDate) {
        months.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    return months.reverse();
};

export const HistoricalPricesPage: React.FC<any> = ({ stocks, historicalPrices, stockMetadata, onSave, onOpenUpdateAllPricesModal }) => {
  const [allPrices, setAllPrices] = useState<{ [symbol: string]: { [yearMonth: string]: string } }>({});
  useEffect(() => {
    const initialPrices: any = {};
    historicalPrices.forEach((hp: any) => { initialPrices[hp.stockSymbol] = {}; for (const [key, value] of Object.entries(hp.prices)) { initialPrices[hp.stockSymbol][key] = String(value); } });
    setAllPrices(initialPrices);
  }, [historicalPrices]);

  const handlePriceChange = useCallback((symbol: string, yearMonth: string, value: string) => { setAllPrices(prev => ({ ...prev, [symbol]: { ...(prev[symbol] || {}), [yearMonth]: value } })); }, []);
  const handleSaveAll = useCallback(() => {
    const updated: HistoricalPrice[] = [];
    for (const symbol in allPrices) {
        // FIX: Cast p to ensure it's treated as a string-keyed dictionary of strings for Object.entries iteration
        const p = allPrices[symbol] as { [yearMonth: string]: string }, newP: any = {};
        if (p) {
            (Object.entries(p) as [string, string][]).forEach(([k, v]) => {
                const num = parseFloat(v);
                if (!isNaN(num)) newP[k] = num;
            });
        }
        if (Object.keys(newP).length > 0) updated.push({ stockSymbol: symbol, prices: newP });
    }
    onSave(updated); alert('歷史股價已更新！');
  }, [allPrices, onSave]);

  const relevantStocks = useMemo(() => stocks.filter((s: any) => s.transactions.length > 0).sort((a: any, b: any) => { const aHeld = calculateStockFinancials(a).currentShares > 0, bHeld = calculateStockFinancials(b).currentShares > 0; if (aHeld !== bHeld) return aHeld ? -1 : 1; return a.symbol.localeCompare(b.symbol, undefined, { numeric: true }); }), [stocks]);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div><h1 className="text-2xl font-black tracking-tight uppercase">月底歷史股價補錄</h1><p className="text-lg opacity-40 font-bold mt-1 tracking-widest uppercase">Historical Market Data</p></div>
          <div className="flex gap-4">
              <button onClick={onOpenUpdateAllPricesModal} className="bg-dark-card border border-dark-border px-8 py-4 rounded-2xl font-black text-lg hover:text-primary transition-all shadow-lg">批量更新現價</button>
              <button onClick={handleSaveAll} className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 transition-all">儲存所有數據</button>
          </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {relevantStocks.map((stock: any) => (
              <div key={stock.symbol} className="bg-dark-card p-8 rounded-[2rem] border border-dark-border shadow-xl">
                  <div className="flex justify-between items-start mb-6 pb-4 border-b border-dark-border">
                      <div><h3 className="text-2xl font-black">{stock.symbol} {stock.name}</h3><StockTags symbol={stock.symbol} stockMetadata={stockMetadata} /></div>
                      <span className={`px-4 py-1 rounded-full text-xs font-black ${calculateStockFinancials(stock).currentShares > 0 ? 'bg-success/20 text-success' : 'bg-dark-bg text-dark-text/40'}`}>{calculateStockFinancials(stock).currentShares > 0 ? '持有中' : '已結清'}</span>
                  </div>
                  <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                      {getMonthInputsForStock(stock).map(month => (
                          <div key={month} className="flex items-center justify-between text-lg font-bold">
                              <span className="opacity-60">{month}</span>
                              <input type="number" step="any" value={allPrices[stock.symbol]?.[month] || ''} onChange={e => handlePriceChange(stock.symbol, month, e.target.value)} className="w-32 p-3 bg-dark-bg border border-dark-border rounded-xl text-right font-black focus:border-primary outline-none" placeholder="0.00" />
                          </div>
                      ))}
                  </div>
              </div>
          ))}
      </div>
    </div>
  );
};
