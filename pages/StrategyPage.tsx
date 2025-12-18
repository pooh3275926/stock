
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
  stockMetadata: StockMetadataMap;
  onAdd: () => void;
  onEdit: (s: Strategy) => void;
  onDelete: (id: string) => void;
  onSave: (s: Omit<Strategy, 'id'>, id?: string) => void;
  onReorder: (strategies: Strategy[]) => void;
}

export const StrategyPage: React.FC<StrategyPageProps> = ({ strategies, stocks, dividends, settings, stockMetadata, onAdd, onEdit, onSave, onDelete, onReorder }) => {
  
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
      const defaultYield = metadata?.defaultYield !== undefined ? metadata.defaultYield : 5;
      return { id: `auto-${symbol}`, name: `${symbol} 再投入規劃`, targetSymbol: symbol, initialAmount: financials.totalCost, monthlyAmount: 0, exDivExtraAmount: 10000, reinvest: true, expectedAnnualReturn: 8, expectedDividendYield: defaultYield } as Strategy;
    });
  }, [stocks, strategies, dividends, stockMetadata]);

  const handleMove = (index: number, direction: 'up' | 'down') => {
    const newIdx = direction === 'up' ? index - 1 : index + 1;
    if (newIdx < 0 || newIdx >= labStocks.length) return;
    const newLabStocks = [...labStocks];
    const [movedItem] = newLabStocks.splice(index, 1);
    newLabStocks.splice(newIdx, 0, movedItem);
    const updatedStrategies = newLabStocks.map(item => item.id.startsWith('auto-') ? { ...item, id: crypto.randomUUID() } : item);
    onReorder(updatedStrategies);
  };

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div><h1 className="text-2xl font-black flex items-center gap-4"><div className="p-3 bg-primary/10 rounded-2xl"><StrategyIcon className="h-8 w-8 text-primary" /></div>複利加碼實驗室</h1></div>
        <button onClick={onAdd} className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white px-8 py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all transform hover:scale-105 active:scale-95">
            <PlusIcon className="h-6 w-6" /> 新增實驗標的
        </button>
      </div>
      <div className="grid grid-cols-1 gap-14">
        {labStocks.map((strategy, idx) => (
          <StrategyEngineCard key={strategy.id} strategy={strategy} settings={settings} allDividends={dividends} stockMetadata={stockMetadata} stockData={stocks.find(s => s.symbol === strategy.targetSymbol)} onUpdate={(data) => onSave(data, strategy.id.startsWith('auto-') ? undefined : strategy.id)} onDelete={() => onDelete(strategy.id)} onMoveUp={() => handleMove(idx, 'up')} onMoveDown={() => handleMove(idx, 'down')} isFirst={idx === 0} isLast={idx === labStocks.length - 1} />
        ))}
      </div>
    </div>
  );
};

