import React, { useState, useMemo } from 'react';
import { Stock, Settings } from '../types';
import { ActionMenu, SearchInput, SortableHeaderCell, SortConfig, SelectionActionBar } from '../components/common';
import { ChevronDownIcon, ChevronUpIcon } from '../components/Icons';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';

type HistoricalStock = Stock & { financials: ReturnType<typeof calculateStockFinancials> };
type SortDirection = 'asc' | 'desc';

interface TransactionHistoryPageProps {
    stocks: HistoricalStock[];
    settings: Settings;
    onBuy: (s: Stock) => void;
    selectedGroups: Set<string>;
    toggleGroupSelection: (symbol: string) => void;
    clearSelection: () => void;
    deleteSelected: () => void;
    selectedTransactionIds: Set<string>;
    toggleTransactionSelection: (id: string) => void;
    clearTransactionSelection: () => void;
    deleteSelectedTransactions: () => void;
    onEditTransaction: (stockSymbol: string, transactionId: string) => void;
    onDeleteTransaction: (stockSymbol: string, transactionId: string) => void;
}

export const TransactionHistoryPage: React.FC<TransactionHistoryPageProps> = ({ stocks, settings, onBuy, selectedGroups, toggleGroupSelection, clearSelection, deleteSelected, selectedTransactionIds, toggleTransactionSelection, clearTransactionSelection, deleteSelectedTransactions, onEditTransaction, onDeleteTransaction }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig<any>>({ key: 'symbol', direction: 'asc' });

    const filteredStocks = useMemo(() => stocks.filter(stock => stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || stock.name.toLowerCase().includes(searchTerm.toLowerCase())), [stocks, searchTerm]);
    
    const sortedStocks = useMemo(() => {
        return [...filteredStocks].sort((a, b) => {
            const valA = sortConfig.key === 'symbol' ? a.symbol : a.financials[sortConfig.key as keyof typeof a.financials];
            const valB = sortConfig.key === 'symbol' ? b.symbol : b.financials[sortConfig.key as keyof typeof b.financials];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredStocks, sortConfig]);

    const requestSort = (key: keyof any) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };
    
    const anySelectionActive = selectedGroups.size > 0 || selectedTransactionIds.size > 0;
    
    const handleClearSelection = () => {
        clearSelection();
        clearTransactionSelection();
    }

    return (
    <div className="space-y-6" onClick={(e) => { if(anySelectionActive) { const target = e.target as HTMLElement; if(!target.closest('.selectable-item, .selection-bar')) { handleClearSelection(); } } }}>
      <h1 className="text-3xl font-bold hidden md:block">賣出紀錄</h1>
      <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="搜尋股票代號或名稱..."/>
       {selectedGroups.size > 0 && <div onClick={e => e.stopPropagation()} className="selection-bar"><SelectionActionBar count={selectedGroups.size} onCancel={clearSelection} onDelete={deleteSelected} itemName="組" /></div>}
       {selectedTransactionIds.size > 0 && <div onClick={e => e.stopPropagation()} className="selection-bar"><SelectionActionBar count={selectedTransactionIds.size} onCancel={clearTransactionSelection} onDelete={deleteSelectedTransactions} itemName="筆交易" /></div>}
      
      <div className="hidden md:block bg-light-card dark:bg-dark-card rounded-lg shadow-md">
        <table className="w-full text-left">
          <thead className="bg-light-bg dark:bg-dark-bg"><tr>
              <th className="px-6 py-4 w-24"></th>
              <SortableHeaderCell label="代號/名稱" sortKey="symbol" sortConfig={sortConfig} onRequestSort={requestSort}/>
              <th className="px-6 py-4 font-semibold text-right">交易股數</th>
              <th className="px-6 py-4 font-semibold text-right">賣出均價</th>
              <th className="px-6 py-4 font-semibold text-right">賣出淨收入</th>
              <th className="px-6 py-4 font-semibold text-right">賣出總成本</th>
              <SortableHeaderCell label="已實現損益" sortKey="realizedPnl" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
              <SortableHeaderCell label="報酬率" sortKey="realizedReturnRate" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
              <th className="px-6 py-4 font-semibold text-center w-20">操作</th>
          </tr></thead>
          <tbody>{sortedStocks.map(stock => <GroupedHistoricalStockRow key={stock.symbol} stock={stock} settings={settings} onBuy={onBuy} isSelected={selectedGroups.has(stock.symbol)} toggleSelection={toggleGroupSelection} selectedTransactionIds={selectedTransactionIds} toggleTransactionSelection={toggleTransactionSelection} onEditTransaction={onEditTransaction} onDeleteTransaction={onDeleteTransaction} />)}</tbody>
        </table>
      </div>
       <div className="md:hidden space-y-4">
        {sortedStocks.length > 0 ? sortedStocks.map(stock => <GroupedHistoricalStockCard key={stock.symbol} stock={stock} settings={settings} onBuy={onBuy} isSelected={selectedGroups.has(stock.symbol)} toggleSelection={toggleGroupSelection} selectedTransactionIds={selectedTransactionIds} toggleTransactionSelection={toggleTransactionSelection} onEditTransaction={onEditTransaction} onDeleteTransaction={onDeleteTransaction}/>)
        : <div className="text-center p-8 text-light-text/70 dark:text-dark-text/70">沒有歷史交易紀錄</div>
        }
       </div>
    </div>
    )
};

const HistoricalTransactionDetailRow: React.FC<{ detail: any; settings: Settings; stockSymbol: string; onEdit: (stockSymbol: string, transactionId: string) => void; onDelete: (stockSymbol: string, transactionId: string) => void; isSelected: boolean; toggleSelection: (id: string) => void; }> = ({ detail, settings, stockSymbol, onEdit, onDelete, isSelected, toggleSelection }) => {
    const { transaction, costOfShares, realizedPnl, returnRate } = detail;
    const pnlColor = realizedPnl >= 0 ? 'text-success' : 'text-danger';
    const netSellIncome = transaction.shares * transaction.price - transaction.fees;
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
            <td className="px-6 py-3 text-right">{formatCurrency(netSellIncome, settings.currency)}</td>
            <td className="px-6 py-3 text-right">{formatCurrency(costOfShares, settings.currency)}</td>
            <td className={`px-6 py-3 text-right ${pnlColor}`}>{formatCurrency(realizedPnl, settings.currency)}</td>
            <td className={`px-6 py-3 text-right ${pnlColor}`}>{returnRate.toFixed(2)}%</td>
            <td className="px-6 py-4 text-center w-20" onClick={e => e.stopPropagation()}>
                <ActionMenu onEdit={() => onEdit(stockSymbol, transaction.id)} onDelete={() => onDelete(stockSymbol, transaction.id)} />
            </td>
        </tr>
    );
};

