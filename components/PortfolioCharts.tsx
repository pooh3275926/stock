import React, { useMemo } from 'react';
// FIX: Added AreaChart to the import from recharts to resolve 'Cannot find name' errors.
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, ComposedChart, Area, AreaChart } from 'recharts';
import { Stock, Dividend, Transaction, HistoricalPrice } from '../types';
import { calculateStockFinancials } from '../utils/calculations';

const COLORS = ['#B08968', '#8F9D8A', '#E0C392', '#C08581', '#AEC5D1', '#B3A6C2'];
const COLOR_SUCCESS = '#8F9D8A';
const COLOR_DANGER = '#C08581';
const COLOR_PRIMARY = '#B08968';
const COLOR_SECONDARY = '#AEC5D1';

// --- Portfolio Donut Chart ---
interface PortfolioDonutChartProps {
  stocks: Stock[];
  theme: 'light' | 'dark';
}

export const PortfolioDonutChart: React.FC<PortfolioDonutChartProps> = ({ stocks, theme }) => {
  const chartData = stocks.map(stock => {
    const marketValue = stock.transactions
      .filter(t => t.type === 'BUY')
      .reduce((sum, t) => sum + t.shares, 0) * stock.currentPrice;
    return { name: stock.symbol, value: marketValue };
  }).filter(d => d.value > 0);

  if (chartData.length === 0) {
    return <div className="flex items-center justify-center h-full text-light-text/60 dark:text-dark-text/60">無資料可顯示</div>;
  }
  
  const tooltipStyle = {
      backgroundColor: theme === 'dark' ? '#403D39' : '#FEFBF6',
      border: `1px solid ${theme === 'dark' ? '#55514C' : '#EBE3D5'}`,
      color: theme === 'dark' ? '#D4C3A9' : '#6B6358',
      borderRadius: '0.5rem',
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          fill="#8884d8"
          paddingAngle={5}
          dataKey="value"
          // FIX: Explicitly cast `percent` to a number before performing arithmetic to prevent type errors.
          label={({ name, percent }) => `${name} ${(Number(percent || 0) * 100).toFixed(0)}%`}
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} itemStyle={{ color: theme === 'dark' ? '#D4C3A9' : '#6B6358' }} formatter={(value: number) => `NT$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};

// --- Dividend Bar Chart ---
interface DividendData {
    name: string;
    dividends: number;
}

interface DividendBarChartProps {
  data: DividendData[];
  theme: 'light' | 'dark';
}

export const DividendBarChart: React.FC<DividendBarChartProps> = ({ data, theme }) => {
    if (data.length === 0) {
      return <div className="flex items-center justify-center h-full text-light-text/60 dark:text-dark-text/60">無股利資料</div>;
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
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisColor} />
                <YAxis stroke={axisColor} tickFormatter={(value) => value.toLocaleString()} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    formatter={(value: number) => `NT$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
                <Legend />
                <Bar dataKey="dividends" fill={COLORS[1]} />
            </BarChart>
        </ResponsiveContainer>
    );
};

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
interface ProfitLossBarChartProps {
    stocks: Stock[];
    theme: 'light' | 'dark';
}
export const ProfitLossBarChart: React.FC<ProfitLossBarChartProps> = ({ stocks, theme }) => {
    const chartData = useMemo(() => {
        return stocks
            .map(stock => {
                const { unrealizedPnl } = calculateStockFinancials(stock);
                return { name: stock.symbol, pnl: unrealizedPnl };
            })
            .filter(d => d.pnl !== 0)
            .sort((a, b) => b.pnl - a.pnl);
    }, [stocks]);

    if (chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-light-text/60 dark:text-dark-text/60">無未實現損益資料</div>;
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
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis type="number" stroke={axisColor} tickFormatter={(value) => value.toLocaleString()} />
                <YAxis type="category" dataKey="name" stroke={axisColor} width={60} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    itemStyle={{ color: theme === 'dark' ? '#D4C3A9' : '#6B6358' }}
                    formatter={(value: number) => `NT$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
                <Bar dataKey="pnl" name="未實現損益">
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? COLOR_SUCCESS : COLOR_DANGER} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// --- Monthly Realized P&L Chart ---
interface MonthlyRealizedPnlChartProps {
    stocks: Stock[];
    theme: 'light' | 'dark';
}
export const MonthlyRealizedPnlChart: React.FC<MonthlyRealizedPnlChartProps> = ({ stocks, theme }) => {
    const monthlyData = useMemo(() => {
        const months = Array.from({ length: 12 }, (_, i) => ({
            name: `${i + 1}月`,
            pnl: 0,
        }));
        stocks.forEach(stock => {
            const { sellDetails } = calculateStockFinancials(stock);
            sellDetails.forEach(detail => {
                const monthIndex = new Date(detail.transaction.date).getMonth();
                months[monthIndex].pnl += detail.realizedPnl;
            });
        });
        return months.filter(m => m.pnl !== 0);
    }, [stocks]);
    
    if (monthlyData.length === 0) {
        return <div className="flex items-center justify-center h-full text-light-text/60 dark:text-dark-text/60">本年度無已實現損益</div>;
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
        <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisColor} />
                <YAxis stroke={axisColor} tickFormatter={(value) => value.toLocaleString()} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    itemStyle={{ color: theme === 'dark' ? '#D4C3A9' : '#6B6358' }}
                    formatter={(value: number) => `NT$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
                <Bar dataKey="pnl" name="已實現損益">
                    {monthlyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.pnl >= 0 ? COLOR_SUCCESS : COLOR_DANGER} />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
};

// --- Cumulative Return Chart ---
interface CumulativeReturnChartProps {
    stocks: Stock[];
    theme: 'light' | 'dark';
    historicalPrices?: HistoricalPrice[];
}
export const CumulativeReturnChart: React.FC<CumulativeReturnChartProps> = ({ stocks, theme, historicalPrices }) => {
    const chartData = useMemo(() => {
        const historicalPricesMap = new Map(historicalPrices?.map(hp => [hp.stockSymbol, hp.prices]));
        const dataByMonth: { [key: string]: { cost: number; value: number } } = {};
        const allTransactions: (Transaction & { symbol: string, currentPrice: number })[] = [];
        stocks.forEach(s => {
            s.transactions.forEach(t => {
                allTransactions.push({ ...t, symbol: s.symbol, currentPrice: s.currentPrice });
            });
        });
        allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (allTransactions.length === 0) return [];
        
        const firstMonth = new Date(allTransactions[0].date).getMonth();
        const firstYear = new Date(allTransactions[0].date).getFullYear();

        for (let i = 0; i < 12; i++) {
            const monthIndex = (firstMonth + i) % 12;
            const year = firstYear + Math.floor((firstMonth + i) / 12);
            const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
            const endOfMonth = new Date(year, monthIndex + 1, 0);

            const relevantTransactions = allTransactions.filter(t => new Date(t.date) <= endOfMonth);
            const portfolio: { [symbol: string]: { shares: number; cost: number; currentPrice: number } } = {};
            
            relevantTransactions.forEach(t => {
                if (!portfolio[t.symbol]) {
                    portfolio[t.symbol] = { shares: 0, cost: 0, currentPrice: t.currentPrice };
                }
                if (t.type === 'BUY') {
                    portfolio[t.symbol].shares += t.shares;
                    portfolio[t.symbol].cost += t.shares * t.price + t.fees;
                } else {
                    const costPerShare = portfolio[t.symbol].cost / portfolio[t.symbol].shares;
                    portfolio[t.symbol].cost -= t.shares * costPerShare;
                    portfolio[t.symbol].shares -= t.shares;
                }
            });

            let totalCost = 0;
            let totalValue = 0;
            Object.entries(portfolio).forEach(([symbol, stock]) => {
                totalCost += stock.cost;
                const priceForMonth = historicalPricesMap.get(symbol)?.[monthKey];
                const priceToUse = typeof priceForMonth === 'number' ? priceForMonth : stock.currentPrice;
                totalValue += stock.shares * priceToUse;
            });

            dataByMonth[monthKey] = { cost: totalCost, value: totalValue };
        }
        
        return Object.entries(dataByMonth).map(([key, value]) => ({
            name: `${parseInt(key.split('-')[1])}月`,
            ...value,
        }));
    }, [stocks, historicalPrices]);

    if (chartData.length === 0) {
        return <div className="flex items-center justify-center h-full text-light-text/60 dark:text-dark-text/60">無歷史交易資料可供分析</div>;
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
        <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLOR_SUCCESS} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLOR_SUCCESS} stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={COLOR_DANGER} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={COLOR_DANGER} stopOpacity={0}/>
                    </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="name" stroke={axisColor} />
                <YAxis stroke={axisColor} tickFormatter={(value) => value.toLocaleString()} />
                <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={{ color: theme === 'dark' ? '#F5F1E9' : '#6B6358' }}
                    formatter={(value: number) => `NT$${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                />
                <Legend />
                <Area type="monotone" dataKey="value" name="市值" stroke={COLOR_SUCCESS} fillOpacity={1} fill="url(#colorValue)" />
                <Area type="monotone" dataKey="cost" name="成本" stroke={COLOR_DANGER} fillOpacity={1} fill="url(#colorCost)" />
            </AreaChart>
        </ResponsiveContainer>
    );
};