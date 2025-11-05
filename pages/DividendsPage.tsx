import React, { useState, useMemo, useCallback } from 'react';
import type { Stock, Dividend, Settings } from '../types';
import { ActionMenu, SelectionActionBar, SearchInput, SortableHeaderCell, SortConfig } from '../components/common';
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from '../components/Icons';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';
import { stockDividendFrequency } from '../utils/data';

interface DividendsPageProps { 
    stocks: Stock[];
    dividends: Dividend[];
    settings: Settings;
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

type SortDirection = 'asc' | 'desc';

export const DividendsPage: React.FC<DividendsPageProps> = ({ stocks, dividends, settings, onAdd, onEdit, onDelete, selectedGroups, toggleGroupSelection, clearGroupSelection, deleteSelectedGroups, selectedIds, toggleIdSelection, clearIdSelection, deleteSelectedIds }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<SortConfig<any>>({ key: 'stockSymbol', direction: 'asc' });

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

        return Object.entries(groups).map(([symbol, group]) => {
            const totalAmount = group.details.reduce((sum, d) => sum + d.amount, 0);
            const stock = stocks.find(s => s.symbol === symbol);
            const financials = stock ? calculateStockFinancials(stock) : { totalCost: 0, currentShares: 0, avgCost: 0 };
            const yieldRate = financials.totalCost > 0 ? (totalAmount / financials.totalCost) * 100 : 0;
            
            const totalSharesForDividends = group.details.reduce((sum, d) => sum + (d.sharesHeld || 0), 0);
            const weightedDividendSum = group.details.reduce((sum, d) => sum + ((d.dividendPerShare || 0) * (d.sharesHeld || 0)), 0);
            const avgDividendPerShare = totalSharesForDividends > 0 ? weightedDividendSum / totalSharesForDividends : 0;
            
            const detailsWithCalcs = group.details.map(d => {
                const sharesHeld = d.sharesHeld || 0;
                const proportionalCost = sharesHeld * financials.avgCost;
                const individualYieldRate = proportionalCost > 0 ? (d.amount / proportionalCost) * 100 : 0;
                const frequency = stockDividendFrequency[symbol] || 1;
                const annualizedYield = individualYieldRate * frequency;
                return { ...d, yieldRate: individualYieldRate, annualizedYield };
            });

            const totalAnnualizedYield = detailsWithCalcs.reduce((sum, d) => sum + d.annualizedYield, 0);
            const avgAnnualizedYield = detailsWithCalcs.length > 0 ? totalAnnualizedYield / detailsWithCalcs.length : 0;

            return {
                stockSymbol: symbol,
                stockName: group.stockName,
                totalAmount,
                yieldRate,
                avgAnnualizedYield,
                details: detailsWithCalcs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
                currentShares: financials.currentShares,
                currentTotalCost: financials.totalCost,
                currentAvgCost: financials.avgCost,
                avgDividendPerShare,
            };
        });
    }, [dividends, stocks, searchTerm]);

    const sortedGroups = useMemo(() => {
        return [...groupedDividends].sort((a, b) => {
            const valA = a[sortConfig.key as keyof typeof a];
            const valB = b[sortConfig.key as keyof typeof b];
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }, [groupedDividends, sortConfig]);

    const requestSort = (key: keyof any) => {
        let direction: SortDirection = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const groupSelectionActive = selectedGroups.size > 0;
    const idSelectionActive = selectedIds.size > 0;
    const selectionActive = groupSelectionActive || idSelectionActive;

    const clearSelection = () => {
      clearGroupSelection();
      clearIdSelection();
    }

    return (
        <div className="space-y-6" onClick={(e) => { if(selectionActive) { const target = e.target as HTMLElement; if(!target.closest('.selectable-item, .selection-bar')) { clearSelection(); } } }}>
            <h1 className="text-3xl font-bold hidden md:block">股利紀錄</h1>
            <div className="flex items-center gap-4">
                <div className="flex-grow">
                    <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="搜尋股票代號..."/>
                </div>
                <button onClick={onAdd} className="bg-primary hover:bg-primary-hover text-primary-foreground p-3 rounded-lg flex-shrink-0">
                    <PlusIcon className="h-6 w-6" />
                </button>
            </div>
            {groupSelectionActive && <div onClick={e => e.stopPropagation()} className="selection-bar"><SelectionActionBar count={selectedGroups.size} onCancel={clearGroupSelection} onDelete={deleteSelectedGroups} itemName="組" /></div>}
            {idSelectionActive && <div onClick={e => e.stopPropagation()} className="selection-bar"><SelectionActionBar count={selectedIds.size} onCancel={clearIdSelection} onDelete={deleteSelectedIds} itemName="筆" /></div>}
            
            <div className="hidden md:block bg-light-card dark:bg-dark-card rounded-lg shadow-md">
                <table className="w-full text-left">
                    <thead className="bg-light-bg dark:bg-dark-bg">
                        <tr>
                            <th className="px-6 py-4 w-24"></th>
                            <SortableHeaderCell label="股票代號 / 日期" sortKey="stockSymbol" sortConfig={sortConfig} onRequestSort={requestSort} />
                             <th className="px-6 py-4 font-semibold text-right">參與股數</th>
                             <th className="px-6 py-4 font-semibold text-right">每股股利</th>
                             <th className="px-6 py-4 font-semibold text-right">持有總成本</th>
                            <SortableHeaderCell label="淨股利" sortKey="totalAmount" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
                            <SortableHeaderCell label="殖利率" sortKey="yieldRate" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
                            <SortableHeaderCell label="年化" sortKey="avgAnnualizedYield" sortConfig={sortConfig} onRequestSort={requestSort} isNumeric={true}/>
                            <th className="px-6 py-4 w-20"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedGroups.map(group => (
                            <GroupedDividendRow 
                                key={group.stockSymbol} 
                                group={group} 
                                settings={settings} 
                                onEdit={onEdit} 
                                onDelete={onDelete} 
                                isSelected={selectedGroups.has(group.stockSymbol)} 
                                toggleSelection={toggleGroupSelection}
                                selectedIds={selectedIds}
                                toggleIdSelection={toggleIdSelection}
                            />
                        ))}
                    </tbody>
                </table>
            </div>
             <div className="md:hidden space-y-4">
                {sortedGroups.map(group => (
                    <GroupedDividendCard 
                        key={group.stockSymbol}
                        group={group}
                        settings={settings}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        isSelected={selectedGroups.has(group.stockSymbol)} 
                        toggleSelection={toggleGroupSelection}
                        selectedIds={selectedIds}
                        toggleIdSelection={toggleIdSelection}
                    />
                ))}
            </div>
        </div>
    );
};

// --- Child Components for DividendsPage ---

const DividendRow: React.FC<{dividend: any; avgCost: number; settings: Settings; onEdit: (d: Dividend) => void; onDelete: (d: Dividend) => void; isSelected: boolean; toggleSelection: (id: string) => void;}> = ({ dividend, avgCost, settings, onEdit, onDelete, isSelected, toggleSelection }) => {
    const sharesHeld = dividend.sharesHeld || 0;
    const proportionalCost = sharesHeld * avgCost;
    
    return (
        <tr className={`bg-light-bg/50 dark:bg-dark-bg/50 border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-light-bg dark:hover:bg-dark-bg selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`} onClick={() => toggleSelection(dividend.id)}>
            <td className="px-6 py-4 w-24" onClick={e => e.stopPropagation()}>
                <div className="flex justify-center">
                    <input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(dividend.id)} />
                </div>
            </td>
            <td className="px-6 py-4">{new Date(dividend.date).toLocaleDateString()}</td>
            <td className="px-6 py-4 text-right">{dividend.sharesHeld?.toLocaleString() ?? 'N/A'}</td>
            <td className="px-6 py-4 text-right">{dividend.dividendPerShare?.toFixed(4)}</td>
            <td className="px-6 py-4 text-right">{formatCurrency(proportionalCost, settings.currency)}</td>
            <td className="px-6 py-4 text-right font-semibold text-success">{formatCurrency(dividend.amount, settings.currency)}</td>
            <td className="px-6 py-4 text-right text-success">{dividend.yieldRate.toFixed(2)}%</td>
            <td className="px-6 py-4 text-right text-success">{dividend.annualizedYield.toFixed(2)}%</td>
            <td className="px-6 py-4 text-right" onClick={e => e.stopPropagation()}><ActionMenu onEdit={() => onEdit(dividend)} onDelete={() => onDelete(dividend)} /></td>
        </tr>
    );
};