const StrategyEngineCard: React.FC<{ 
    strategy: Strategy; settings: Settings; allDividends: Dividend[]; stockMetadata: StockMetadataMap; stockData?: Stock; onUpdate: (data: Omit<Strategy, 'id'>) => void; onDelete: () => void; onMoveUp: () => void; onMoveDown: () => void; isFirst: boolean; isLast: boolean;
}> = ({ strategy, settings, onUpdate, allDividends, stockMetadata, stockData, onDelete, onMoveUp, onMoveDown, isFirst, isLast }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [historyYear, setHistoryYear] = useState<number>(new Date().getFullYear());
    const [isEditMode, setIsEditMode] = useState(false);
    
    const availableYears = useMemo(() => {
        const years = new Set<number>();
        if (stockData) stockData.transactions.forEach(t => years.add(new Date(t.date).getFullYear()));
        allDividends.filter(d => d.stockSymbol === strategy.targetSymbol).forEach(d => years.add(new Date(d.date).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [stockData, allDividends, strategy.targetSymbol]);

    const monthlyLedger = useMemo(() => {
        return Array.from({ length: 12 }, (_, i) => {
            const m = i + 1, yearStr = historyYear.toString(), monthStr = m.toString();
            const manual = strategy.manualActuals?.[yearStr]?.[monthStr];
            if (manual) {
                const reinvested = Math.min(manual.divInflow, manual.totalBuy), extra = Math.max(0, manual.totalBuy - manual.divInflow);
                return { m, divInflow: manual.divInflow, totalBuy: manual.totalBuy, reinvested, extra, isManual: true };
            }
            if (!stockData) return { m, divInflow: 0, totalBuy: 0, reinvested: 0, extra: 0, isManual: false };
            const monthDivs = allDividends.filter(d => d.stockSymbol === strategy.targetSymbol && new Date(d.date).getFullYear() === historyYear && new Date(d.date).getMonth() + 1 === m);
            const monthTxs = stockData.transactions.filter(t => t.type === 'BUY' && new Date(t.date).getFullYear() === historyYear && new Date(t.date).getMonth() + 1 === m);
            const divInflow = monthDivs.reduce((sum, d) => sum + d.amount, 0), totalBuy = monthTxs.reduce((sum, t) => sum + (t.shares * t.price + t.fees), 0);
            return { m, divInflow, totalBuy, reinvested: Math.min(divInflow, totalBuy), extra: Math.max(0, totalBuy - divInflow), isManual: false };
        });
    }, [stockData, allDividends, strategy, historyYear]);

    const actualYearStats = useMemo(() => {
        const totalDiv = monthlyLedger.reduce((sum, m) => sum + m.divInflow, 0);
        const financials = stockData ? calculateStockFinancials(stockData) : null;
        const totalHoldingCost = financials?.totalCost || 0;
        const totalCumulativeDiv = allDividends.filter(d => d.stockSymbol === strategy.targetSymbol).reduce((sum, d) => sum + d.amount, 0);
        return { totalDiv, totalHoldingCost, totalCumulativeDiv, cumulativeReturn: (totalHoldingCost > 0 ? (totalCumulativeDiv / totalHoldingCost) * 100 : 0) };
    }, [monthlyLedger, stockData, allDividends, strategy.targetSymbol]);

    const sim = useMemo(() => {
        const years = 20, chartData = [], meta = stockMetadata[strategy.targetSymbol], freq = meta?.frequency || 4;
        let balance = strategy.initialAmount, totalInvested = strategy.initialAmount;
        const monthlyGrowth = Math.pow(1 + strategy.expectedAnnualReturn / 100, 1 / 12) - 1, divRatePerFreq = (strategy.expectedDividendYield / 100) / freq;
        for (let y = 1; y <= years; y++) {
            for (let m = 1; m <= 12; m++) {
                balance = (balance + strategy.monthlyAmount) * (1 + monthlyGrowth); totalInvested += strategy.monthlyAmount;
                if (meta?.exDivMonths.includes(m)) { balance += strategy.exDivExtraAmount; totalInvested += strategy.exDivExtraAmount; const div = balance * divRatePerFreq; if (strategy.reinvest) balance += div; }
            }
            chartData.push({ year: new Date().getFullYear() + y, estimated: Math.round(balance), totalInvested: Math.round(totalInvested) });
        }
        return { chartData, final: balance };
    }, [strategy, stockMetadata]);

    return (
        <div className={`bg-dark-card rounded-[3rem] shadow-2xl border border-dark-border overflow-hidden transition-all duration-500 ${isExpanded ? 'ring-8 ring-primary/10' : ''}`}>
            <div className="p-10 pb-6 flex flex-col md:flex-row justify-between items-start gap-8">
                <div className="flex items-center gap-8">
                    <div className="px-10 h-20 bg-gradient-to-br from-primary to-primary-hover rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shrink-0 min-w-[10rem]">
                        {strategy.targetSymbol}
                    </div>
                    <div>
                        <h3 className="text-3xl font-black tracking-tight">{stockMetadata[strategy.targetSymbol]?.name || strategy.targetSymbol}</h3>
                        <div className="flex gap-3 mt-4">
                            <span className="px-4 py-1.5 bg-success/20 text-success text-lg font-black rounded-xl border border-success/30 uppercase tracking-widest">Active Stake</span>
                            <span className="px-4 py-1.5 bg-primary/20 text-primary text-lg font-black rounded-xl border border-primary/30 uppercase tracking-widest">Engine</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button onClick={onMoveUp} disabled={isFirst} className="p-4 rounded-2xl bg-dark-bg border border-dark-border hover:text-primary transition-all disabled:opacity-20 shadow-sm"><ChevronUpIcon className="h-8 w-8" /></button>
                    <button onClick={onMoveDown} disabled={isLast} className="p-4 rounded-2xl bg-dark-bg border border-dark-border hover:text-primary transition-all disabled:opacity-20 shadow-sm"><ChevronDownIcon className="h-8 w-8" /></button>
                    <button onClick={onDelete} className="p-4 rounded-2xl bg-danger/10 text-danger border border-danger/30 hover:bg-danger hover:text-white transition-all ml-2 shadow-sm"><TrashIcon className="h-8 w-8" /></button>
                </div>
            </div>

            <div className="px-10 pb-10">
                <div className="flex justify-between items-center mb-8 bg-dark-bg/40 p-6 rounded-[2.5rem] border border-dark-border">
                    <div className="flex items-center gap-4"><div className="p-4 bg-primary/20 rounded-2xl"><HistoryIcon className="h-8 w-8 text-primary" /></div><h4 className="text-xl font-black uppercase tracking-widest">實戰對照帳本</h4></div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => setIsEditMode(!isEditMode)} className={`px-6 py-3 rounded-2xl text-lg font-black flex items-center gap-3 transition-all ${isEditMode ? 'bg-success text-white shadow-lg shadow-success/20' : 'bg-primary/10 text-primary border border-primary/20'}`}>
                            {isEditMode ? <><CloseIcon className="h-5 w-5"/> 結束</> : <><EditIcon className="h-5 w-5"/> 修正</>}
                        </button>
                        <select value={historyYear} onChange={(e) => setHistoryYear(parseInt(e.target.value))} className="bg-dark-card border border-primary/30 rounded-2xl px-8 py-3 text-lg font-black focus:ring-4 focus:ring-primary/10 outline-none">
                            {availableYears.length > 0 ? availableYears.map(y => <option key={y} value={y}>{y} 年度</option>) : <option>{new Date().getFullYear()} 年度</option>}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-6">
                    {monthlyLedger.map((month) => (
                        <div key={month.m} className={`p-6 rounded-[2.5rem] border-2 transition-all relative ${month.totalBuy > 0 || month.divInflow > 0 ? 'bg-primary/10 border-primary/30 shadow-xl' : 'bg-dark-bg/20 border-transparent opacity-70'}`}>
                            <div className="text-lg font-black mb-4 border-b border-primary/10 pb-3 flex justify-between"><span>{month.m} 月</span>{month.isManual && <span className="text-xs text-danger font-black">MANUAL</span>}</div>
                            <div className="space-y-5">
                                <div className="space-y-2">
                                    <span className="text-lg text-dark-text/60 font-black block uppercase tracking-tight">領息流入</span>
                                    {isEditMode ? <input type="number" value={month.divInflow || ''} onChange={(e) => { const upd = { ...(strategy.manualActuals || {}) }; if (!upd[historyYear]) upd[historyYear] = {}; upd[historyYear][month.m] = { ...upd[historyYear][month.m], divInflow: parseFloat(e.target.value) || 0 }; onUpdate({ ...strategy, manualActuals: upd }); }} className="w-full bg-dark-bg border border-primary/30 rounded-xl p-3 text-lg font-black outline-none focus:border-primary" /> : <span className="text-primary font-black text-xl">{month.divInflow > 0 ? `+${formatCurrency(month.divInflow, settings.currency)}` : '-'}</span>}
                                </div>
                                <div className="space-y-2">
                                    <span className="text-lg text-dark-text/60 font-black block uppercase tracking-tight">總買入</span>
                                    {isEditMode ? <input type="number" value={month.totalBuy || ''} onChange={(e) => { const upd = { ...(strategy.manualActuals || {}) }; if (!upd[historyYear]) upd[historyYear] = {}; upd[historyYear][month.m] = { ...upd[historyYear][month.m], totalBuy: parseFloat(e.target.value) || 0 }; onUpdate({ ...strategy, manualActuals: upd }); }} className="w-full bg-dark-bg border border-primary/30 rounded-xl p-3 text-lg font-black outline-none focus:border-primary" /> : <span className="font-black text-xl">{month.totalBuy > 0 ? formatCurrency(month.totalBuy, settings.currency) : '-'}</span>}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-8 p-10 bg-success/5 rounded-[3.5rem] border-2 border-success/30">
                    <div><p className="text-lg text-success/60 font-black mb-3 uppercase tracking-widest">年度實際領息</p><p className="text-3xl font-black text-success">{formatCurrency(actualYearStats.totalDiv, settings.currency)}</p></div>
                    <div><p className="text-lg text-success/60 font-black mb-3 uppercase tracking-widest">累計領息</p><p className="text-3xl font-black text-success">{formatCurrency(actualYearStats.totalCumulativeDiv, settings.currency)}</p></div>
                    <div><p className="text-lg text-success/60 font-black mb-3 uppercase tracking-widest">持有總成本</p><p className="text-3xl font-black text-success">{formatCurrency(actualYearStats.totalHoldingCost, settings.currency)}</p></div>
                    <div><p className="text-lg text-success/60 font-black mb-3 uppercase tracking-widest">累計報酬率</p><p className="text-3xl font-black text-success">{actualYearStats.cumulativeReturn.toFixed(2)}%</p></div>
                </div>
            </div>

            <div className="px-10 py-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 bg-dark-bg/30 border-y-2 border-dark-border">
                <div className="space-y-6"><label className="text-lg font-black flex justify-between uppercase tracking-wider"><span>每月定額</span><span className="text-primary">{formatCurrency(strategy.monthlyAmount, settings.currency)}</span></label><input type="range" min="0" max="100000" step="1000" value={strategy.monthlyAmount} onChange={(e) => onUpdate({...strategy, monthlyAmount: parseInt(e.target.value)})} className="w-full accent-primary h-3 rounded-xl" /></div>
                <div className="space-y-6"><label className="text-lg font-black flex justify-between uppercase tracking-wider"><span>除息月加碼</span><span className="text-success">{formatCurrency(strategy.exDivExtraAmount, settings.currency)}</span></label><input type="range" min="0" max="200000" step="5000" value={strategy.exDivExtraAmount} onChange={(e) => onUpdate({...strategy, exDivExtraAmount: parseInt(e.target.value)})} className="w-full accent-success h-3 rounded-xl" /></div>
                <div className="space-y-6"><label className="text-lg font-black uppercase tracking-wider block">預期殖利率 (%)</label><input type="number" step="0.1" value={strategy.expectedDividendYield} onChange={(e) => onUpdate({...strategy, expectedDividendYield: parseFloat(e.target.value)})} className="w-full p-5 bg-dark-card rounded-[1.5rem] border-2 border-primary/20 text-center font-black focus:border-primary outline-none text-2xl" /></div>
                <div className="flex items-center gap-6 pt-6"><input type="checkbox" id={`reinvest-${strategy.id}`} checked={strategy.reinvest} onChange={(e) => onUpdate({...strategy, reinvest: e.target.checked})} className="w-10 h-10 accent-primary rounded-2xl cursor-pointer" /><label htmlFor={`reinvest-${strategy.id}`} className="text-xl font-black cursor-pointer select-none">領息自動再投入</label></div>
            </div>

            <div className="bg-dark-card">
                <button onClick={() => setIsExpanded(!isExpanded)} className="w-full py-10 flex items-center justify-center gap-5 text-lg font-black text-dark-text/40 hover:text-primary transition-all uppercase tracking-[0.5em]">{isExpanded ? '隱藏成長分析' : '展開 20 年成長預測圖'}<ChevronDownIcon className={`h-8 w-8 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} /></button>
                <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}><div className="p-10 pt-0"><div className="h-[500px] w-full bg-dark-bg/20 rounded-[3.5rem] p-10 border-2 border-primary/10"><CompoundInterestChart data={sim.chartData} labelEstimated="預期資產價值 (含複利)" labelActual="預期累計總本金" /></div></div></div>
            </div>
        </div>
    );
};
