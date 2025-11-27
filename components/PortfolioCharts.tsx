

import React, { useMemo } from 'react';
// FIX: Added AreaChart to the import from recharts to resolve 'Cannot find name' errors.
import { Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Line, ComposedChart, Area, AreaChart, LineChart, PieChart, Pie } from 'recharts';
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

// --- Compound Interest Chart ---
interface CompoundInterestChartData {
    year: number;
    actual?: number;
    estimated: number;
}
interface CompoundInterestChartProps {
    data: CompoundInterestChartData[];
    theme: 'light' | 'dark';
    labelEstimated?: string;
    labelActual?: string;
    hideActual?: boolean;
}
export const CompoundInterestChart: React.FC<CompoundInterestChartProps> = ({ 
    data, 
    theme, 
    labelEstimated = "預估股利收入", 
    labelActual = "實際股利收入",
    hideActual = false
}) => {
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
        <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                    <linearGradient id="colorEstimated" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLOR_PRIMARY} stopOpacity={0.2} />
                        <stop offset="95%" stopColor={COLOR_PRIMARY} stopOpacity={0} />
                    </linearGradient>
                </defs>
                <XAxis dataKey="year" stroke={axisColor} />
                <YAxis 
                    stroke={axisColor} 
                    tickFormatter={(val) => val === 0 ? '' : `${(val / 10000).toFixed(0)}W`} 
                />
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    formatter={(value: number) => formatCurrency(value, 'TWD')}
                />
                <Legend />
                <Area type="monotone" dataKey="estimated" stroke={COLOR_PRIMARY} fillOpacity={1} fill="url(#colorEstimated)" name={labelEstimated} />
                {!hideActual && <Line type="monotone" dataKey="actual" stroke={COLOR_SUCCESS} strokeWidth={3} dot={{ r: 4 }} name={labelActual} />}
            </ComposedChart>
        </ResponsiveContainer>
    );
};

// --- Return Rate Trend Chart ---
interface ReturnTrendChartData {
    date: string; // YYYY-MM
    returnRate: number;
}
interface ReturnTrendChartProps {
    data: ReturnTrendChartData[];
    theme: 'light' | 'dark';
    includeDividends: boolean;
}
export const ReturnTrendChart: React.FC<ReturnTrendChartProps> = ({ data, theme, includeDividends }) => {
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
        <ResponsiveContainer width="100%" height={350}>
            <LineChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false}/>
                <XAxis dataKey="date" stroke={axisColor} />
                <YAxis stroke={axisColor} tickFormatter={(value) => `${value.toFixed(0)}%`}/>
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    formatter={(value: number) => `${value.toFixed(2)}%`}
                />
                <Legend />
                <Line 
                    type="monotone" 
                    dataKey="returnRate" 
                    stroke={includeDividends ? COLOR_SUCCESS : COLOR_DANGER} 
                    strokeWidth={3} 
                    dot={false}
                    name={includeDividends ? "含息報酬率" : "未實現損益率"} 
                />
            </LineChart>
        </ResponsiveContainer>
    );
};

// --- Distribution Pie Chart ---
interface PieChartData {
    name: string;
    value: number;
    [key: string]: any;
}
interface DistributionPieChartProps {
    data: PieChartData[];
    theme: 'light' | 'dark';
}
export const DistributionPieChart: React.FC<DistributionPieChartProps> = ({ data, theme }) => {
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

    // Calculate percentages for custom label
    const total = data.reduce((acc, cur) => acc + cur.value, 0);

    return (
        <ResponsiveContainer width="100%" height={300}>
            <PieChart>
                <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
                        const RADIAN = Math.PI / 180;
                        const radius = outerRadius * 1.2;
                        const x = cx + radius * Math.cos(-midAngle * RADIAN);
                        const y = cy + radius * Math.sin(-midAngle * RADIAN);
                        
                        // FIX: Removed the 5% threshold logic to ensure all labels are shown, even for small slices like '主動型'
                        if (percent <= 0) return null;

                        return (
                          <text x={x} y={y} fill={axisColor} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
                            {`${name} ${(percent * 100).toFixed(1)}%`}
                          </text>
                        );
                    }}
                >
                    {data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                </Pie>
                <Tooltip 
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: theme === 'dark' ? '#D4C3A9' : '#6B6358' }}
                    formatter={(value: number) => formatCurrency(value, 'TWD')}
                />
            </PieChart>
        </ResponsiveContainer>
    );
};