const GroupedHistoricalStockRow: React.FC<{ stock: HistoricalStock; settings: Settings; onBuy: (s: Stock) => void; isSelected: boolean; toggleSelection: (symbol: string) => void; selectedTransactionIds: Set<string>; toggleTransactionSelection: (id: string) => void; onEditTransaction: (stockSymbol: string, transactionId: string) => void; onDeleteTransaction: (stockSymbol: string, transactionId: string) => void;}> = ({ stock, settings, onBuy, isSelected, toggleSelection, selectedTransactionIds, toggleTransactionSelection, onEditTransaction, onDeleteTransaction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { financials } = stock;
    const pnlColor = financials.realizedPnl >= 0 ? 'text-success' : 'text-danger';

    const { avgSellPrice, totalNetSellIncome } = useMemo(() => {
        const totalSellValue = financials.sellDetails.reduce((sum, d) => sum + d.transaction.shares * d.transaction.price, 0);
        const totalSellFees = financials.sellDetails.reduce((sum, d) => sum + d.transaction.fees, 0);
        const totalNetSellIncome = totalSellValue - totalSellFees;
        const avgSellPrice = financials.totalSharesSold > 0 ? totalSellValue / financials.totalSharesSold : 0;
        return { avgSellPrice, totalNetSellIncome };
    }, [financials.sellDetails, financials.totalSharesSold]);

    return (
        <>
        <tr className={`border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`} onClick={() => toggleSelection(stock.symbol)}>
            <td className="px-6 py-4 w-24">
                <div className="flex items-center space-x-4">
                    <span onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(stock.symbol)} /></span>
                    <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border">{isOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}</button>
                </div>
            </td>
            <td className="px-6 py-4"><div className="font-bold">{stock.symbol}</div><div className="text-sm text-light-text/70 dark:text-dark-text/70">{stock.name}</div></td>
            <td className="px-6 py-4 text-right">{financials.totalSharesSold.toLocaleString()}</td>
            <td className="px-6 py-4 text-right">{formatCurrency(avgSellPrice, settings.currency, 2)}</td>
            <td className="px-6 py-4 text-right">{formatCurrency(totalNetSellIncome, settings.currency)}</td>
            <td className="px-6 py-4 text-right">{formatCurrency(financials.totalCostOfSoldShares, settings.currency)}</td>
            <td className={`px-6 py-4 text-right font-semibold ${pnlColor}`}>{formatCurrency(financials.realizedPnl, settings.currency)}</td>
            <td className={`px-6 py-4 text-right font-semibold ${pnlColor}`}>{financials.realizedReturnRate.toFixed(2)}%</td>
            <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}><ActionMenu onBuy={() => onBuy(stock)} /></td>
        </tr>
        {isOpen && financials.sellDetails.map(detail => <HistoricalTransactionDetailRow key={detail.transaction.id} detail={detail} settings={settings} stockSymbol={stock.symbol} onEdit={onEditTransaction} onDelete={onDeleteTransaction} isSelected={selectedTransactionIds.has(detail.transaction.id)} toggleSelection={toggleTransactionSelection} />)}
        </>
    );
};