const GroupedDividendRow: React.FC<{ group: any; settings: Settings; onEdit: (d: Dividend) => void; onDelete: (d: Dividend) => void; isSelected: boolean; toggleSelection: (symbol: string) => void; selectedIds: Set<string>; toggleIdSelection: (id: string) => void; }> = ({ group, settings, onEdit, onDelete, isSelected, toggleSelection, selectedIds, toggleIdSelection }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <>
            <tr className={`border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`} onClick={() => toggleSelection(group.stockSymbol)}>
                <td className="px-6 py-4 w-24">
                    <div className="flex items-center space-x-4">
                        <span onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(group.stockSymbol)} /></span>
                        <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border">{isOpen ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}</button>
                    </div>
                </td>
                <td className="px-6 py-4"><div className="font-bold">{group.stockSymbol}</div><div className="text-sm text-light-text/70 dark:text-dark-text/70">{group.stockName}</div></td>
                <td className="px-6 py-4 text-right">{group.currentShares > 0 ? group.currentShares.toLocaleString() : 'N/A'}</td>
                <td className="px-6 py-4 text-right">{group.avgDividendPerShare.toFixed(4)}</td>
                <td className="px-6 py-4 text-right">{formatCurrency(group.currentTotalCost, settings.currency)}</td>
                <td className="px-6 py-4 text-right font-semibold text-success">{formatCurrency(group.totalAmount, settings.currency)}</td>
                <td className="px-6 py-4 text-right font-semibold text-success">{group.yieldRate.toFixed(2)}%</td>
                <td className="px-6 py-4 text-right font-semibold text-success">{group.avgAnnualizedYield.toFixed(2)}%</td>
                <td className="px-6 py-4 w-20 text-center"></td>
            </tr>
            {isOpen && group.details.map((d: Dividend) => (
                <DividendRow key={d.id} dividend={d} avgCost={group.currentAvgCost} settings={settings} onEdit={onEdit} onDelete={onDelete} isSelected={selectedIds.has(d.id)} toggleSelection={toggleIdSelection} />
            ))}
        </>
    );
};

