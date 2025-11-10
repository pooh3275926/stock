import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Stock, HistoricalPrice } from '../types';

interface HistoricalPricesPageProps {
  stocks: Stock[];
  historicalPrices: HistoricalPrice[];
  onSave: React.Dispatch<React.SetStateAction<HistoricalPrice[]>>;
}

export const HistoricalPricesPage: React.FC<HistoricalPricesPageProps> = ({ stocks, historicalPrices, onSave }) => {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('');
  const [prices, setPrices] = useState<{ [key: string]: string }>({});

  const { monthInputs } = useMemo(() => {
    if (!selectedSymbol) return { monthInputs: [] };
    
    const stock = stocks.find(s => s.symbol === selectedSymbol);
    if (!stock || stock.transactions.length === 0) return { monthInputs: [] };

    const dates = stock.transactions.map(t => new Date(t.date));
    const minDate = new Date(Math.min.apply(null, dates as any));
    const maxDate = new Date(); 

    const months: string[] = [];
    let currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

    while (currentDate <= maxDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
        currentDate.setMonth(currentDate.getMonth() + 1);
    }

    return { monthInputs: months.reverse() };
  }, [selectedSymbol, stocks]);

  useEffect(() => {
    if (selectedSymbol) {
        const existingData = historicalPrices.find(hp => hp.stockSymbol === selectedSymbol);
        const initialPrices: { [key: string]: string } = {};
        if (existingData) {
            for (const [key, value] of Object.entries(existingData.prices)) {
                initialPrices[key] = String(value);
            }
        }
        setPrices(initialPrices);
    } else {
        setPrices({});
    }
  }, [selectedSymbol, historicalPrices]);

  const handlePriceChange = useCallback((yearMonth: string, value: string) => {
    setPrices(prev => ({ ...prev, [yearMonth]: value }));
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedSymbol) return;

    const newPrices: { [key: string]: number } = {};
    // FIX: Argument of type 'unknown' is not assignable to parameter of type 'string'.
    // FIX: Property 'trim' does not exist on type 'unknown'.
    // `Object.entries` can return a value of type `unknown`, so we cast it to a string.
    for (const [key, value] of Object.entries(prices)) {
        const stringValue = String(value);
        const numValue = parseFloat(stringValue);
        if (!isNaN(numValue) && stringValue.trim() !== '') {
            newPrices[key] = numValue;
        }
    }
    
    onSave(prev => {
        const existingIndex = prev.findIndex(hp => hp.stockSymbol === selectedSymbol);
        if (existingIndex > -1) {
            const updated = [...prev];
            updated[existingIndex] = { ...updated[existingIndex], prices: newPrices };
            return updated;
        } else {
            return [...prev, { stockSymbol: selectedSymbol, prices: newPrices }];
        }
    });
    alert('歷史股價已儲存！');
  }, [prices, selectedSymbol, onSave]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold hidden md:block">歷史股價</h1>
      
      <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold mb-4">選擇股票</h2>
        <p className="text-sm text-light-text/80 dark:text-dark-text/80 mb-4">
            選擇一檔股票來手動記錄其每個月底的收盤價。這些價格將用於儀表板上的「累積報酬 vs 成本」圖表，以提供更精確的歷史價值分析。
        </p>
        <select 
          value={selectedSymbol} 
          onChange={e => setSelectedSymbol(e.target.value)}
          className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border"
          aria-label="選擇股票"
        >
          <option value="">-- 選擇一檔股票 --</option>
          {stocks.map(s => <option key={s.symbol} value={s.symbol}>{s.symbol} {s.name}</option>)}
        </select>
      </div>

      {selectedSymbol && monthInputs.length > 0 && (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md max-w-2xl mx-auto">
          <h2 className="text-xl font-semibold mb-4">編輯 {selectedSymbol} 月底收盤價</h2>
          <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
            {monthInputs.map(month => (
              <div key={month} className="grid grid-cols-2 items-center gap-4">
                <label htmlFor={`price-${month}`} className="font-medium text-light-text dark:text-dark-text">{month}</label>
                <input
                  id={`price-${month}`}
                  type="number"
                  step="any"
                  placeholder="月底價格"
                  value={prices[month] || ''}
                  onChange={e => handlePriceChange(month, e.target.value)}
                  className="w-full p-2 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border focus:ring-primary focus:border-primary"
                  aria-label={`${month} 價格`}
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSave} 
              className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-2 px-6 rounded-lg transition-colors"
            >
              儲存變更
            </button>
          </div>
        </div>
      )}

      {selectedSymbol && stocks.find(s => s.symbol === selectedSymbol) && monthInputs.length === 0 && (
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md max-w-2xl mx-auto text-center">
            <p className="text-light-text/80 dark:text-dark-text/80">找不到 {selectedSymbol} 的交易紀錄來決定持有期間。請先新增一筆交易。</p>
        </div>
      )}
    </div>
  );
};
