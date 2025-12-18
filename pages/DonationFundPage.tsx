
import React from 'react';
import { KpiCard } from '../components/KpiCard';
import { ActionMenu, SelectionActionBar } from '../components/common';
import { PlusIcon } from '../components/Icons';
import type { Donation, Settings } from '../types';
import { formatCurrency } from '../utils/calculations';

interface DonationFundPageProps {
    stats: any;
    donations: Donation[];
    settings: Settings;
    onAdd: () => void;
    onEdit: (d: Donation) => void;
    onDelete: (d: Donation) => void;
    selectedIds: Set<string>;
    toggleSelection: (id: string) => void;
    clearSelection: () => void;
    deleteSelected: () => void;
}

export const DonationFundPage: React.FC<DonationFundPageProps> = ({ stats, donations, settings, onAdd, onEdit, onDelete, selectedIds, toggleSelection, clearSelection, deleteSelected }) => {
    const sortedDonations = [...donations].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const selectionActive = selectedIds.size > 0;

    const allotment = (stats.totalDividends + stats.totalRealizedPnl) * 0.1;
    const totalDonated = donations.reduce((sum, d) => sum + d.amount, 0);
    const balance = allotment - totalDonated;

    return (
    <div className="space-y-10 pb-20">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div><h1 className="text-2xl font-black tracking-tight uppercase">奉獻基金管理</h1><p className="text-lg opacity-40 font-bold mt-1 tracking-widest uppercase">Giving & Impact Fund</p></div>
            <button onClick={onAdd} className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3 shadow-xl shadow-primary/20 transition-all"><PlusIcon className="h-6 w-6" /> 新增奉獻支出</button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <KpiCard title="基金存量 (收益10%)" value={formatCurrency(allotment, settings.currency)} />
            <KpiCard title="累計已奉獻" value={formatCurrency(totalDonated, settings.currency)} />
            <KpiCard title="目前基金餘額" value={formatCurrency(balance, settings.currency)} />
        </div>

        {selectionActive && <SelectionActionBar count={selectedIds.size} onCancel={clearSelection} onDelete={deleteSelected} />}
        
        <div className="bg-dark-card rounded-[2rem] border border-dark-border shadow-xl overflow-hidden">
            <table className="w-full text-left text-lg font-bold">
                <thead className="bg-dark-bg/50 opacity-40 uppercase tracking-widest font-black">
                    <tr>
                        <th className="px-8 py-4 w-12 text-center"></th>
                        <th className="px-8 py-4">日期</th>
                        <th className="px-8 py-4">用途說明</th>
                        <th className="px-8 py-4 text-right">金額</th>
                        <th className="px-8 py-4 text-center w-24">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-dark-border">
                    {sortedDonations.map(d => (
                        <tr key={d.id} onClick={() => toggleSelection(d.id)} className={`hover:bg-primary/5 transition-colors cursor-pointer ${selectedIds.has(d.id) ? 'bg-primary/10' : ''}`}>
                            <td className="px-8 py-5 text-center" onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-dark-bg border-dark-border rounded focus:ring-primary" checked={selectedIds.has(d.id)} onChange={() => toggleSelection(d.id)} /></td>
                            <td className="px-8 py-5 font-black">{new Date(d.date).toLocaleDateString()}</td>
                            <td className="px-8 py-5">{d.description}</td>
                            <td className="px-8 py-5 text-right font-black text-success">{formatCurrency(d.amount, settings.currency)}</td>
                            <td className="px-8 py-5 text-center" onClick={e => e.stopPropagation()}><ActionMenu onEdit={() => onEdit(d)} onDelete={() => onDelete(d)} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
    );
};
