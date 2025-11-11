import React, { useMemo, useState } from 'react';
import type { Stock, Dividend, Donation, BudgetEntry, Settings } from '../types';
import { KpiCard } from '../components/KpiCard';
import { ActionMenu, SelectionActionBar } from '../components/common';
import { PlusIcon, EditIcon, TrashIcon } from '../components/Icons';
import { formatCurrency } from '../utils/calculations';

interface LedgerItem {
  id: string;
  date: string;
  description: string;
  source: 'stock' | 'dividend' | 'donation' | 'manual';
  inflow: number;
  outflow: number;
  balance: number;
  isEditable: boolean;
}

interface BudgetPageProps {
  stocks: Stock[];
  dividends: Dividend[];
  donations: Donation[];
  budgetEntries: BudgetEntry[];
  settings: Settings;
  onAdd: () => void;
  onEdit: (entry: BudgetEntry) => void;
  onDelete: (entry: BudgetEntry) => void;
  selectedIds: Set<string>;
  toggleSelection: (id: string) => void;
  clearSelection: () => void;
  deleteSelected: () => void;
}

export const BudgetPage: React.FC<BudgetPageProps> = ({ stocks, dividends, donations, budgetEntries, settings, onAdd, onEdit, onDelete, selectedIds, toggleSelection, clearSelection, deleteSelected }) => {
  const [filter, setFilter] = useState('all');

  const { ledger, totalInflow, totalOutflow, finalBalance } = useMemo(() => {
    const rawItems: Omit<LedgerItem, 'balance'>[] = [];

    // Process manual budget entries
    budgetEntries.forEach(entry => {
      rawItems.push({
        id: entry.id,
        date: entry.date,
        description: entry.description,
        source: 'manual',
        inflow: entry.type === 'DEPOSIT' ? entry.amount : 0,
        outflow: entry.type === 'WITHDRAWAL' ? entry.amount : 0,
        isEditable: true,
      });
    });

    // Process stock transactions
    stocks.forEach(stock => {
      stock.transactions.forEach(tx => {
        if (tx.type === 'BUY') {
          rawItems.push({
            id: tx.id,
            date: tx.date,
            description: `買入 ${stock.symbol} ${stock.name}`,
            source: 'stock',
            inflow: 0,
            outflow: tx.shares * tx.price + tx.fees,
            isEditable: false,
          });
        } else { // SELL
          rawItems.push({
            id: tx.id,
            date: tx.date,
            description: `賣出 ${stock.symbol} ${stock.name}`,
            source: 'stock',
            inflow: tx.shares * tx.price - tx.fees,
            outflow: 0,
            isEditable: false,
          });
        }
      });
    });

    // Process dividends
    dividends.forEach(dividend => {
      rawItems.push({
        id: dividend.id,
        date: dividend.date,
        description: `股利 ${dividend.stockSymbol}`,
        source: 'dividend',
        inflow: dividend.amount,
        outflow: 0,
        isEditable: false,
      });
    });

    // Process donations
    donations.forEach(donation => {
      rawItems.push({
        id: donation.id,
        date: donation.date,
        description: `奉獻: ${donation.description}`,
        source: 'donation',
        inflow: 0,
        outflow: donation.amount,
        isEditable: false,
      });
    });

    const sortedItems = rawItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let balance = 0;
    const ledger: LedgerItem[] = sortedItems.map(item => {
      balance = balance + item.inflow - item.outflow;
      return { ...item, balance };
    });

    const totalInflow = ledger.reduce((sum, item) => sum + item.inflow, 0);
    const totalOutflow = ledger.reduce((sum, item) => sum + item.outflow, 0);

    return { ledger: ledger.reverse(), totalInflow, totalOutflow, finalBalance: balance };
  }, [stocks, dividends, donations, budgetEntries]);
  
  const filteredLedger = useMemo(() => {
    if (filter === 'all') return ledger;
    return ledger.filter(item => item.source === filter);
  }, [ledger, filter]);

  const selectionActive = selectedIds.size > 0;

  return (
    <div className="space-y-6" onClick={(e) => { if(selectionActive) { const target = e.target as HTMLElement; if(!target.closest('.selectable-item, .selection-bar')) { clearSelection(); } } }}>
      <h1 className="text-3xl font-bold hidden md:block">投資預算</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KpiCard title="總流入" value={formatCurrency(totalInflow, settings.currency)} />
        <KpiCard title="總流出" value={formatCurrency(totalOutflow, settings.currency)} />
        <KpiCard title="目前餘額" value={formatCurrency(finalBalance, settings.currency)} />
      </div>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
         <div className="w-full sm:w-auto flex-shrink-0">
             <button onClick={onAdd} className="w-full bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2">
                <PlusIcon className="h-5 w-5" /> 手動新增
            </button>
         </div>
      </div>
       {selectionActive && <div onClick={e => e.stopPropagation()} className="selection-bar"><SelectionActionBar count={selectedIds.size} onCancel={clearSelection} onDelete={deleteSelected} itemName="筆手動紀錄"/></div>}
      
       <div className="md:hidden space-y-4">{filteredLedger.map(item => <LedgerCard key={`${item.source}-${item.id}`} item={item} settings={settings} onEdit={() => onEdit(budgetEntries.find(e => e.id === item.id)!)} onDelete={() => onDelete(budgetEntries.find(e => e.id === item.id)!)} isSelected={selectedIds.has(item.id)} toggleSelection={toggleSelection}/>)}</div>
       
      <div className="hidden md:block bg-light-card dark:bg-dark-card rounded-lg shadow-md">
        <table className="w-full text-left">
          <thead className="bg-light-bg dark:bg-dark-bg"><tr>
            <th className="px-6 py-4 w-12"></th>
            <th className="px-6 py-4 font-semibold">日期</th>
            <th className="px-6 py-4 font-semibold">說明</th>
            <th className="px-6 py-4 font-semibold text-right">流入 (+)</th>
            <th className="px-6 py-4 font-semibold text-right">流出 (-)</th>
            <th className="px-6 py-4 font-semibold text-right">餘額</th>
            <th className="px-6 py-4 font-semibold text-center w-20">操作</th>
          </tr></thead>
          <tbody>{filteredLedger.map(item => <LedgerRow key={`${item.source}-${item.id}`} item={item} settings={settings} onEdit={() => onEdit(budgetEntries.find(e => e.id === item.id)!)} onDelete={() => onDelete(budgetEntries.find(e => e.id === item.id)!)} isSelected={selectedIds.has(item.id)} toggleSelection={toggleSelection}/>)}</tbody>
        </table>
      </div>
    </div>
  );
};


