
import React, { useMemo, useState } from 'react';
import type { Stock, Dividend, Settings, Strategy, Transaction } from '../types';
import { CompoundInterestChart } from '../components/PortfolioCharts';
import { StrategyIcon, ArrowUpIcon, HistoryIcon, TrashIcon, PlusIcon, ChevronUpIcon, ChevronDownIcon } from '../components/Icons';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';
import { stockDefinitions, stockDividendCalendar, stockDividendFrequency, stockDefaultYields } from '../utils/data';

interface StrategyPageProps {
  strategies: Strategy[];
  stocks: Stock[];
  dividends: Dividend[];
  settings: Settings;
  theme: 'light' | 'dark';
  onAdd: () => void;
  onEdit: (s: Strategy) => void;
  onDelete: (id: string) => void;
  onSave: (s: Omit<Strategy, 'id'>, id?: string) => void;
  onReorder: (strategies: Strategy[]) => void;
}

export const StrategyPage: React.FC<StrategyPageProps> = ({ strategies, stocks, dividends, settings, theme, onAdd, onEdit, onSave, onDelete, onReorder }) => {
  
  // 自動與手動合併，並根據現有排序持久化
  const labStocks = useMemo(() => {
    // 1. 取得所有高股息標的
    const autoTargetStocks = stocks.filter(s => {
      const isHighDividend = stockDefinitions[s.symbol]?.type === '高股息';
      return calculateStockFinancials(s).currentShares > 0 && isHighDividend;
    });

    // 2. 建立一個包含所有應顯示標的的 ID 清單
    const allSymbols = Array.from(new Set([
      ...strategies.map(s => s.targetSymbol),
      ...autoTargetStocks.map(s => s.symbol)
    ]));

    // 3. 根據 strategies 的順序來排序，其餘放後面
    const symbolOrder = strategies.map(s => s.targetSymbol);
    const sortedSymbols = allSymbols.sort((a, b) => {
      const idxA = symbolOrder.indexOf(a);
      const idxB = symbolOrder.indexOf(b);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    // 4. 對應回策略對象
    return sortedSymbols.map(symbol => {
      const existing = strategies.find(s => s.targetSymbol === symbol);
      if (existing) return existing;

      // 如果是自動偵測但尚未存成策略的
      const stock = stocks.find(s => s.symbol === symbol)!;
      const financials = calculateStockFinancials(stock);
      const stockDivs = dividends.filter(d => d.stockSymbol === symbol);
      const latestYield = financials.totalCost > 0 ? (stockDivs.reduce((sum, d) => sum + d.amount, 0) / financials.totalCost) * 100 : 5;
      const defaultYield = stockDefaultYields[symbol] || Math.max(5, latestYield);

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
  }, [stocks, strategies, dividends]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= labStocks.length) return;

    const newLabStocks = [...labStocks];
    const [movedItem] = newLabStocks.splice(index, 1);
    newLabStocks.splice(newIdx, 0, movedItem);

    // 將所有項目轉為正式 Strategy 儲存
    const updatedStrategies = newLabStocks.map(item => {
      if (item.id.startsWith('auto-')) {
        return { ...item, id: crypto.randomUUID() };
      }
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
          <p className="text-light-text/70 dark:text-dark-text/90 mt-1 font-medium">
            除息再投入規劃中心：規劃與對照年度實際成果
          </p>
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
    stockData?: Stock;
    onUpdate: (data: Omit<Strategy, 'id'>) => void;
    onDelete: () => void;
    onMoveUp: () => void;
    onMoveDown: () => void;
    isFirst: boolean;
    isLast: boolean;
}> = ({ strategy, settings, theme, onUpdate, allDividends, stockData, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
    
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        if (stockData) stockData.transactions.forEach(t => years.add(new Date(t.date).getFullYear()));
        allDividends.filter(d => d.stockSymbol === strategy.targetSymbol).forEach(d => years.add(new Date(d.date).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [stockData, allDividends, strategy.targetSymbol]);

    const monthlyLedger = useMemo(() => {
        if (!stockData) return Array(12).fill(null);
        return Array.from({ length: 12 }, (_, i) => {
            const m = i + 1;
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
            return { m, divInflow, totalBuy, reinvested, extra };
        });
    }, [stockData, allDividends, strategy.targetSymbol, historyYear]);

    const actualYearStats = useMemo(() => {
        if (!monthlyLedger) return null;
        const totalDiv = monthlyLedger.reduce((sum, m) => sum + (m?.divInflow || 0), 0);
        const totalInvested = monthlyLedger.reduce((sum, m) => sum + (m?.totalBuy || 0), 0);
        const reinvestedAmount = monthlyLedger.reduce((sum, m) => sum + (m?.reinvested || 0), 0);
        const extraCapital = monthlyLedger.reduce((sum, m) => sum + (m?.extra || 0), 0);
        const financials = stockData ? calculateStockFinancials(stockData) : null;
        const annualReturn = financials ? financials.unrealizedPnlPercent : 0;
        return { totalDiv, totalInvested, reinvestedAmount, extraCapital, annualReturn };
    }, [monthlyLedger, stockData]);

    const sim = useMemo(() => {
        const years = 20;
        const chartData = [];
        const calendar = stockDividendCalendar[strategy.targetSymbol];
        const freq = stockDividendFrequency[strategy.targetSymbol] || 4;
        let balance = strategy.initialAmount;
        let totalInvested = strategy.initialAmount;
        const monthlyGrowth = Math.pow(1 + strategy.expectedAnnualReturn / 100, 1 / 12) - 1;
        const divRatePerFreq = (strategy.expectedDividendYield / 100) / freq;

        for (let y = 1; y <= years; y++) {
            for (let m = 1; m <= 12; m++) {
                balance += strategy.monthlyAmount;
                totalInvested += strategy.monthlyAmount;
                balance *= (1 + monthlyGrowth);
                if (calendar?.exDivMonths.includes(m)) {
                    balance += strategy.exDivExtraAmount;
                    totalInvested += strategy.exDivExtraAmount;
                }
                if (calendar?.payMonths.includes(m)) {
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
    }, [strategy]);

    const metadata = stockDefinitions[strategy.targetSymbol];

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

            {/* 年度實戰 12 月份格點 - 強烈對比版本 */}
            <div className="px-8 pb-8">
                <div className="flex justify-between items-center mb-6 bg-light-bg/50 dark:bg-dark-bg/40 p-5 rounded-[2rem] border border-light-border dark:border-dark-border">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/20 rounded-xl">
                            <HistoryIcon className="h-6 w-6 text-primary" />
                        </div>
                        <h4 className="text-base font-black dark:text-dark-text uppercase tracking-widest">年度實戰對照帳本</h4>
                    </div>
                    <select 
                        value={historyYear} 
                        onChange={(e) => setHistoryYear(parseInt(e.target.value))}
                        className="bg-light-card dark:bg-dark-card border-2 border-primary/30 rounded-2xl px-6 py-2 text-sm font-black dark:text-dark-text focus:ring-4 focus:ring-primary/20 outline-none transition-all"
                    >
                        {availableYears.length > 0 ? availableYears.map(y => <option key={y} value={y}>{y} 年度</option>) : <option>{new Date().getFullYear()} 年度</option>}
                    </select>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5">
                    {monthlyLedger.map((month) => (
                        <div key={month.m} className={`p-5 rounded-[2rem] border-2 transition-all ${month.totalBuy > 0 ? 'bg-primary/10 border-primary/40 shadow-xl shadow-primary/5 scale-105' : 'bg-light-bg/30 dark:bg-dark-bg/20 border-transparent opacity-80'}`}>
                            <div className="text-xs font-black dark:text-dark-text mb-3 border-b border-primary/10 pb-2">{month.m} 月</div>
                            <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-light-text/60 dark:text-dark-text/80">領息:</span>
                                    <span className="text-primary font-black">{month.divInflow > 0 ? `+${formatCurrency(month.divInflow, settings.currency)}` : '-'}</span>
                                </div>
                                <div className="flex justify-between text-[11px] font-bold">
                                    <span className="text-light-text/60 dark:text-dark-text/80">買入:</span>
                                    <span className="dark:text-dark-text font-black">{month.totalBuy > 0 ? formatCurrency(month.totalBuy, settings.currency) : '-'}</span>
                                </div>
                                <div className="pt-2 mt-2 border-t border-primary/20">
                                    <div className="flex justify-between text-[10px] font-black">
                                        <span className="text-success/80 dark:text-success">再投:</span>
                                        <span className="text-success font-black">{formatCurrency(month.reinvested, settings.currency)}</span>
                                    </div>
                                    <div className="flex justify-between text-[10px] font-black">
                                        <span className="text-success/80 dark:text-success">加碼:</span>
                                        <span className="text-success font-black">{formatCurrency(month.extra, settings.currency)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {actualYearStats && (
                    <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-8 p-8 bg-success/10 dark:bg-success/5 rounded-[2.5rem] border-2 border-success/30">
                        <div>
                            <p className="text-xs text-success font-black mb-2 uppercase tracking-widest">年度實際領息</p>
                            <p className="text-2xl font-black text-success">{formatCurrency(actualYearStats.totalDiv, settings.currency)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-success font-black mb-2 uppercase tracking-widest">年度股息再投入</p>
                            <p className="text-2xl font-black text-success">{formatCurrency(actualYearStats.reinvestedAmount, settings.currency)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-success font-black mb-2 uppercase tracking-widest">年度本金加碼</p>
                            <p className="text-2xl font-black text-success">{formatCurrency(actualYearStats.extraCapital, settings.currency)}</p>
                        </div>
                        <div>
                            <p className="text-xs text-success font-black mb-2 uppercase tracking-widest">年度報酬率</p>
                            <p className="text-2xl font-black text-success">{actualYearStats.annualReturn.toFixed(2)}%</p>
                        </div>
                    </div>
                )}
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
