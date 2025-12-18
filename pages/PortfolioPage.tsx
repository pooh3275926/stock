
import React, { useState, useMemo, useCallback } from 'react';
import type { Stock, Settings, Transaction, StockMetadataMap } from '../types';
import { ActionMenu, SelectionActionBar, SearchInput, StockTags } from '../components/common';
import { ChevronDownIcon, PlusIcon, RefreshIcon } from '../components/Icons';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';

interface PortfolioPageProps {
    stocks: Stock[];
    settings: Settings;
    stockMetadata: StockMetadataMap;
    onAdd: () => void;
    onEdit: (s: Stock) => void;
    onDelete: (s: Stock) => void;
    onBuy: (s: Stock) => void;
    onSell: (s: Stock) => void;
    selectedSymbols: Set<string>;
    toggleSelection: (symbol: string) => void;
    clearSelection: () => void;
    deleteSelected: () => void;
    selectedTransactionIds: Set<string>;
    toggleTransactionSelection: (id: string) => void;
    clearTransactionSelection: () => void;
    deleteSelectedTransactions: () => void;
    onEditTransaction: (stockSymbol: string, transactionId: string) => void;
    onDeleteTransaction: (stockSymbol: string, transactionId: string) => void;
    onAutoUpdate: () => Promise<void>;
}

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ stocks, settings, stockMetadata, onAdd, onEdit, onDelete, onBuy, onSell, selectedSymbols, toggleSelection, clearSelection, deleteSelected, selectedTransactionIds, toggleTransactionSelection, clearTransactionSelection, deleteSelectedTransactions, onEditTransaction, onDeleteTransaction, onAutoUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedSymbols, setExpandedSymbols] = useState<Set<string>>(new Set());
    const [isUpdating, setIsUpdating] = useState(false);

    const toggleExpandSymbol = useCallback((symbol: string) => {
        setExpandedSymbols(prev => {
            const newSet = new Set(prev);
            if (newSet.has(symbol)) newSet.delete(symbol);
            else newSet.add(symbol);
            return newSet;
        });
    }, []);

    const filteredStocks = useMemo(() => stocks.filter(stock => stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || stock.name.toLowerCase().includes(searchTerm.toLowerCase())), [stocks, searchTerm]);
    const totalPortfolioCost = useMemo(() => stocks.reduce((sum, stock) => sum + calculateStockFinancials(stock).totalCost, 0), [stocks]);

    const displayStocks = useMemo(() => {
        return filteredStocks.map(stock => {
            const financials = calculateStockFinancials(stock);
            const investmentPercentage = totalPortfolioCost > 0 ? (financials.totalCost / totalPortfolioCost) * 100 : 0;
            return { ...stock, ...financials, investmentPercentage };
        }).sort((a, b) => a.symbol.localeCompare(b.symbol, undefined, { numeric: true }));
    }, [filteredStocks, totalPortfolioCost]);

    const handleAutoUpdateClick = async () => {
        setIsUpdating(true);
        try { await onAutoUpdate(); } finally { setIsUpdating(false); }
    };
    
    return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-2xl font-black tracking-tight uppercase">我的持股清單</h1>
            <p className="text-lg opacity-30 font-black mt-1 tracking-[0.2em] uppercase">Active Portfolio</p>
          </div>
          <div className="flex w-full md:w-auto gap-3">
              <button onClick={handleAutoUpdateClick} disabled={isUpdating} className="flex-1 md:flex-none bg-dark-card border border-dark-border hover:text-primary px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-black text-lg shadow-lg">
                  <RefreshIcon className={`h-5 w-5 ${isUpdating ? 'animate-spin' : ''}`} />
                  <span>同步現價</span>
              </button>
              <button onClick={onAdd} className="flex-1 md:flex-none bg-primary hover:bg-primary-hover text-white px-8 py-3 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all">
                  <PlusIcon className="h-5 w-5" /> 新增持股
              </button>
          </div>
      </div>

      <div className="p-2">
          <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="搜尋股票代號或名稱..."/>
      </div>

      {selectedSymbols.size > 0 && <SelectionActionBar count={selectedSymbols.size} onCancel={clearSelection} onDelete={deleteSelected} />}
      
      <div className="space-y-6">
          {displayStocks.map(stock => (
              <StockBlockCard 
                key={stock.symbol} 
                stock={stock} 
                settings={settings} 
                stockMetadata={stockMetadata} 
                onEdit={onEdit} 
                onDelete={onDelete} 
                onBuy={onBuy} 
                onSell={onSell} 
                isSelected={selectedSymbols.has(stock.symbol)} 
                toggleSelection={toggleSelection} 
                isExpanded={expandedSymbols.has(stock.symbol)} 
                onToggleExpand={toggleExpandSymbol} 
                selectedTransactionIds={selectedTransactionIds} 
                toggleTransactionSelection={toggleTransactionSelection} 
                onEditTransaction={onEditTransaction} 
                onDeleteTransaction={onDeleteTransaction} 
              />
          ))}
      </div>
    </div>
    )
};