const LedgerRow: React.FC<{item: LedgerItem, settings: Settings, onEdit: () => void, onDelete: () => void, isSelected: boolean, toggleSelection: (id: string) => void}> = ({ item, settings, onEdit, onDelete, isSelected, toggleSelection }) => (
    <tr onClick={() => item.isEditable && toggleSelection(item.id)} className={`border-b border-light-border dark:border-dark-border last:border-b-0 ${item.isEditable ? 'hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer selectable-item' : ''} ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`}>
        <td className="px-6 py-4" onClick={e => item.isEditable && e.stopPropagation()}>
            {item.isEditable && <input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(item.id)} />}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">{new Date(item.date).toLocaleDateString()}</td>
        <td className="px-6 py-4">{item.description}</td>
        <td className="px-6 py-4 text-right text-success">{item.inflow > 0 ? formatCurrency(item.inflow, settings.currency) : '-'}</td>
        <td className="px-6 py-4 text-right text-danger">{item.outflow > 0 ? formatCurrency(item.outflow, settings.currency) : '-'}</td>
        <td className="px-6 py-4 text-right font-semibold">{formatCurrency(item.balance, settings.currency)}</td>
        <td className="px-6 py-4 text-center" onClick={e => item.isEditable && e.stopPropagation()}>
          {item.isEditable && <ActionMenu onEdit={onEdit} onDelete={onDelete} />}
        </td>
    </tr>
);

const LedgerCard: React.FC<{item: LedgerItem, settings: Settings, onEdit: () => void, onDelete: () => void, isSelected: boolean, toggleSelection: (id: string) => void}> = ({ item, settings, onEdit, onDelete, isSelected, toggleSelection }) => (
    <div onClick={() => item.isEditable && toggleSelection(item.id)} className={`bg-light-card dark:bg-dark-card rounded-lg shadow-md p-4 flex items-start space-x-4 ${item.isEditable ? 'selectable-item' : ''} ${isSelected ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-primary' : ''}`}>
        {item.isEditable && <div className="pt-1" onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(item.id)}/></div>}
        <div className="flex-grow flex flex-col">
            <div className="flex justify-between items-start">
                <div>
                    <div className="font-bold">{item.description}</div>
                    <div className="text-sm text-light-text/70 dark:text-dark-text/70">{new Date(item.date).toLocaleDateString()}</div>
                </div>
                {item.isEditable && <div className="flex-shrink-0" onClick={e => e.stopPropagation()}><ActionMenu onEdit={onEdit} onDelete={onDelete} /></div>}
            </div>
            <div className="border-t border-light-border dark:border-dark-border my-3"></div>
            <div className="flex justify-between items-baseline">
                <div>
                    {item.inflow > 0 && <div className="text-success">流入: {formatCurrency(item.inflow, settings.currency)}</div>}
                    {item.outflow > 0 && <div className="text-danger">流出: {formatCurrency(item.outflow, settings.currency)}</div>}
                </div>
                <div className="text-right">
                    <span className="text-sm text-light-text/70 dark:text-dark-text/70">餘額</span>
                    <div className="font-semibold text-lg">{formatCurrency(item.balance, settings.currency)}</div>
                </div>
            </div>
        </div>
    </div>
);