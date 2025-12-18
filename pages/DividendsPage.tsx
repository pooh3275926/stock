
import React, { useState, useMemo, useCallback } from 'react';
import type { Stock, Dividend, Settings, StockMetadataMap } from '../types';
import { ActionMenu, SelectionActionBar, SearchInput, StockTags } from '../components/common';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, DividendIcon } from '../components/Icons';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';

interface DividendsPageProps { 
    stocks: Stock[];
    dividends: Dividend[];
    settings: Settings;
    stockMetadata: StockMetadataMap;
    onAdd: () => void;
    onEdit: (d: Dividend) => void;
    onDelete: (d: Dividend) => void;
    selectedGroups: Set<string>;
    toggleGroupSelection: (symbol: string) => void;
    clearGroupSelection: () => void;
    deleteSelectedGroups: () => void;
    selectedIds: Set<string>;
    toggleIdSelection: (id: string) => void;
    clearIdSelection: () => void;
    deleteSelectedIds: () => void;
}

export const DividendsPage: React.FC<DividendsPageProps> = ({ stocks, dividends, settings, stockMetadata, onAdd, onEdit, onDelete, selectedGroups, toggleGroupSelection, clearGroupSelection, deleteSelectedGroups, selectedIds, toggleIdSelection, clearIdSelection, deleteSelectedIds }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [showOnlyHeld, setShowOnlyHeld] = useState(false);

    const groupedDividends = useMemo(() => {
        const filtered = dividends.filter(d => d.stockSymbol.toLowerCase().includes(searchTerm.toLowerCase()));
        const groups: { [key: string]: { details: Dividend[], stockName: string } } = {};
        filtered.forEach(d => {
            if (!groups[d.stockSymbol]) {
                const stock = stocks.find(s => s.symbol === d.stockSymbol);
                groups[d.stockSymbol] = { details: [], stockName: stock?.name || '' };
            }
            groups[d.stockSymbol].details.push(d);
        });

        const result = Object.entries(groups).map(([symbol, group]) => {
            const totalAmount = group.details.reduce((sum, d) => sum + d.amount, 0);
            const stock = stocks.find(s => s.symbol === symbol);
            const financials = stock ? calculateStockFinancials(stock) : { totalCost: 0, currentShares: 0, avgCost: 0 };
            const yieldRate = financials.totalCost > 0 ? (totalAmount / financials.totalCost) * 100 : 0;
            const frequency = stockMetadata[symbol]?.frequency || 1;
            
            const detailsWithCalcs = group.details.map(d => {
                const sharesHeld = d.sharesHeld || 0;
                const proportionalCost = sharesHeld * financials.avgCost;
                const indYield = proportionalCost > 0 ? (d.amount / proportionalCost) * 100 : 0;
                return { ...d, yieldRate: indYield, annualizedYield: indYield * frequency };
            });

            const avgAnnualizedYield = detailsWithCalcs.length > 0 ? detailsWithCalcs.reduce((s, d) => s + d.annualizedYield, 0) / detailsWithCalcs.length : 0;

            return {
                stockSymbol: symbol,
                stockName: group.stockName,
                totalAmount,
                yieldRate,
                avgAnnualizedYield,
                details: detailsWithCalcs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                currentShares: financials.currentShares,
                currentTotalCost: financials.totalCost,
            };
        });

        return showOnlyHeld ? result.filter(g => g.currentShares > 0) : result;
    }, [dividends, stocks, searchTerm, showOnlyHeld, stockMetadata]);

    return (
        <div className="space-y-10 pb-20">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl font-black tracking-tight uppercase">股利發放紀錄</h1>
                    <p className="text-lg opacity-40 font-bold mt-1 tracking-widest uppercase">Passive Income Streams</p>
                </div>
                <button onClick={onAdd} className="w-full md:w-auto bg-success hover:bg-success/80 text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-success/20 transition-all">
                    <PlusIcon className="h-6 w-6" /> 新增領息紀錄
                </button>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 w-full"><SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="搜尋股票代號..."/></div>
                <label className="flex items-center space-x-4 cursor-pointer bg-dark-card border border-dark-border px-6 py-3 rounded-2xl transition-all hover:border-primary/40">
                    <input type="checkbox" className="form-checkbox h-6 w-6 text-primary bg-dark-bg border-dark-border rounded-lg" checked={showOnlyHeld} onChange={(e) => setShowOnlyHeld(e.target.checked)}/>
                    <span className="font-black text-lg uppercase tracking-widest">僅顯示持有中</span>
                </label>
            </div>

            {selectedGroups.size > 0 && <SelectionActionBar count={selectedGroups.size} onCancel={clearGroupSelection} onDelete={deleteSelectedGroups} itemName="組" />}
            {selectedIds.size > 0 && <SelectionActionBar count={selectedIds.size} onCancel={clearIdSelection} onDelete={deleteSelectedIds} itemName="筆" />}
            
            <div className="grid grid-cols-1 gap-8">
                {groupedDividends.map(group => (
                    <DividendBlockCard key={group.stockSymbol} group={group} settings={settings} stockMetadata={stockMetadata} onEdit={onEdit} onDelete={onDelete} isSelected={selectedGroups.has(group.stockSymbol)} toggleSelection={toggleGroupSelection} selectedIds={selectedIds} toggleIdSelection={toggleIdSelection} />
                ))}
            </div>
        </div>
    );
};

