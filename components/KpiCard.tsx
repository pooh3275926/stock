
import React from 'react';
import { ChevronUpIcon, ChevronDownIcon } from './Icons';

interface KpiCardProps {
  title: string;
  value: string;
  change?: number;
  changeType?: 'PERCENT' | 'AMOUNT';
  currencySymbol?: string;
  children?: React.ReactNode;
}

const formatChange = (change: number, changeType: 'PERCENT' | 'AMOUNT' = 'AMOUNT', currencySymbol: string = '$') => {
  const isPositive = change >= 0;
  const sign = isPositive ? '+' : '-';
  const absChange = Math.abs(change);
  
  if (changeType === 'PERCENT') {
    return `${sign}${absChange.toFixed(2)}%`;
  }
  return `${sign}${currencySymbol}${absChange.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, changeType, currencySymbol, children }) => {
  const isPositive = change !== undefined && change >= 0;
  const changeBg = change === undefined ? 'bg-dark-bg/50' : isPositive ? 'bg-success/10' : 'bg-danger/10';
  const changeColor = change === undefined ? 'text-dark-text/60' : isPositive ? 'text-success' : 'text-danger';

  return (
    <div className="bg-dark-card p-8 rounded-[2rem] shadow-xl border border-dark-border flex flex-col justify-between h-full transition-all hover:border-primary/30">
      <div>
        <h3 className="text-lg font-black uppercase tracking-[0.2em] opacity-30 mb-3">{title}</h3>
        <p className="text-3xl font-black text-dark-text tracking-tight">{value}</p>
        {change !== undefined && (
          <div className={`inline-flex items-center mt-4 px-4 py-2 rounded-xl text-lg font-black border ${changeBg} ${changeColor} border-current/10 uppercase tracking-widest`}>
            {isPositive ? <ChevronUpIcon className="h-4 w-4 mr-1" /> : <ChevronDownIcon className="h-4 w-4 mr-1" />}
            <span>{formatChange(change, changeType, currencySymbol)}</span>
          </div>
        )}
      </div>
      {children && <div className="mt-6">{children}</div>}
    </div>
  );
};