const HistoricalTransactionDetailCard: React.FC<{ detail: any; settings: Settings; stockSymbol: string; onEdit: (stockSymbol: string, transactionId: string) => void; onDelete: (stockSymbol: string, transactionId: string) => void; isSelected: boolean; toggleSelection: (id: string) => void; }> = ({ detail, settings, stockSymbol, onEdit, onDelete, isSelected, toggleSelection }) => {
    const { transaction, realizedPnl, returnRate } = detail;
    const pnlColor = realizedPnl >= 0 ? 'text-success' : 'text-danger';
    const netSellIncome = transaction.shares * transaction.price - transaction.fees;

    return (
        <div className={`bg-light-bg/50 dark:bg-dark-bg/50 rounded-lg p-3 flex items-center space-x-4 selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`} onClick={() => toggleSelection(transaction.id)}>
            <span onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(transaction.id)} /></span>
            <div className="flex-grow flex justify-between items-center">
                <div>
                    <div className="text-sm text-light-text/80 dark:text-dark-text/80">{new Date(transaction.date).toLocaleDateString()}</div>
                    <div className="text-xs text-light-text/60 dark:text-dark-text/60">{transaction.shares.toLocaleString()} 股 @ {formatCurrency(transaction.price, settings.currency, 2)}</div>
                </div>
                <div className="text-right">
                    <div className="font-semibold">{formatCurrency(netSellIncome, settings.currency)}</div>
                    <div className={`text-sm ${pnlColor}`}>{formatCurrency(realizedPnl, settings.currency)} ({returnRate.toFixed(2)}%)</div>
                </div>
            </div>
            <div className="flex-shrink-0" onClick={e => e.stopPropagation()}>
                <ActionMenu onEdit={() => onEdit(stockSymbol, transaction.id)} onDelete={() => onDelete(stockSymbol, transaction.id)} />
            </div>
        </div>
    );
};