const DividendBlockCard: React.FC<any> = ({ group, settings, stockMetadata, onEdit, onDelete, isSelected, toggleSelection, selectedIds, toggleIdSelection }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <div className={`bg-dark-card rounded-[2rem] shadow-xl border transition-all duration-300 ${isSelected ? 'border-primary ring-4 ring-primary/10' : 'border-dark-border'}`}>
            <div className="p-6 md:p-8" onClick={() => toggleSelection(group.stockSymbol)}>
                <div className="flex flex-col lg:flex-row justify-between gap-6">
                    <div className="flex items-start gap-4">
                        <div className="p-1 bg-dark-bg/50 rounded-lg" onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-dark-card border-dark-border rounded-lg" checked={isSelected} onChange={() => toggleSelection(group.stockSymbol)} /></div>
                        <div>
                            <div className="flex items-center gap-3">
                                <h3 className="text-2xl font-black tracking-tight">{group.stockSymbol}</h3>
                                <div className="text-lg font-bold opacity-40">{group.stockName}</div>
                            </div>
                            <div className="mt-2"><StockTags symbol={group.stockSymbol} stockMetadata={stockMetadata} /></div>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-6 lg:justify-end">
                        <div className="text-right">
                            <div className="text-lg font-black opacity-30 uppercase tracking-widest mb-1">累計領息</div>
                            <div className="px-5 py-2 rounded-2xl border border-success/20 bg-success/10 text-success font-black text-2xl">{formatCurrency(group.totalAmount, settings.currency)}</div>
                        </div>
                        <div className="text-right px-6 border-l border-dark-border">
                            <div className="text-lg font-black opacity-30 uppercase tracking-widest mb-1">預估年化殖利率</div>
                            <div className="text-2xl font-black text-success">{group.avgAnnualizedYield.toFixed(2)}%</div>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }} className="p-3 rounded-xl bg-dark-bg border border-dark-border hover:text-primary transition-all">
                            <ChevronDownIcon className={`h-6 w-6 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>

            <div className={`transition-all duration-700 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                <div className="p-8 pt-0">
                    <div className="bg-dark-bg/60 rounded-[1.5rem] p-6 border border-dark-border">
                        <div className="grid grid-cols-1 gap-4 font-bold text-lg">
                            {group.details.map((d:any) => (
                                <div key={d.id} onClick={() => toggleIdSelection(d.id)} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${selectedIds.has(d.id) ? 'bg-primary/20 border-primary' : 'bg-dark-card border-transparent hover:border-primary/20'}`}>
                                    <div className="flex items-center gap-4">
                                        <input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-dark-bg border-dark-border rounded" checked={selectedIds.has(d.id)} onChange={() => toggleIdSelection(d.id)} onClick={e => e.stopPropagation()}/>
                                        <div>
                                            <div className="font-black text-lg">{new Date(d.date).toLocaleDateString()}</div>
                                            <div className="text-sm opacity-40 font-bold mt-1">配發 {d.dividendPerShare?.toFixed(2)} / 參與 {d.sharesHeld?.toLocaleString()} 股</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right"><div className="text-sm font-black opacity-40 mb-1">淨收入</div><div className="font-black text-success">{formatCurrency(d.amount, settings.currency)}</div></div>
                                        <div onClick={e => e.stopPropagation()}><ActionMenu onEdit={() => onEdit(d)} onDelete={() => onDelete(d)} /></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
