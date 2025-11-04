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
    <div className="space-y-6" onClick={(e) => { if(selectionActive) { const target = e.target as HTMLElement; if(!target.closest('.selectable-item, .selection-bar')) { clearSelection(); } } }}>
        <h1 className="text-3xl font-bold hidden md:block">奉獻基金</h1>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <KpiCard title="提撥總額 (收益10%)" value={formatCurrency(allotment, settings.currency)} />
            <KpiCard title="已奉獻金額" value={formatCurrency(totalDonated, settings.currency)} />
            <KpiCard title="基金餘額" value={formatCurrency(balance, settings.currency)} />
        </div>
        <div className="flex items-center justify-end gap-4">
            <button onClick={onAdd} className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                <PlusIcon className="h-5 w-5" /> 新增奉獻
            </button>
        </div>
        {selectionActive && <div onClick={e => e.stopPropagation()} className="selection-bar"><SelectionActionBar count={selectedIds.size} onCancel={clearSelection} onDelete={deleteSelected} /></div>}
        
        <div className="md:hidden space-y-4">{sortedDonations.map(d => <DonationCard key={d.id} donation={d} settings={settings} onEdit={onEdit} onDelete={onDelete} isSelected={selectedIds.has(d.id)} toggleSelection={toggleSelection} />)}</div>
        
        <div className="hidden md:block bg-light-card dark:bg-dark-card rounded-lg shadow-md">
            <table className="w-full text-left">
                <thead className="bg-light-bg dark:bg-dark-bg"><tr><th className="px-6 py-4 w-12"></th><th className="px-6 py-4 font-semibold">日期</th><th className="px-6 py-4 font-semibold">說明</th><th className="px-6 py-4 font-semibold text-right">金額</th><th className="px-6 py-4 font-semibold text-center w-20">操作</th></tr></thead>
                <tbody>{sortedDonations.map(d => <DonationRow key={d.id} donation={d} settings={settings} onEdit={onEdit} onDelete={onDelete} isSelected={selectedIds.has(d.id)} toggleSelection={toggleSelection} />)}</tbody>
            </table>
        </div>
    </div>
    );
};

// --- Child Components ---

const DonationRow: React.FC<{donation: Donation; settings: Settings; onEdit: (d: Donation) => void; onDelete: (d: Donation) => void; isSelected: boolean; toggleSelection: (id: string) => void;}> = ({ donation, settings, onEdit, onDelete, isSelected, toggleSelection }) => (
    <tr onClick={() => toggleSelection(donation.id)} className={`border-b border-light-border dark:border-dark-border last:border-b-0 hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20' : ''}`}>
        <td className="px-6 py-4" onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(donation.id)} /></td>
        <td className="px-6 py-4">{new Date(donation.date).toLocaleDateString()}</td>
        <td className="px-6 py-4">{donation.description}</td>
        <td className="px-6 py-4 text-right">{formatCurrency(donation.amount, settings.currency)}</td>
        <td className="px-6 py-4 text-center" onClick={e => e.stopPropagation()}><ActionMenu onEdit={() => onEdit(donation)} onDelete={() => onDelete(donation)} /></td>
    </tr>
);

const DonationCard: React.FC<{donation: Donation, settings: Settings, onEdit: (d: Donation) => void; onDelete: (d: Donation) => void; isSelected: boolean; toggleSelection: (id: string) => void;}> = ({ donation, settings, onEdit, onDelete, isSelected, toggleSelection }) => (
    <div className={`bg-light-card dark:bg-dark-card rounded-lg shadow-md p-4 flex items-center space-x-4 selectable-item ${isSelected ? 'bg-primary/10 dark:bg-primary/20 ring-2 ring-primary' : ''}`} onClick={() => toggleSelection(donation.id)}>
        <div onClick={e => e.stopPropagation()}><input type="checkbox" className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary" checked={isSelected} onChange={() => toggleSelection(donation.id)}/></div>
        <div className="flex-grow flex justify-between items-center">
            <div><div className="font-bold">{donation.description}</div><div className="text-sm text-light-text/70 dark:text-dark-text/70">{new Date(donation.date).toLocaleDateString()}</div></div>
            <div className="font-semibold text-lg">{formatCurrency(donation.amount, settings.currency)}</div>
        </div>
        <div className="flex-shrink-0" onClick={e => e.stopPropagation()}><ActionMenu onEdit={() => onEdit(donation)} onDelete={() => onDelete(donation)} /></div>
    </div>
);