const GroupedHistoricalStockCard: React.FC<{ stock: HistoricalStock; settings: Settings; onBuy: (s: Stock) => void; isSelected: boolean; toggleSelection: (symbol: string) => void; selectedTransactionIds: Set<string>; toggleTransactionSelection: (id: string) => void; onEditTransaction: (stockSymbol: string, transactionId: string) => void; onDeleteTransaction: (stockSymbol: string, transactionId: string) => void;}> = ({ stock, settings, onBuy, isSelected, toggleSelection, selectedTransactionIds, toggleTransactionSelection, onEditTransaction, onDeleteTransaction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { financials } = stock;
    const pnlColor = financials.realizedPnl >= 0 ? 'text-success' : 'text-danger';

    const { avgSellPrice, totalNetSellIncome } = useMemo(() => {
        const totalSellValue = financials.sellDetails.reduce((sum, d) => sum + d.transaction.shares * d.transaction.price, 0);
        const totalSellFees = financials.sellDetails.reduce((sum, d) => sum + d.transaction.fees, 0);
        const totalNetSellIncome = totalSellValue - totalSellFees;
        const avgSellPrice = financials.totalSharesSold > 0 ? totalSellValue / financials.totalSharesSold : 0;
        return { avgSellPrice, totalNetSellIncome };
    }, [financials.sellDetails, financials.totalSharesSold]);

    return (
        <div className={`bg-light-card dark:bg-dark-card rounded-lg shadow-md selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-primary' : ''}`} onClick={() => toggleSelection(stock.symbol)}>
             <div className="p-4 flex items-start space-x-4" >
                <span className="mt-1" onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(stock.symbol)} /></span>
                <div className="flex-grow flex items-center justify-between cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                     <div>
                        <div className="font-bold text-lg">{stock.symbol}</div>
                        <div className="text-sm text-light-text/70 dark:text-dark-text/70">{stock.name}</div>
                    </div>
                    <div className={`text-right font-semibold ${pnlColor}`}>
                        <div className="text-lg">{formatCurrency(financials.realizedPnl, settings.currency)}</div>
                        <div className="text-sm">{financials.realizedReturnRate.toFixed(2)}%</div>
                    </div>
                </div>
                 <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border flex-shrink-0"><ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>
            </div>
            {isOpen && (
                <div className="px-5 pb-5 mt-2 border-t border-light-border dark:border-dark-border">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-base pt-4 mb-4">
                        <div><span className="text-light-text/70 dark:text-dark-text/70">總賣股:</span> {financials.totalSharesSold.toLocaleString()}</div>
                        <div><span className="text-light-text/70 dark:text-dark-text/70">均賣價:</span> {formatCurrency(avgSellPrice, settings.currency, 2)}</div>
                        <div className="col-span-2"><span className="text-light-text/70 dark:text-dark-text/70">淨收入:</span> {formatCurrency(totalNetSellIncome, settings.currency)}</div>
                        <div className="col-span-2"><span className="text-light-text/70 dark:text-dark-text/70">總賣出成本:</span> {formatCurrency(financials.totalCostOfSoldShares, settings.currency)}</div>
                    </div>
                     <div className="space-y-2">
                        {financials.sellDetails.map(detail => (
                           <HistoricalTransactionDetailCard key={detail.transaction.id} detail={detail} settings={settings} stockSymbol={stock.symbol} onEdit={onEditTransaction} onDelete={onDeleteTransaction} isSelected={selectedTransactionIds.has(detail.transaction.id)} toggleSelection={toggleTransactionSelection} />
                        ))}
                    </div>
                    <div className="mt-4 flex justify-end" onClick={e => e.stopPropagation()}>
                       <ActionMenu onBuy={() => onBuy(stock)} />
                    </div>
                </div>
            )}
        </div>
    );
};