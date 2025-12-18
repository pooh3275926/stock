
import React, { useState, useMemo } from 'react';
import { Stock, Settings, StockMetadataMap } from '../types';
import { ActionMenu, SearchInput, SortableHeaderCell, SortConfig, SelectionActionBar, StockTags } from '../components/common';
import { ChevronDownIcon, ChevronUpIcon } from '../components/Icons';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';

type HistoricalStock = Stock & { financials: ReturnType<typeof calculateStockFinancials> };

interface TransactionHistoryPageProps {
    stocks: HistoricalStock[];
    settings: Settings;
    stockMetadata: StockMetadataMap;
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

export const TransactionHistoryPage: React.FC<TransactionHistoryPageProps> = ({ stocks, settings, stockMetadata, onBuy, selectedGroups, toggleGroupSelection, clearSelection, deleteSelected, selectedTransactionIds, toggleTransactionSelection, clearTransactionSelection, deleteSelectedTransactions, onEditTransaction, onDeleteTransaction }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig<any>>({ key: 'symbol', direction: 'asc' });

    const filteredStocks = useMemo(() => stocks.filter(stock => stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || stock.name.toLowerCase().includes(searchTerm.toLowerCase())), [stocks, searchTerm]);
    
    const sortedStocks = useMemo(() => {
        return [...filteredStocks].sort((a, b) => {
            const valA = sortConfig.key === 'symbol' ? a.symbol : (a.financials as any)[sortConfig.key];
            const valB = sortConfig.key === 'symbol' ? b.symbol : (b.financials as any)[sortConfig.key];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [filteredStocks, sortConfig]);

    const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
        setSortConfig({ key, direction });
    };

    return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div><h1 className="text-2xl font-black tracking-tight uppercase">歷史交易賣出紀錄</h1><p className="text-lg opacity-40 font-bold mt-1 tracking-widest uppercase">Realized Profit & Loss</p></div>
      </div>
      
      <div className="p-2"><SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="搜尋股票代號或名稱..."/></div>

      {(selectedGroups.size > 0 || selectedTransactionIds.size > 0) && <SelectionActionBar count={selectedGroups.size + selectedTransactionIds.size} onCancel={() => { clearSelection(); clearTransactionSelection(); }} onDelete={() => { deleteSelected(); deleteSelectedTransactions(); }} />}
      
      <div className="bg-dark-card rounded-[2rem] border border-dark-border shadow-xl overflow-hidden">
        <table className="w-full text-left text-lg font-bold">
          <thead className="bg-dark-bg/50 opacity-40 uppercase tracking-widest font-black">
            <tr>
              <th className="px-6 py-4 w-20"></th>
              <SortableHeaderCell label="代號/名稱" sortKey="symbol" sortConfig={sortConfig} onRequestSort={requestSort}/>
              <th className="px-6 py-4 text-right">已實現損益</th>
              <th className="px-6 py-4 text-right">報酬率</th>
              <th className="px-6 py-4 text-center w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-border">
            {sortedStocks.map(stock => (
                <HistoricalStockGroup key={stock.symbol} stock={stock} settings={settings} stockMetadata={stockMetadata} onBuy={onBuy} isSelected={selectedGroups.has(stock.symbol)} toggleSelection={toggleGroupSelection} selectedTransactionIds={selectedTransactionIds} toggleTransactionSelection={toggleTransactionSelection} onEditTransaction={onEditTransaction} onDeleteTransaction={onDeleteTransaction} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
    )
};

const HistoricalStockGroup: React.FC<any> = ({ stock, settings, stockMetadata, onBuy, isSelected, toggleSelection, selectedTransactionIds, toggleTransactionSelection, onEditTransaction, onDeleteTransaction }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { financials } = stock;
    const pnlColor = financials.realizedPnl >= 0 ? 'text-success' : 'text-danger';

    return (
        <>
            <tr className={`hover:bg-primary/5 transition-colors cursor-pointer ${isSelected ? 'bg-primary/10' : ''}`} onClick={() => toggleSelection(stock.symbol)}>
                <td className="px-6 py-5 text-center" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-dark-bg border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(stock.symbol)} />
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1 rounded-full hover:bg-dark-border transition-all">
                            <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </td>
                <td className="px-6 py-5">
                    <div className="font-black text-lg">{stock.symbol}</div>
                    <div className="text-sm opacity-40">{stock.name}</div>
                    <StockTags symbol={stock.symbol} stockMetadata={stockMetadata} />
                </td>
                <td className={`px-6 py-5 text-right font-black ${pnlColor}`}>{formatCurrency(financials.realizedPnl, settings.currency)}</td>
                <td className={`px-6 py-5 text-right font-black ${pnlColor}`}>{financials.realizedReturnRate.toFixed(2)}%</td>
                <td className="px-6 py-5 text-center" onClick={e => e.stopPropagation()}><ActionMenu onBuy={() => onBuy(stock)} /></td>
            </tr>
            {isOpen && financials.sellDetails.map((detail: any) => (
                <tr key={detail.transaction.id} className="bg-dark-bg/30 text-base font-bold">
                    <td className="px-10 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" className="form-checkbox h-4 w-4 text-primary bg-dark-bg border-dark-border rounded focus:ring-primary" checked={selectedTransactionIds.has(detail.transaction.id)} onChange={() => toggleTransactionSelection(detail.transaction.id)} />
                    </td>
                    <td className="px-6 py-3 opacity-60">賣出明細: {new Date(detail.transaction.date).toLocaleDateString()}</td>
                    <td className="px-6 py-3 text-right">成交: {formatCurrency(detail.transaction.shares * detail.transaction.price - detail.transaction.fees, settings.currency)}</td>
                    <td className={`px-6 py-3 text-right ${detail.realizedPnl >= 0 ? 'text-success' : 'text-danger'}`}>{detail.returnRate.toFixed(2)}%</td>
                    <td className="px-6 py-3 text-center" onClick={e => e.stopPropagation()}>
                        <ActionMenu onEdit={() => onEditTransaction(stock.symbol, detail.transaction.id)} onDelete={() => onDeleteTransaction(stock.symbol, detail.transaction.id)} />
                    </td>
                </tr>
            ))}
        </>
    );
};
