import React, { useMemo } from 'react';
// FIX: Added AreaChart to the import from recharts to resolve 'Cannot find name' errors.
import { Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart } from 'recharts';
import { Stock, Dividend, Transaction, HistoricalPrice } from '../types';
import { calculateStockFinancials, formatCurrency } from '../utils/calculations';

const COLORS = ['#B08968', '#8F9D8A', '#E0C392', '#C08581', '#AEC5D1', '#B3A6C2'];
const COLOR_SUCCESS = '#8F9D8A';
const COLOR_DANGER = '#C08581';
const COLOR_PRIMARY = '#B08968';
const COLOR_SECONDARY = '#AEC5D1';


// --- Advanced Monthly Dividend Chart ---
interface AdvancedMonthlyDividendChartProps {
    dividends: Dividend[];
    theme: 'light' | 'dark';
}
export const AdvancedMonthlyDividendChart: React.FC<AdvancedMonthlyDividendChartProps> = ({ dividends, theme }) => {
    const chartData = useMemo(() => {
        let cumulative = 0;
        const months = Array.from({ length: 12 }, (_, i) => ({
            name: `${i + 1}月`,
            monthly: 0,
            cumulative: 0,
        }));
        dividends.forEach(d => {
            const monthIndex = new Date(d.date).getMonth();
            months[monthIndex].monthly += d.amount;
        });
        months.forEach(month => {
            cumulative += month.monthly;
            month.cumulative = cumulative;
        });
        return months;
    }, [dividends]);

    if (dividends.length === 0) {
        return <div className="flex items-center justify-center h-full text-light-text/60 dark:text-dark-text/60">本年度無股利資料</div>;
    }

    const axisColor = theme === 'dark' ? '#EAE1D4' : '#6B6358';
    const gridColor = theme === 'dark' ? '#403D39' : '#EBE3D5';
    const tooltipStyle = {
        backgroundColor: theme === 'dark' ? '#403D39' : '#FEFBF6',
        border: '1px solid',
        borderColor: gridColor,
        color: theme === 'dark' ? '#F5F1E9' : '#6B6358',
        borderRadius: '0.5rem',
    };

    return (
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisColor} />
                <YAxis yAxisId="left" stroke={axisColor} tickFormatter={(value) => value.toLocaleString()} />
                <YAxis yAxisId="right" orientation="right" stroke={axisColor} tickFormatter={(value) => value.toLocaleString()} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    formatter={(value: number) => `NT$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
                <Legend />
                <Bar yAxisId="left" dataKey="monthly" fill={COLOR_PRIMARY} name="月股利" />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={COLOR_SECONDARY} strokeWidth={2} name="累計股利" />
            </ComposedChart>
        </ResponsiveContainer>
    );
};


// --- P/L Contribution Bar Chart ---
interface ContributionChartData {
    name: string;
    value: number;
}
interface ProfitLossBarChartProps {
    data: ContributionChartData[];
    theme: 'light' | 'dark';
    unit?: 'currency' | 'percent';
}
export const ProfitLossBarChart: React.FC<ProfitLossBarChartProps> = ({ data, theme, unit = 'currency' }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-light-text/60 dark:text-dark-text/60">無資料可顯示</div>;
    }
    
    const axisColor = theme === 'dark' ? '#EAE1D4' : '#6B6358';
    const gridColor = theme === 'dark' ? '#403D39' : '#EBE3D5';
    const tooltipStyle = {
        backgroundColor: theme === 'dark' ? '#403D39' : '#FEFBF6',
        border: '1px solid',
        borderColor: gridColor,
        color: theme === 'dark' ? '#D4C3A9' : '#6B6358',
        borderRadius: '0.5rem',
    };

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" stroke={axisColor} tickFormatter={(value) => unit === 'percent' ? `${value}%` : value.toLocaleString()} />
                <YAxis type="category" dataKey="name" stroke={axisColor} width={60} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    itemStyle={{ color: theme === 'dark' ? '#D4C3A9' : '#6B6358' }}
                    formatter={(value: number) => unit === 'percent' ? `${value.toFixed(2)}%` : formatCurrency(value, 'TWD')}
                />
                <Bar dataKey="value" name="貢獻度">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.value >= 0 ? COLOR_SUCCESS : COLOR_DANGER} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// --- Yield Contribution Bar Chart ---
export const YieldContributionChart: React.FC<ProfitLossBarChartProps> = ({ data, theme }) => {
    if (!data || data.length === 0) {
        return <div className="flex items-center justify-center h-full text-light-text/60 dark:text-dark-text/60">無資料可顯示</div>;
    }
    
    const axisColor = theme === 'dark' ? '#EAE1D4' : '#6B6358';
    const gridColor = theme === 'dark' ? '#403D39' : '#EBE3D5';
    const tooltipStyle = {
        backgroundColor: theme === 'dark' ? '#403D39' : '#FEFBF6',
        border: '1px solid',
        borderColor: gridColor,
        color: theme === 'dark' ? '#D4C3A9' : '#6B6358',
        borderRadius: '0.5rem',
    };

    return (
        <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" stroke={axisColor} tickFormatter={(value) => `${value.toFixed(2)}%`} domain={[0, 'dataMax']} />
                <YAxis type="category" dataKey="name" stroke={axisColor} width={60} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    itemStyle={{ color: theme === 'dark' ? '#D4C3A9' : '#6B6358' }}
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Bar dataKey="value" name="貢獻度">
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLOR_SUCCESS} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};