const StockBlockCard: React.FC<any> = ({ stock, settings, stockMetadata, onEdit, onDelete, onBuy, onSell, isSelected, toggleSelection, isExpanded, onToggleExpand, selectedTransactionIds, toggleTransactionSelection, onEditTransaction, onDeleteTransaction }) => {
    const pnlColor = stock.unrealizedPnl >= 0 ? 'text-success' : 'text-danger';
    const pnlBg = stock.unrealizedPnl >= 0 ? 'bg-success/10' : 'bg-danger/10';
    const buyTransactions = useMemo(() => stock.transactions.filter((t:any) => t.type === 'BUY').sort((a:any,b:any) => new Date(b.date).getTime() - new Date(a.date).getTime()), [stock.transactions]);

    return (
        <div className={`bg-dark-card rounded-[2rem] shadow-xl border transition-all ${isSelected ? 'border-primary ring-4 ring-primary/10' : 'border-dark-border hover:border-primary/20'}`}>
            <div className="p-6 md:p-8" onClick={() => toggleSelection(stock.symbol)}>
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="p-1 bg-dark-bg/50 rounded-lg" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-dark-card border-dark-border rounded-lg" checked={isSelected} onChange={() => toggleSelection(stock.symbol)} />
                        </div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black tracking-tight">{stock.symbol}</h3>
                                <div className="text-lg font-bold opacity-30">{stock.name}</div>
                            </div>
                            <div className="mt-2"><StockTags symbol={stock.symbol} stockMetadata={stockMetadata} /></div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-6 lg:justify-end">
                        <div className="text-right">
                            <div className="text-lg font-black opacity-30 uppercase tracking-widest mb-1">未實現損益</div>
                            <div className={`px-4 py-1.5 rounded-xl border font-black text-lg ${pnlBg} ${pnlColor} border-current/10`}>
                                {formatCurrency(stock.unrealizedPnl, settings.currency)} ({stock.unrealizedPnlPercent.toFixed(2)}%)
                            </div>
                        </div>
                        <div className="text-right px-6 border-l border-dark-border hidden md:block">
                            <div className="text-lg font-black opacity-30 uppercase tracking-widest mb-1">持有市值</div>
                            <div className="text-xl font-black">{formatCurrency(stock.marketValue, settings.currency)}</div>
                        </div>
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                            <ActionMenu onEdit={() => onEdit(stock)} onDelete={() => onDelete(stock)} onBuy={() => onBuy(stock)} onSell={() => onSell(stock)} />
                            <button onClick={() => onToggleExpand(stock.symbol)} className="p-3 rounded-xl bg-dark-bg border border-dark-border hover:text-primary transition-all shadow-sm">
                                <ChevronDownIcon className={`h-5 w-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-6 p-6 bg-dark-bg/40 rounded-[1.5rem] border border-dark-border">
                    <div><span className="text-lg font-black opacity-30 uppercase block mb-1">平均成本</span><span className="text-lg font-black">{formatCurrency(stock.avgCost, settings.currency, 2)}</span></div>
                    <div><span className="text-lg font-black opacity-30 uppercase block mb-1">當前現價</span><span className="text-lg font-black text-primary">{formatCurrency(stock.currentPrice, settings.currency, 2)}</span></div>
                    <div><span className="text-lg font-black opacity-30 uppercase block mb-1">持有股數</span><span className="text-lg font-black">{stock.currentShares.toLocaleString()}</span></div>
                    <div><span className="text-lg font-black opacity-30 uppercase block mb-1">投資占比</span><span className="text-lg font-black">{stock.investmentPercentage.toFixed(2)}%</span></div>
                </div>
            </div>

            <div className={`transition-all duration-500 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-8 pt-0">
                    <div className="bg-dark-bg/60 rounded-[1.5rem] p-4 border border-dark-border space-y-2">
                        <h4 className="text-lg font-black uppercase tracking-[0.2em] opacity-30 mb-4 px-2">買入明細 (FIFO)</h4>
                        <div className="overflow-hidden rounded-xl border border-dark-border">
                            <table className="w-full text-left text-lg">
                                <thead className="bg-dark-bg/80 opacity-40 uppercase tracking-widest font-black">
                                    <tr>
                                        <th className="px-4 py-3">日期</th>
                                        <th className="px-4 py-3 text-right">股數</th>
                                        <th className="px-4 py-3 text-right">價格</th>
                                        <th className="px-4 py-3 text-right">成交額</th>
                                        <th className="px-4 py-3 text-center">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-dark-border/40 font-bold">
                                    {buyTransactions.map((tx:any) => (
                                        <tr key={tx.id} className="hover:bg-primary/5 transition-colors">
                                            <td className="px-4 py-3">{new Date(tx.date).toLocaleDateString()}</td>
                                            <td className="px-4 py-3 text-right">{tx.shares.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(tx.price, settings.currency, 2)}</td>
                                            <td className="px-4 py-3 text-right">{formatCurrency(tx.shares * tx.price + tx.fees, settings.currency)}</td>
                                            <td className="px-4 py-3 text-center"><ActionMenu onEdit={() => onEditTransaction(stock.symbol, tx.id)} onDelete={() => onDeleteTransaction(stock.symbol, tx.id)} /></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
