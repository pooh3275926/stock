import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Stock, HistoricalPrice } from '../types';
import { ChevronDownIcon, ChevronUpIcon } from '../components/Icons';
import { calculateStockFinancials } from '../utils/calculations';

// Helper to determine the months a stock was held
const getMonthInputsForStock = (stock: Stock): string[] => {
    if (!stock || stock.transactions.length === 0) return [];
    
    const sortedTransactions = [...stock.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const minDate = new Date(sortedTransactions[0].date);
    
    const { currentShares } = calculateStockFinancials(stock);
    let maxDate: Date;

    if (currentShares > 0) {
        maxDate = new Date(); // Still holding, go up to current month
    } else {
        const lastTxDate = new Date(sortedTransactions[sortedTransactions.length - 1].date);
        // Per user request, input until the month *before* the final sell-off.
        // new Date(2025, 0) is Jan 2025. getMonth() is 0. 0 - 1 = -1.
        // new Date(2025, -1, 1) correctly resolves to Dec 1, 2024.
        maxDate = new Date(lastTxDate.getFullYear(), lastTxDate.getMonth() - 1, 1);
    }

    const months: string[] = [];
    let currentDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);

    while (currentDate <= maxDate) {
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        months.push(`${year}-${month}`);
        currentDate.setMonth(currentDate.getMonth() + 1);
    }
    
    return months.reverse(); // Show most recent months first
};

// --- Child Component for editing a single stock's prices ---
interface StockPriceEditorProps {
    stock: Stock;
    prices: { [key: string]: string };
    onPriceChange: (yearMonth: string, value: string) => void;
}

const StockPriceEditor: React.FC<StockPriceEditorProps> = ({ stock, prices, onPriceChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const monthInputs = useMemo(() => getMonthInputsForStock(stock), [stock]);
    
    if (monthInputs.length === 0) {
        return null;
    }

    return (
        <div className="bg-light-bg dark:bg-dark-bg rounded-lg">
            <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full flex justify-between items-center p-4 font-semibold text-lg text-left"
                aria-expanded={isExpanded}
                aria-controls={`collapsible-content-${stock.symbol}`}
            >
                <span>{stock.symbol} {stock.name}</span>
                {isExpanded ? <ChevronUpIcon className="h-6 w-6"/> : <ChevronDownIcon className="h-6 w-6"/>}
            </button>
            {isExpanded && (
                <div id={`collapsible-content-${stock.symbol}`} className="p-4 border-t border-light-border dark:border-dark-border">
                    <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                        {monthInputs.map(month => (
                          <div key={month} className="grid grid-cols-2 items-center gap-4">
                            <label htmlFor={`price-${stock.symbol}-${month}`} className="font-medium text-light-text dark:text-dark-text">{month}</label>
                            <input
                              id={`price-${stock.symbol}-${month}`}
                              type="number"
                              step="any"
                              placeholder="月底價格"
                              value={prices[month] || ''}
                              onChange={e => onPriceChange(month, e.target.value)}
                              className="w-full p-2 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border focus:ring-primary focus:border-primary"
                              aria-label={`${stock.symbol} ${month} 價格`}
                            />
                          </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// --- Main Page Component ---
export const HistoricalPricesPage: React.FC<{
  stocks: Stock[];
  historicalPrices: HistoricalPrice[];
  onSave: React.Dispatch<React.SetStateAction<HistoricalPrice[]>>;
  onOpenUpdateAllPricesModal: () => void;
}> = ({ stocks, historicalPrices, onSave, onOpenUpdateAllPricesModal }) => {
  
  const [allPrices, setAllPrices] = useState<{ [symbol: string]: { [yearMonth: string]: string } }>({});

  useEffect(() => {
    const initialPrices: typeof allPrices = {};
    historicalPrices.forEach(hp => {
        initialPrices[hp.stockSymbol] = {};
        for (const [key, value] of Object.entries(hp.prices)) {
            initialPrices[hp.stockSymbol][key] = String(value);
        }
    });
    setAllPrices(initialPrices);
  }, [historicalPrices]);

  const handlePriceChange = useCallback((symbol: string, yearMonth: string, value: string) => {
    setAllPrices(prev => ({
        ...prev,
        [symbol]: {
            ...(prev[symbol] || {}),
            [yearMonth]: value
        }
    }));
  }, []);
  
  const handleSave = useCallback(() => {
    const updatedHistoricalPrices: HistoricalPrice[] = [];
    
    // Convert the local state object back into the array format required by the parent
    for (const symbol in allPrices) {
        const pricesForSymbol = allPrices[symbol];
        const newPrices: { [key: string]: number } = {};
        
        for (const [key, value] of Object.entries(pricesForSymbol)) {
            const stringValue = String(value);
            const numValue = parseFloat(stringValue);
            if (!isNaN(numValue) && stringValue.trim() !== '') {
                newPrices[key] = numValue;
            }
        }
        
        if (Object.keys(newPrices).length > 0) {
            updatedHistoricalPrices.push({ stockSymbol: symbol, prices: newPrices });
        }
    }
    
    onSave(updatedHistoricalPrices);
    alert('所有歷史股價已儲存！');
  }, [allPrices, onSave]);
  
  const relevantStocks = useMemo(() => {
      return stocks.filter(s => s.transactions.length > 0);
  }, [stocks]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold hidden md:block">歷史股價</h1>
      
      <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md max-w-2xl mx-auto">
        <p className="text-light-text/80 dark:text-dark-text/80 mb-4">
            在此手動記錄您持有股票期間，每個月底的收盤價。這些價格將用於儀表板上的「累積報酬 vs 成本」圖表，以提供更精確的歷史價值分析。
        </p>
        <div className="space-y-4">
            {relevantStocks.length > 0 ? (
                relevantStocks.map(stock => (
                    <StockPriceEditor
                        key={stock.symbol}
                        stock={stock}
                        prices={allPrices[stock.symbol] || {}}
                        onPriceChange={(yearMonth, value) => handlePriceChange(stock.symbol, yearMonth, value)}
                    />
                ))
            ) : (
                <p className="text-center text-light-text/70 dark:text-dark-text/70 py-4">
                    您目前沒有任何持股紀錄。
                </p>
            )}
        </div>
        
        {relevantStocks.length > 0 && (
             <div className="mt-6 flex justify-end gap-4">
                <button 
                  onClick={onOpenUpdateAllPricesModal}
                  className="bg-primary/80 hover:bg-primary text-primary-foreground font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  一鍵更新股價
                </button>
                <button 
                  onClick={handleSave} 
                  className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-2 px-6 rounded-lg transition-colors"
                >
                  儲存所有變更
                </button>
              </div>
        )}
      </div>
    </div>
  );
};