const GroupedDividendCard: React.FC<{ group: any; settings: Settings; onEdit: (d: Dividend) => void; onDelete: (d: Dividend) => void; isSelected: boolean; toggleSelection: (symbol: string) => void; selectedIds: Set<string>; toggleIdSelection: (id: string) => void; }> = ({ group, settings, onEdit, onDelete, isSelected, toggleSelection, selectedIds, toggleIdSelection }) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`bg-light-card dark:bg-dark-card rounded-lg shadow-md selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-primary' : ''}`}>
             <div className="p-4 flex items-start space-x-4" onClick={() => toggleSelection(group.stockSymbol)}>
                <span className="mt-1" onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(group.stockSymbol)} /></span>
                <div className="flex-grow flex items-start justify-between cursor-pointer" onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}>
                    <div>
                        <div className="font-bold text-lg">{group.stockSymbol}</div>
                        <div className="text-sm text-light-text/70 dark:text-dark-text/70">{group.stockName}</div>
                        <div className="text-xs text-light-text/70 dark:text-dark-text/70 mt-2">參與股數: {group.currentShares.toLocaleString()}</div>
                        <div className="text-xs text-light-text/70 dark:text-dark-text/70">每股股利: {group.avgDividendPerShare.toFixed(4)}</div>
                        <div className="text-xs text-light-text/70 dark:text-dark-text/70">持有總成本: {formatCurrency(group.currentTotalCost, settings.currency)}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-semibold text-success text-lg">{formatCurrency(group.totalAmount, settings.currency)}</div>
                        <div className="text-sm text-success">殖利率: {group.yieldRate.toFixed(2)}%</div>
                        <div className="text-sm text-success">年化: {group.avgAnnualizedYield.toFixed(2)}%</div>
                    </div>
                </div>
                 <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-1 rounded-full hover:bg-light-border dark:hover:bg-dark-border flex-shrink-0 mt-1"><ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} /></button>
            </div>
            {isOpen && (
                <div className="px-4 pb-4 mt-2 border-t border-light-border dark:border-dark-border space-y-2 pt-2">
                    {group.details.map((d: Dividend) => (
                        <DividendCard key={d.id} dividend={d} avgCost={group.currentAvgCost} settings={settings} onEdit={onEdit} onDelete={onDelete} isSelected={selectedIds.has(d.id)} toggleSelection={toggleIdSelection} />
                    ))}
                </div>
            )}
        </div>
    );
};

const DividendCard: React.FC<{dividend: any, avgCost: number, settings: Settings, onEdit: (d: Dividend) => void; onDelete: (d: Dividend) => void; isSelected: boolean; toggleSelection: (id: string) => void;}> = ({ dividend, avgCost, settings, onEdit, onDelete, isSelected, toggleSelection }) => {
    return (
    <div className={`bg-light-bg/50 dark:bg-dark-bg/50 rounded-lg p-3 flex items-center space-x-4 selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`} onClick={() => toggleSelection(dividend.id)}>
        <span onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(dividend.id)} /></span>
        <div className="flex-grow flex justify-between items-center">
            <div>
                <div className="text-sm text-light-text/80 dark:text-dark-text/80">{new Date(dividend.date).toLocaleDateString()}</div>
                 <div className="text-xs text-light-text/60 dark:text-dark-text/60">@{dividend.dividendPerShare?.toFixed(2)} x {dividend.sharesHeld?.toLocaleString()}</div>
            </div>
            <div className="text-right font-semibold text-success">
                <div>{formatCurrency(dividend.amount, settings.currency)}</div>
                <div className="text-sm">({dividend.yieldRate.toFixed(2)}% / 年化 {dividend.annualizedYield.toFixed(2)}%)</div>
            </div>
        </div>
        <div className="flex-shrink-0" onClick={e => e.stopPropagation()}><ActionMenu onEdit={() => onEdit(dividend)} onDelete={() => onDelete(dividend)} /></div>
    </div>
    );
};
