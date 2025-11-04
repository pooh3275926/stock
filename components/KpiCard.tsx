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
  return `${sign}${currencySymbol}${absChange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const KpiCard: React.FC<KpiCardProps> = ({ title, value, change, changeType, currencySymbol, children }) => {
  const isPositive = change !== undefined && change >= 0;
  const changeColor = change === undefined ? 'text-light-text dark:text-dark-text' : isPositive ? 'text-success' : 'text-danger';

  return (
    <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md flex flex-col justify-between h-full">
      <div>
        <h3 className="text-sm sm:text-base font-medium text-light-text/80 dark:text-dark-text/80">{title}</h3>
        <p className="text-2xl sm:text-3xl font-bold mt-1 text-light-text dark:text-dark-text">{value}</p>
        {change !== undefined && (
          <div className={`flex items-center mt-2 text-sm font-semibold ${changeColor}`}>
            {isPositive ? <ChevronUpIcon className="h-5 w-5" /> : <ChevronDownIcon className="h-5 w-5" />}
            <span>{formatChange(change, changeType, currencySymbol)}</span>
          </div>
        )}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
};