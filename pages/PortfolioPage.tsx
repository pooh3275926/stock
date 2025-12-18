
import React, { useState, useMemo, useCallback } from 'react';
import type { Stock, Settings, Transaction, StockMetadataMap } from '../types';
import { ActionMenu, SelectionActionBar, SearchInput, SortableHeaderCell, SortConfig, StockTags } from '../components/common';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, RefreshIcon } from '../components/Icons';
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
type SortDirection = 'asc' | 'desc';

export const PortfolioPage: React.FC<PortfolioPageProps> = ({ stocks, settings, stockMetadata, onAdd, onEdit, onDelete, onBuy, onSell, selectedSymbols, toggleSelection, clearSelection, deleteSelected, selectedTransactionIds, toggleTransactionSelection, clearTransactionSelection, deleteSelectedTransactions, onEditTransaction, onDeleteTransaction, onAutoUpdate }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig<any>>({ key: 'symbol', direction: 'asc' });
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
    
    // Calculate total cost of the portfolio to determine investment percentage
    const totalPortfolioCost = useMemo(() => stocks.reduce((sum, stock) => sum + calculateStockFinancials(stock).totalCost, 0), [stocks]);

    const sortedStocks = useMemo(() => {
        const withCalcs = filteredStocks.map(stock => {
            const financials = calculateStockFinancials(stock);
            const investmentPercentage = totalPortfolioCost > 0 ? (financials.totalCost / totalPortfolioCost) * 100 : 0;
            return { ...stock, ...financials, investmentPercentage };
        });
        return [...withCalcs].sort((a, b) => {
            if (a[sortConfig.key as keyof typeof a] < b[sortConfig.key as keyof typeof b]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key as keyof typeof a] > b[sortConfig.key as keyof typeof b]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredStocks, sortConfig, totalPortfolioCost]);

    const requestSort = (key: keyof any) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    const anySelectionActive = selectedSymbols.size > 0 || selectedTransactionIds.size > 0;
    
    const handleClearSelection = () => {
        clearSelection();
        clearTransactionSelection();
    }

    const handleAutoUpdateClick = async () => {
        setIsUpdating(true);
        try {
            await onAutoUpdate();
        } finally {
            setIsUpdating(false);
        }
    };
    
    return (
    <div className="space-y-6" onClick={(e) => { if(anySelectionActive) { const target = e.target as HTMLElement; if(!target.closest('.selectable-item, .selection-bar')) { handleClearSelection(); } } }}>
      <h1 className="text-3xl font-bold hidden md:block">我的持股</h1>
       <div className="flex items-center gap-4">
          <div className="flex-grow">
              <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="搜尋股票代號或名稱..."/>
          </div>
          <div className="flex gap-2 flex-shrink-0">
              <button 
                onClick={handleAutoUpdateClick} 
                disabled={isUpdating}
                className={`bg-secondary hover:bg-secondary/80 text-white p-3 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-70 disabled:cursor-not-allowed`}
                title="透過證交所 API 更新即時股價"
              >
                  <RefreshIcon className={`h-6 w-6 ${isUpdating ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">更新股價</span>
              </button>
              <button onClick={onAdd} className="bg-primary hover:bg-primary-hover text-primary-foreground p-3 rounded-lg">
                  <PlusIcon className="h-6 w-6" />
              </button>
          </div>
      </div>
      {selectedSymbols.size > 0 && <div onClick={e => e.stopPropagation()} className="selection-bar"><SelectionActionBar count={selectedSymbols.size} onCancel={clearSelection} onDelete={deleteSelected} /></div>}
      {selectedTransactionIds.size > 0 && <div onClick={e => e.stopPropagation()} className="selection-bar"><SelectionActionBar count={selectedTransactionIds.size} onCancel={clearTransactionSelection} onDelete={deleteSelectedTransactions} itemName="筆交易" /></div>}
      
      <div className="md:hidden space-y-4">{sortedStocks.map(stock => <StockCard key={stock.symbol} stock={stock} settings={settings} stockMetadata={stockMetadata} onEdit={onEdit} onDelete={onDelete} onBuy={onBuy} onSell={onSell} isSelected={selectedSymbols.has(stock.symbol)} toggleSelection={toggleSelection} isExpanded={expandedSymbols.has(stock.symbol)} onToggleExpand={toggleExpandSymbol} selectedTransactionIds={selectedTransactionIds} toggleTransactionSelection={toggleTransactionSelection} onEditTransaction={onEditTransaction} onDeleteTransaction={onDeleteTransaction} />)}</div>
      
      <div className="hidden md:block bg-light-card dark:bg-dark-card rounded-lg shadow-md">
        <table className="w-full text-left">
          <thead className="bg-light-bg dark:bg-dark-bg"><tr>
              <th className="px-6 py-4 w-24"></th>
              <SortableHeaderCell label="代號/名稱" sortKey="symbol" sortConfig={sortConfig} onRequestSort={requestSort}/>
              <th className="px-6 py-4 font-semibold text-right">股數</th>
              <th className="px-6 py-4 font-semibold text-right">平均成本</th>
              <th className="px-6 py-4 font-semibold text-right">總成本</th>
              <th className="px-6 py-4 font-semibold text-right">現價</th>
              <th className="px-6 py-4 font-semibold text-right">市值</th>
              <SortableHeaderCell label="未實現損益" sortKey="unrealizedPnl" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
              <SortableHeaderCell label="報酬率" sortKey="unrealizedPnlPercent" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
              <SortableHeaderCell label="投資占比" sortKey="investmentPercentage" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
              <th className="px-6 py-4 font-semibold text-center w-20">操作</th>
          </tr></thead>
          <tbody>{sortedStocks.map(stock => <StockRow key={stock.symbol} stock={stock} settings={settings} stockMetadata={stockMetadata} onEdit={onEdit} onDelete={onDelete} onBuy={onBuy} onSell={onSell} isSelected={selectedSymbols.has(stock.symbol)} toggleSelection={toggleSelection} isExpanded={expandedSymbols.has(stock.symbol)} onToggleExpand={toggleExpandSymbol} selectedTransactionIds={selectedTransactionIds} toggleTransactionSelection={toggleTransactionSelection} onEditTransaction={onEditTransaction} onDeleteTransaction={onDeleteTransaction} />)}</tbody>
        </table>
      </div>
    </div>
    )
};

// --- Child Components for PortfolioPage ---

const BuyTransactionDetailRow: React.FC<{ transaction: Transaction; settings: Settings; stockSymbol: string; onEdit: (stockSymbol: string, transactionId: string) => void; onDelete: (stockSymbol: string, transactionId: string) => void; isSelected: boolean; toggleSelection: (id: string) => void; }> = ({ transaction, settings, stockSymbol, onEdit, onDelete, isSelected, toggleSelection }) => {
    const totalCost = transaction.shares * transaction.price + transaction.fees;
    return (
        <tr className={`bg-light-bg/50 dark:bg-dark-bg/50 border-b border-light-border dark:border-dark-border last:border-b-0 text-sm hover:bg-light-bg dark:hover:bg-dark-bg selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`} onClick={() => toggleSelection(transaction.id)}>
            <td className="px-6 py-3 w-24" onClick={e => e.stopPropagation()}>
                <div className="flex justify-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(transaction.id)} />
                </div>
            </td>
            <td className="px-6 py-3 text-left">{new Date(transaction.date).toLocaleDateString()}</td>
            <td className="px-6 py-3 text-right">{transaction.shares.toLocaleString()}</td>
            <td className="px-6 py-3 text-right">{formatCurrency(transaction.price, settings.currency, 2)}</td>
            <td className="px-6 py-3 text-right">{formatCurrency(totalCost, settings.currency)}</td>
            <td colSpan={5}></td>
            <td className="px-6 py-4 text-center w-20" onClick={e => e.stopPropagation()}>
                <ActionMenu onEdit={() => onEdit(stockSymbol, transaction.id)} onDelete={() => onDelete(stockSymbol, transaction.id)} />
            </td>
        </tr>
    );
};

const StockRow: React.FC<{stock: Stock & ReturnType<typeof calculateStockFinancials> & { investmentPercentage: number }, settings: Settings, stockMetadata: StockMetadataMap, onEdit: (s: Stock) => void; onDelete: (s: Stock) => void; onBuy: (s: Stock) => void; onSell: (s: Stock) => void; isSelected: boolean; toggleSelection: (symbol: string) => void; isExpanded: boolean; onToggleExpand: (symbol: string) => void; selectedTransactionIds: Set<string>; toggleTransactionSelection: (id: string) => void; onEditTransaction: (stockSymbol: string, transactionId: string) => void; onDeleteTransaction: (stockSymbol: string, transactionId: string) => void;}> = ({ stock, settings, stockMetadata, onEdit, onDelete, onBuy, onSell, isSelected, toggleSelection, isExpanded, onToggleExpand, selectedTransactionIds, toggleTransactionSelection, onEditTransaction, onDeleteTransaction }) => {
    const { currentShares, avgCost, totalCost, marketValue, unrealizedPnl, unrealizedPnlPercent, investmentPercentage } = stock;
    const pnlColor = unrealizedPnl >= 0 ? 'text-success' : 'text-danger';
    const buyTransactions = useMemo(() => stock.transactions.filter(t => t.type === 'BUY').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [stock.transactions]);

    return (
        <>
            <tr className={`border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`} onClick={() => toggleSelection(stock.symbol)}>
                <td className="px-6 py-4 w-24">
                    <div className="flex items-center space-x-4">
                        <span onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(stock.symbol)} /></span>
                        <button onClick={(e) => { e.stopPropagation(); onToggleExpand(stock.symbol); }} className="p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border">{isExpanded ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}</button>
                    </div>
                </td>
                <td className="px-6 py-4">
                    <div className="font-bold">{stock.symbol}</div>
                    <div className="text-sm text-light-text/70 dark:text-dark-text/70">{stock.name}</div>
                    <StockTags symbol={stock.symbol} stockMetadata={stockMetadata} />
                </td>
                <td className="px-6 py-4 text-right">{currentShares.toLocaleString()}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(avgCost, settings.currency, 2)}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(totalCost, settings.currency)}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(stock.currentPrice, settings.currency, 2)}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(marketValue, settings.currency)}</td>
                <td className={`px-6 py-4 text-right font-semibold ${pnlColor}`}>{formatCurrency(unrealizedPnl, settings.currency)}</td>
                <td className={`px-6 py-4 text-right font-semibold ${pnlColor}`}>{unrealizedPnlPercent.toFixed(2)}%</td>
                <td className="px-6 py-4 text-right">{investmentPercentage.toFixed(2)}%</td>
                <td className="px-6 py-4 text-center w-20" onClick={e => e.stopPropagation()}><ActionMenu onEdit={() => onEdit(stock)} onDelete={() => onDelete(stock)} onBuy={() => onBuy(stock)} onSell={() => onSell(stock)} /></td>
            </tr>
            {isExpanded && buyTransactions.map(tx => <BuyTransactionDetailRow key={tx.id} transaction={tx} settings={settings} stockSymbol={stock.symbol} onEdit={onEditTransaction} onDelete={onDeleteTransaction} isSelected={selectedTransactionIds.has(tx.id)} toggleSelection={toggleTransactionSelection} />)}
        </>
    );
};

const BuyTransactionDetailCard: React.FC<{ transaction: Transaction; settings: Settings; stockSymbol: string; onEdit: (stockSymbol: string, transactionId: string) => void; onDelete: (stockSymbol: string, transactionId: string) => void; isSelected: boolean; toggleSelection: (id: string) => void; }> = ({ transaction, settings, stockSymbol, onEdit, onDelete, isSelected, toggleSelection }) => (
    <div className={`bg-light-bg/50 dark:bg-dark-bg/50 rounded-lg p-3 flex items-center space-x-4 selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`} onClick={() => toggleSelection(transaction.id)}>
        <span onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(transaction.id)} /></span>
        <div className="flex-grow flex justify-between items-center">
            <div>
                <div className="text-sm text-light-text/80 dark:text-dark-text/80">{new Date(transaction.date).toLocaleDateString()}</div>
                <div className="text-xs text-light-text/60 dark:text-dark-text/60">{transaction.shares.toLocaleString()} 股 @ {formatCurrency(transaction.price, settings.currency, 2)}</div>
            </div>
            <div className="text-right font-semibold">
                {formatCurrency(transaction.shares * transaction.price + transaction.fees, settings.currency)}
            </div>
        </div>
        <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
            <ActionMenu onEdit={() => onEdit(stockSymbol, transaction.id)} onDelete={() => onDelete(stockSymbol, transaction.id)} />
        </div>
    </div>
);

const StockCard: React.FC<{stock: Stock & ReturnType<typeof calculateStockFinancials> & { investmentPercentage: number }, settings: Settings, stockMetadata: StockMetadataMap, onEdit: (s: Stock) => void; onDelete: (s: Stock) => void; onBuy: (s: Stock) => void; onSell: (s: Stock) => void; isSelected: boolean; toggleSelection: (symbol: string) => void; isExpanded: boolean; onToggleExpand: (symbol: string) => void; selectedTransactionIds: Set<string>; toggleTransactionSelection: (id: string) => void; onEditTransaction: (stockSymbol: string, transactionId: string) => void; onDeleteTransaction: (stockSymbol: string, transactionId: string) => void;}> = ({ stock, settings, stockMetadata, onEdit, onDelete, onBuy, onSell, isSelected, toggleSelection, isExpanded, onToggleExpand, selectedTransactionIds, toggleTransactionSelection, onEditTransaction, onDeleteTransaction }) => {
    const { currentShares, avgCost, totalCost, marketValue, unrealizedPnl, unrealizedPnlPercent, investmentPercentage } = stock;
    const pnlColor = unrealizedPnl >= 0 ? 'text-success' : 'text-danger';
    const buyTransactions = useMemo(() => stock.transactions.filter(t => t.type === 'BUY').sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [stock.transactions]);

    return (
      <div className={`bg-light-card dark:bg-dark-card rounded-lg shadow-md selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-primary' : ''}`} onClick={() => toggleSelection(stock.symbol)}>
        <div className="p-5">
            <div className="flex justify-between items-start mb-3">
                <div className="flex items-start space-x-4">
                    <span onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary mt-1" checked={isSelected} onChange={() => toggleSelection(stock.symbol)} /></span>
                    <div>
                        <div className="font-bold text-lg">{stock.symbol}</div>
                        <div className="text-sm text-light-text/70 dark:text-dark-text/70">{stock.name}</div>
                        <StockTags symbol={stock.symbol} stockMetadata={stockMetadata} />
                    </div>
                </div>
                <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                    <ActionMenu onEdit={() => onEdit(stock)} onDelete={() => onDelete(stock)} onBuy={() => onBuy(stock)} onSell={() => onSell(stock)} />
                    <button onClick={() => onToggleExpand(stock.symbol)} className="p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border"><ChevronDownIcon className={`h-6 w-6 transition-transform ${isExpanded ? 'rotate-180' : ''}`} /></button>
                </div>
            </div>
            <div className={`text-right font-semibold ${pnlColor} mb-4 flex items-baseline justify-end gap-2`}>
                <span className="text-xl">{formatCurrency(unrealizedPnl, settings.currency)}</span>
                <span className="text-base">({unrealizedPnlPercent.toFixed(2)}%)</span>
            </div>
            <div className="border-t border-light-border dark:border-dark-border my-4"></div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-base">
                <div><span className="text-light-text/70 dark:text-dark-text/70">市值:</span> {formatCurrency(marketValue, settings.currency)}</div>
                <div><span className="text-light-text/70 dark:text-dark-text/70">總成本:</span> {formatCurrency(totalCost, settings.currency)}</div>
                <div><span className="text-light-text/70 dark:text-dark-text/70">股數:</span> {currentShares.toLocaleString()}</div>
                <div><span className="text-light-text/70 dark:text-dark-text/70">均價:</span> {formatCurrency(avgCost, settings.currency, 2)}</div>
                <div><span className="text-light-text/70 dark:text-dark-text/70">現價:</span> {formatCurrency(stock.currentPrice, settings.currency, 2)}</div>
                <div><span className="text-light-text/70 dark:text-dark-text/70">投資占比:</span> {investmentPercentage.toFixed(2)}%</div>
            </div>
        </div>

        {isExpanded && (
            <div className="px-5 pb-5 mt-4 border-t border-light-border dark:border-dark-border pt-4 space-y-2">
                <h4 className="font-semibold pb-2 text-base">買入紀錄</h4>
                {buyTransactions.length > 0 ? buyTransactions.map(tx => (
                    <BuyTransactionDetailCard key={tx.id} transaction={tx} settings={settings} stockSymbol={stock.symbol} onEdit={onEditTransaction} onDelete={onDeleteTransaction} isSelected={selectedTransactionIds.has(tx.id)} toggleSelection={toggleTransactionSelection} />
                )) : <p className="text-sm text-center text-light-text/60 dark:text-dark-text/60 py-2">無買入紀錄</p>}
            </div>
        )}
      </div>
    );
};
