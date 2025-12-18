
import React, { useMemo, useState } from 'react';
import type { Stock, Dividend, Donation, BudgetEntry, Settings } from '../types';
import { KpiCard } from '../components/KpiCard';
import { ActionMenu, SelectionActionBar } from '../components/common';
import { PlusIcon, BudgetIcon } from '../components/Icons';
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

export const BudgetPage: React.FC<any> = ({ stocks, dividends, donations, budgetEntries, settings, onAdd, onEdit, onDelete, selectedIds, toggleSelection, clearSelection, deleteSelected }) => {
  const { ledger, totalInflow, totalOutflow, finalBalance } = useMemo(() => {
    const rawItems: any[] = [];
    budgetEntries.forEach((entry:any) => rawItems.push({ id: entry.id, date: entry.date, description: entry.description, source: 'manual', inflow: entry.type === 'DEPOSIT' ? entry.amount : 0, outflow: entry.type === 'WITHDRAWAL' ? entry.amount : 0, isEditable: true }));
    stocks.forEach((stock:any) => stock.transactions.forEach((tx:any) => rawItems.push({ id: tx.id, date: tx.date, description: `${tx.type === 'BUY' ? '買入' : '賣出'} ${stock.symbol} ${stock.name}`, source: 'stock', inflow: tx.type === 'SELL' ? tx.shares * tx.price - tx.fees : 0, outflow: tx.type === 'BUY' ? tx.shares * tx.price + tx.fees : 0, isEditable: false })));
    dividends.forEach((dividend:any) => rawItems.push({ id: dividend.id, date: dividend.date, description: `領取股利: ${dividend.stockSymbol}`, source: 'dividend', inflow: dividend.amount, outflow: 0, isEditable: false }));
    donations.forEach((donation:any) => rawItems.push({ id: donation.id, date: donation.date, description: `奉獻支出: ${donation.description}`, source: 'donation', inflow: 0, outflow: donation.amount, isEditable: false }));
    
    const sorted = rawItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let balance = 0;
    const ledger = sorted.map(item => { balance += (item.inflow - item.outflow); return { ...item, balance }; }).reverse();
    return { ledger, totalInflow: rawItems.reduce((s,i) => s+i.inflow,0), totalOutflow: rawItems.reduce((s,i) => s+i.outflow,0), finalBalance: balance };
  }, [stocks, dividends, donations, budgetEntries]);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div><h1 className="text-2xl font-black tracking-tight uppercase">現金流帳本</h1><p className="text-lg opacity-40 font-bold mt-1 tracking-widest uppercase">Budget & Cash Ledger</p></div>
        <button onClick={onAdd} className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all"><PlusIcon className="h-6 w-6" /> 手動存提記錄</button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <KpiCard title="累計資金流入" value={formatCurrency(totalInflow, settings.currency)} />
        <KpiCard title="累計資金流出" value={formatCurrency(totalOutflow, settings.currency)} />
        <KpiCard title="當前總帳餘額" value={formatCurrency(finalBalance, settings.currency)} />
      </div>

      {selectedIds.size > 0 && <SelectionActionBar count={selectedIds.size} onCancel={clearSelection} onDelete={deleteSelected} itemName="筆手動紀錄"/>}

      <div className="grid grid-cols-1 gap-6">
        {ledger.map((item: LedgerItem) => (
            <div key={`${item.source}-${item.id}`} onClick={() => item.isEditable && toggleSelection(item.id)} className={`bg-dark-card rounded-[2rem] p-6 border transition-all ${item.isEditable ? 'cursor-pointer hover:border-primary/40' : 'opacity-80'} ${selectedIds.has(item.id) ? 'border-primary ring-4 ring-primary/10' : 'border-dark-border'}`}>
                <div className="flex flex-col md:flex-row justify-between gap-6">
                    <div className="flex items-start gap-4">
                        {item.isEditable && <div className="p-1 bg-dark-bg/50 rounded-lg" onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-dark-card border-dark-border rounded" checked={selectedIds.has(item.id)} onChange={() => toggleSelection(item.id)}/></div>}
                        <div><div className="text-xl font-black">{item.description}</div><div className="text-sm opacity-40 font-bold mt-1 tracking-widest uppercase font-black">{new Date(item.date).toLocaleDateString()} • {item.source}</div></div>
                    </div>
                    <div className="flex flex-wrap items-center gap-10 md:justify-end text-lg font-bold">
                        {item.inflow > 0 && <div className="text-right"><div className="text-sm font-black opacity-30 uppercase mb-1">流入</div><div className="text-xl font-black text-success">+{formatCurrency(item.inflow, settings.currency)}</div></div>}
                        {item.outflow > 0 && <div className="text-right"><div className="text-sm font-black opacity-30 uppercase mb-1">流出</div><div className="text-xl font-black text-danger">-{formatCurrency(item.outflow, settings.currency)}</div></div>}
                        <div className="text-right border-l border-dark-border pl-10"><div className="text-sm font-black opacity-30 uppercase mb-1">結餘</div><div className="text-xl font-black opacity-60">{formatCurrency(item.balance, settings.currency)}</div></div>
                        {item.isEditable && <div onClick={e => e.stopPropagation()}><ActionMenu onEdit={() => onEdit(budgetEntries.find((e:any) => e.id === item.id))} onDelete={() => onDelete(budgetEntries.find((e:any) => e.id === item.id))} /></div>}
                    </div>
                </div>
            </div>
        ))}
      </div>
    </div>
  );
};
