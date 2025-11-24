import React from 'react';
import type { Page } from '../types';
import { HeartIcon, HistoryIcon, PresentationChartLineIcon, SettingsIcon, BudgetIcon } from '../components/Icons';

interface MorePageProps {
  setPage: (page: Page) => void;
}

const moreNavItems = [
    { id: 'DONATION_FUND', icon: HeartIcon, label: '奉獻基金' }, 
    { id: 'TRANSACTION_HISTORY', icon: HistoryIcon, label: '賣出紀錄' }, 
    { id: 'BUDGET', icon: BudgetIcon, label: '投資預算' },
    { id: 'HISTORICAL_PRICES', icon: PresentationChartLineIcon, label: '歷史股價' }, 
    { id: 'SETTINGS', icon: SettingsIcon, label: '資料設定' }
];

export const MorePage: React.FC<MorePageProps> = ({ setPage }) => {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold hidden md:block">更多功能</h1>
      <div className="bg-light-card dark:bg-dark-card p-4 rounded-lg shadow-md">
        <ul className="space-y-2">
            {moreNavItems.map(item => (
                 <li key={item.id}>
                    <button 
                        onClick={() => setPage(item.id as Page)} 
                        className="w-full flex items-center p-4 rounded-lg transition-colors hover:bg-light-bg dark:hover:bg-dark-bg"
                    >
                        <item.icon className="h-6 w-6 text-primary" /> 
                        <span className="ml-4 font-medium text-lg">{item.label}</span>
                    </button>
                </li>
            ))}
        </ul>
      </div>
    </div>
  );
};