
import React, { useMemo, useState } from 'react';
import type { Stock, Dividend, Settings, Strategy, Transaction, StockMetadataMap } from '../types';
import { CompoundInterestChart } from '../components/PortfolioCharts';
import { StrategyIcon, HistoryIcon, TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon, EditIcon, CloseIcon } from '../components/Icons';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';

interface StrategyPageProps {
  strategies: Strategy[];
  stocks: Stock[];
  dividends: Dividend[];
  settings: Settings;
  theme: 'light' | 'dark';
  stockMetadata: StockMetadataMap;
  onAdd: () => void;
  onEdit: (s: Strategy) => void;
  onDelete: (id: string) => void;
  onSave: (s: Omit<Strategy, 'id'>, id?: string) => void;
  onReorder: (strategies: Strategy[]) => void;
}

export const StrategyPage: React.FC<StrategyPageProps> = ({ strategies, stocks, dividends, settings, theme, stockMetadata, onAdd, onEdit, onSave, onDelete, onReorder }) => {
  
  const labStocks = useMemo(() => {
    const autoTargetStocks = stocks.filter(s => {
      const isHighDividend = stockMetadata[s.symbol]?.type === '高股息';
      return calculateStockFinancials(s).currentShares > 0 && isHighDividend;
    });

    const allSymbols = Array.from(new Set([
      ...strategies.map(s => s.targetSymbol),
      ...autoTargetStocks.map(s => s.symbol)
    ]));

    const symbolOrder = strategies.map(s => s.targetSymbol);
    const sortedSymbols = allSymbols.sort((a, b) => {
      const idxA = symbolOrder.indexOf(a);
      const idxB = symbolOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    return sortedSymbols.map(symbol => {
      const existing = strategies.find(s => s.targetSymbol === symbol);
      if (existing) return existing;

      const stock = stocks.find(s => s.symbol === symbol)!;
      const financials = calculateStockFinancials(stock);
      const metadata = stockMetadata[symbol];
      
      // 優先從標的資料庫抓取 defaultYield，若無則 fallback 到系統計算或預設 5%
      const defaultYield = metadata?.defaultYield !== undefined ? metadata.defaultYield : 5;

      return {
        id: `auto-${symbol}`,
        name: `${symbol} 再投入規劃`,
        targetSymbol: symbol,
        initialAmount: financials.totalCost,
        monthlyAmount: 0,
        exDivExtraAmount: 10000,
        reinvest: true,
        expectedAnnualReturn: 8,
        expectedDividendYield: defaultYield,
      } as Strategy;
    });
  }, [stocks, strategies, dividends, stockMetadata]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= labStocks.length) return;
    const newLabStocks = [...labStocks];
    const [movedItem] = newLabStocks.splice(index, 1);
    newLabStocks.splice(newIdx, 0, movedItem);
    const updatedStrategies = newLabStocks.map(item => {
      if (item.id.startsWith('auto-')) return { ...item, id: crypto.randomUUID() };
      return item;
    });
    onReorder(updatedStrategies);
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black flex items-center gap-3 dark:text-dark-text">
            <div className="p-2 bg-primary/10 rounded-2xl">
               <StrategyIcon className="h-8 w-8 text-primary" />
            </div>
            複利加碼實驗室
          </h1>
        </div>
        <button onClick={onAdd} className="bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-[1.5rem] font-black flex items-center gap-3 shadow-xl shadow-primary/20 transition-all transform hover:scale-105 active:scale-95">
          <PlusIcon className="h-6 w-6" /> 新增實驗標的
        </button>
      </div>

      <div className="grid grid-cols-1 gap-12">
        {labStocks.map((strategy, idx) => (
          <StrategyEngineCard 
            key={strategy.id} 
            strategy={strategy} 
            settings={settings} 
            theme={theme}
            allDividends={dividends}
            stockMetadata={stockMetadata}
            stockData={stocks.find(s => s.symbol === strategy.targetSymbol)}
            onUpdate={(data) => onSave(data, strategy.id.startsWith('auto-') ? undefined : strategy.id)}
            onDelete={() => onDelete(strategy.id)}
            onMoveUp={() => handleMove(idx, 'up')}
            onMoveDown={() => handleMove(idx, 'down')}
            isFirst={idx === 0}
            isLast={idx === labStocks.length - 1}
          />
        ))}
      </div>
    </div>
  );
};

const StrategyEngineCard: React.FC<{ 
    strategy: Strategy; 
    settings: Settings; 
    theme: 'light' | 'dark';
    allDividends: Dividend[];
    stockMetadata: StockMetadataMap;
    stockData?: Stock;
    onUpdate: (data: Omit<Strategy, 'id'>) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ strategy, settings, theme, onUpdate, allDividends, stockMetadata, stockData, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
    const [isEditMode, setIsEditMode] = useState(false);
    
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        if (stockData) stockData.transactions.forEach(t => years.add(new Date(t.date).getFullYear()));
        allDividends.filter(d => d.stockSymbol === strategy.targetSymbol).forEach(d => years.add(new Date(d.date).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [stockData, allDividends, strategy.targetSymbol]);

    // 月度實戰帳本計算 (支援手動覆蓋)
    const monthlyLedger = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
            const yearStr = historyYear.toString();
            const monthStr = m.toString();
            
            // 優先檢查是否有手動輸入數據
            const manual = strategy.manualActuals?.[yearStr]?.[monthStr];

            if (manual) {
                const divInflow = manual.divInflow;
                const totalBuy = manual.totalBuy;
                const reinvested = Math.min(divInflow, totalBuy);
                const extra = Math.max(0, totalBuy - divInflow);
                return { m, divInflow, totalBuy, reinvested, extra, isManual: true };
            }

            // 無手動數據則從系統抓取
            if (!stockData) return { m, divInflow: 0, totalBuy: 0, reinvested: 0, extra: 0, isManual: false };

            const monthDivs = allDividends.filter(d => 
                d.stockSymbol === strategy.targetSymbol && 
                new Date(d.date).getFullYear() === historyYear &&
                new Date(d.date).getMonth() + 1 === m
            );
            const monthTxs = stockData.transactions.filter(t => 
                t.type === 'BUY' && 
                new Date(t.date).getFullYear() === historyYear &&
                new Date(t.date).getMonth() + 1 === m
            );
            const divInflow = monthDivs.reduce((sum, d) => sum + d.amount, 0);
            const totalBuy = monthTxs.reduce((sum, t) => sum + (t.shares * t.price + t.fees), 0);
            const reinvested = Math.min(divInflow, totalBuy);
            const extra = Math.max(0, totalBuy - divInflow);

            return { m, divInflow, totalBuy, reinvested, extra, isManual: false };
        });
    }, [stockData, allDividends, strategy, historyYear]);

    // 實戰統計計算
    const actualYearStats = useMemo(() => {
        const totalDiv = monthlyLedger.reduce((sum, m) => sum + m.divInflow, 0);
        const reinvestedAmount = monthlyLedger.reduce((sum, m) => sum + m.reinvested, 0);
        const extraCapital = monthlyLedger.reduce((sum, m) => sum + m.extra, 0);
        
        // 年度報酬率 = 年度領息 / (再投 + 額外)
        const totalInputThisYear = reinvestedAmount + extraCapital;
        const annualReturn = totalInputThisYear > 0 ? (totalDiv / totalInputThisYear) * 100 : 0;

        // 累計統計 (抓取所有年份)
        const financials = stockData ? calculateStockFinancials(stockData) : null;
        const totalHoldingCost = financials?.totalCost || 0;
        const totalCumulativeDiv = allDividends
            .filter(d => d.stockSymbol === strategy.targetSymbol)
            .reduce((sum, d) => sum + d.amount, 0);
        const cumulativeReturn = totalHoldingCost > 0 ? (totalCumulativeDiv / totalHoldingCost) * 100 : 0;

        return { totalDiv, reinvestedAmount, extraCapital, annualReturn, cumulativeReturn, totalHoldingCost, totalCumulativeDiv };
    }, [monthlyLedger, stockData, allDividends, strategy.targetSymbol]);

    const handleManualChange = (month: number, field: 'divInflow' | 'totalBuy', value: string) => {
        const num = parseFloat(value) || 0;
        const updatedManualActuals = { ...(strategy.manualActuals || {}) };
        const yearStr = historyYear.toString();
        const monthStr = month.toString();

        if (!updatedManualActuals[yearStr]) updatedManualActuals[yearStr] = {};
        if (!updatedManualActuals[yearStr][monthStr]) {
            // 如果原本沒手動數據，先抓目前的系統值作為初始
            const current = monthlyLedger.find(ml => ml.m === month)!;
            updatedManualActuals[yearStr][monthStr] = { divInflow: current.divInflow, totalBuy: current.totalBuy };
        }

        updatedManualActuals[yearStr][monthStr][field] = num;
        onUpdate({ ...strategy, manualActuals: updatedManualActuals });
    };

    const resetManual = (month: number) => {
        if (!strategy.manualActuals?.[historyYear]?.[month]) return;
        const updatedManualActuals = { ...strategy.manualActuals };
        delete updatedManualActuals[historyYear][month.toString()];
        if (Object.keys(updatedManualActuals[historyYear]).length === 0) delete updatedManualActuals[historyYear];
        onUpdate({ ...strategy, manualActuals: updatedManualActuals });
    };

    const sim = useMemo(() => {
        const years = 20;
        const chartData = [];
        const meta = stockMetadata[strategy.targetSymbol];
        const freq = meta?.frequency || 4;
        let balance = strategy.initialAmount;
        let totalInvested = strategy.initialAmount;
        const monthlyGrowth = Math.pow(1 + strategy.expectedAnnualReturn / 100, 1 / 12) - 1;
        const divRatePerFreq = (strategy.expectedDividendYield / 100) / freq;

        for (let y = 1; y <= years; y++) {
            for (let m = 1; m <= 12; m++) {
                balance += strategy.monthlyAmount;
                totalInvested += strategy.monthlyAmount;
                balance *= (1 + monthlyGrowth);
                if (meta?.exDivMonths.includes(m)) {
                    balance += strategy.exDivExtraAmount;
                    totalInvested += strategy.exDivExtraAmount;
                }
                if (meta?.exDivMonths.includes(m)) {
                    const div = balance * divRatePerFreq;
                    if (strategy.reinvest) balance += div;
                }
            }
            chartData.push({
                year: new Date().getFullYear() + y,
                estimated: Math.round(balance),
                totalInvested: Math.round(totalInvested)
            });
        }
        return { chartData, final: balance };
    }, [strategy, stockMetadata]);

    const metadata = stockMetadata[strategy.targetSymbol];

    return (
        <div className={`bg-light-card dark:bg-dark-card rounded-[3rem] shadow-2xl border border-light-border dark:border-dark-border overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-4 ring-primary/20' : ''}`}>
            
            {/* Header: Title & Management */}
            <div className="p-8 pb-4 flex flex-col md:flex-row justify-between items-start gap-6">
                <div className="flex items-center gap-6">
                    <div className="px-6 h-16 bg-gradient-to-br from-primary to-primary-hover rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-primary/30 shrink-0 min-w-[7.5rem]">
                        {strategy.targetSymbol}
                    </div>
                    <div>
                        <h3 className="text-3xl font-black dark:text-dark-text tracking-tight">{metadata?.name || strategy.targetSymbol}</h3>
                        <div className="flex gap-2 mt-2">
                            <span className="px-3 py-1 bg-success/20 text-success text-[10px] font-black rounded-full border border-success/30 uppercase tracking-widest">Active Stake</span>
                            <span className="px-3 py-1 bg-primary/20 text-primary text-[10px] font-black rounded-full border border-primary/30 uppercase tracking-widest">Strategy Engine</span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button onClick={onMoveUp} disabled={isFirst} className="p-3 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border dark:text-dark-text hover:text-primary transition-all disabled:opacity-20 shadow-sm">
                        <ChevronUpIcon className="h-6 w-6" />
                    </button>
                    <button onClick={onMoveDown} disabled={isLast} className="p-3 rounded-2xl bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border dark:text-dark-text hover:text-primary transition-all disabled:opacity-20 shadow-sm">
                        <ChevronDownIcon className="h-6 w-6" />
                    </button>
                    <button onClick={onDelete} className="p-3 rounded-2xl bg-danger/10 text-danger border border-danger/30 hover:bg-danger hover:text-white transition-all ml-2 shadow-sm">
                        <TrashIcon className="h-6 w-6" />
                    </button>
                </div>
            </div>

            {/* 年度實戰 12 月份格點 */}
            <div className="px-8 pb-8">
                <div className="flex justify-between items-center mb-6 bg-light-bg/50 dark:bg-dark-bg/40 p-5 rounded-[2.5rem] border border-light-border dark:border-dark-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-xl">
                            <HistoryIcon className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="text-base font-black dark:text-dark-text uppercase tracking-widest">年度實戰對照帳本</h4>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={() => setIsEditMode(!isEditMode)} 
                            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-2 transition-all ${isEditMode ? 'bg-success text-white' : 'bg-primary/10 text-primary border border-primary/20'}`}
                        >
                            {isEditMode ? <><CloseIcon className="h-4 w-4"/> 結束編輯</> : <><EditIcon className="h-4 w-4"/> 手動修正數據</>}
                        </button>
                        <select 
                            value={historyYear} 
                            onChange={(e) => setHistoryYear(parseInt(e.target.value))}
                            className="bg-light-card dark:bg-dark-card border-2 border-primary/30 rounded-2xl px-6 py-2 text-sm font-black dark:text-dark-text focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                        >
                            {availableYears.length > 0 ? availableYears.map(y => <option key={y} value={y}>{y} 年度</option>) : <option>{new Date().getFullYear()} 年度</option>}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                    {monthlyLedger.map((month) => (
                        <div key={month.m} className={`p-5 rounded-[2rem] border-2 transition-all relative ${month.totalBuy > 0 || month.divInflow > 0 ? 'bg-primary/10 border-primary/40 shadow-xl shadow-primary/5 scale-105' : 'bg-light-bg/30 dark:bg-dark-bg/20 border-transparent opacity-80'}`}>
                            {month.isManual && (
                                <button onClick={() => resetManual(month.m)} className="absolute -top-2 -right-2 bg-danger text-white p-1 rounded-full shadow-lg" title="重設為系統抓取">
                                    <CloseIcon className="h-3 w-3" />
                                </button>
                            )}
                            <div className="text-xs font-black dark:text-dark-text mb-3 border-b border-primary/10 pb-2 flex justify-between">
                                <span>{month.m} 月</span>
                                {month.isManual && <span className="text-[8px] text-danger">MANUAL</span>}
                            </div>
                            <div className="space-y-3">
                                <div className="space-y-1">
                                    <span className="text-[10px] text-light-text/60 dark:text-dark-text/80 font-black block uppercase">領息流入</span>
                                    {isEditMode ? (
                                        <input 
                                            type="number" value={month.divInflow || ''} 
                                            onChange={(e) => handleManualChange(month.m, 'divInflow', e.target.value)}
                                            className="w-full bg-white dark:bg-dark-bg border border-primary/30 rounded-lg p-1 text-xs font-black dark:text-dark-text"
                                        />
                                    ) : (
                                        <span className="text-primary font-black text-sm">{month.divInflow > 0 ? `+${formatCurrency(month.divInflow, settings.currency)}` : '-'}</span>
                                    )}
                                </div>
                                <div className="space-y-1">
                                    <span className="text-[10px] text-light-text/60 dark:text-dark-text/80 font-black block uppercase">總買入</span>
                                    {isEditMode ? (
                                        <input 
                                            type="number" value={month.totalBuy || ''} 
                                            onChange={(e) => handleManualChange(month.m, 'totalBuy', e.target.value)}
                                            className="w-full bg-white dark:bg-dark-bg border border-primary/30 rounded-lg p-1 text-xs font-black dark:text-dark-text"
                                        />
                                    ) : (
                                        <span className="dark:text-dark-text font-black text-sm">{month.totalBuy > 0 ? formatCurrency(month.totalBuy, settings.currency) : '-'}</span>
                                    )}
                                </div>
                                {!isEditMode && (
                                    <div className="pt-2 mt-2 border-t border-primary/20">
                                        <div className="flex justify-between text-[10px] font-black">
                                            <span className="text-success/80 dark:text-success">股利再投:</span>
                                            <span className="text-success font-black">{formatCurrency(month.reinvested, settings.currency)}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black">
                                            <span className="text-success/80 dark:text-success">額外加碼:</span>
                                            <span className="text-success font-black">{formatCurrency(month.extra, settings.currency)}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* 實戰績效統計 */}
                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-success/10 dark:bg-success/5 rounded-[3rem] border-2 border-success/30">
                    <div>
                        <p className="text-xs text-success font-black mb-2 uppercase tracking-widest">年度實際領息</p>
                        <p className="text-2xl font-black text-success">{formatCurrency(actualYearStats.totalDiv, settings.currency)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-success font-black mb-2 uppercase tracking-widest">累計領息</p>
                        <p className="text-2xl font-black text-success">{formatCurrency(actualYearStats.totalCumulativeDiv, settings.currency)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-success font-black mb-2 uppercase tracking-widest">持有總成本</p>
                        <p className="text-2xl font-black text-success">{formatCurrency(actualYearStats.totalHoldingCost, settings.currency)}</p>
                    </div>
                    <div>
                        <p className="text-xs text-success font-black mb-2 uppercase tracking-widest">累計報酬率</p>
                        <p className="text-2xl font-black text-success">{actualYearStats.cumulativeReturn.toFixed(2)}%</p>
                    </div>
                </div>
            </div>

            {/* Controls */}
            <div className="px-8 pb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 bg-light-bg/40 dark:bg-dark-bg/30 py-10 border-y-2 border-light-border dark:border-dark-border">
                <div className="space-y-4">
                    <label className="text-xs font-black flex justify-between uppercase tracking-wider dark:text-dark-text">
                        <span>預計每月定額</span>
                        <span className="text-primary font-black">{formatCurrency(strategy.monthlyAmount, settings.currency)}</span>
                    </label>
                    <input type="range" min="0" max="100000" step="1000" value={strategy.monthlyAmount} onChange={(e) => onUpdate({...strategy, monthlyAmount: parseInt(e.target.value)})} className="w-full accent-primary h-2 rounded-lg" />
                </div>
                <div className="space-y-4">
                    <label className="text-xs font-black flex justify-between uppercase tracking-wider dark:text-dark-text">
                        <span>預計除息月加碼</span>
                        <span className="text-success font-black">{formatCurrency(strategy.exDivExtraAmount, settings.currency)}</span>
                    </label>
                    <input type="range" min="0" max="200000" step="5000" value={strategy.exDivExtraAmount} onChange={(e) => onUpdate({...strategy, exDivExtraAmount: parseInt(e.target.value)})} className="w-full accent-success h-2 rounded-lg" />
                </div>
                <div className="space-y-4">
                    <label className="text-xs font-black uppercase tracking-wider dark:text-dark-text">預期殖利率 (%)</label>
                    <input type="number" step="0.1" value={strategy.expectedDividendYield} onChange={(e) => onUpdate({...strategy, expectedDividendYield: parseFloat(e.target.value)})} className="w-full p-4 bg-light-card dark:bg-dark-card rounded-[1.2rem] border-2 border-primary/20 text-center font-black dark:text-dark-text focus:border-primary outline-none text-lg" />
                </div>
                <div className="flex items-center gap-5 pt-5">
                    <input type="checkbox" id={`reinvest-${strategy.id}`} checked={strategy.reinvest} onChange={(e) => onUpdate({...strategy, reinvest: e.target.checked})} className="w-8 h-8 accent-primary rounded-xl cursor-pointer" />
                    <label htmlFor={`reinvest-${strategy.id}`} className="text-base font-black cursor-pointer select-none dark:text-dark-text">領息自動再投入</label>
                </div>
            </div>

            {/* Forecast Chart */}
            <div className="bg-light-card dark:bg-dark-card">
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full py-8 flex items-center justify-center gap-4 text-sm font-black text-light-text/60 dark:text-dark-text hover:text-primary dark:hover:text-primary transition-all uppercase tracking-[0.4em]"
                >
                    {isExpanded ? '隱藏 20 年詳細分析' : '展開 20 年成長預測圖'}
                    <ChevronDownIcon className={`h-6 w-6 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} />
                </button>
                
                <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="p-10 pt-0">
                        <div className="h-[400px] w-full bg-light-bg/5 dark:bg-dark-bg/20 rounded-[3rem] p-8 border-2 border-primary/10">
                            <CompoundInterestChart data={sim.chartData} theme={theme} labelEstimated="預期資產價值 (含複利)" labelActual="預期累計總本金" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

