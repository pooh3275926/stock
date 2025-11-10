import React, { useMemo } from 'react';
import { KpiCard } from '../components/KpiCard';
import { PortfolioDonutChart, DividendBarChart, ProfitLossBarChart, AdvancedMonthlyDividendChart, MonthlyRealizedPnlChart, CumulativeReturnChart } from '../components/PortfolioCharts';
import { Stock, Dividend, Settings, HistoricalPrice } from '../types';
import { calculateStockFinancials, formatCurrency, getLatestHistoricalPrice } from '../utils/calculations';
import { StockFilterDropdown, YearFilterDropdown } from '../components/common';


interface DashboardPageProps {
  stocks: Stock[];
  dividends: Dividend[];
  settings: Settings;
  theme: 'light' | 'dark';
  allStockSymbols: string[];
  filteredSymbols: string[];
  onFilterChange: (selected: string[]) => void;
  availableYears: number[];
  selectedYear: number | 'all';
  onYearChange: (year: number | 'all') => void;
  historicalPrices: HistoricalPrice[];
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ stocks, dividends, settings, theme, allStockSymbols, filteredSymbols, onFilterChange, availableYears, selectedYear, onYearChange, historicalPrices }) => {

  const stocksWithLatestPrice = useMemo(() => {
    return stocks.map(stock => {
      const latestPrice = getLatestHistoricalPrice(stock.symbol, historicalPrices);
      if (latestPrice !== null) {
        return { ...stock, currentPrice: latestPrice };
      }
      return stock;
    });
  }, [stocks, historicalPrices]);

  const { filteredStocks, filteredDividends, yearFilteredStocks } = useMemo(() => {
    const symbolsSet = new Set(filteredSymbols);
    const stocksBySymbol = stocksWithLatestPrice.filter(s => symbolsSet.has(s.symbol));
    const dividendsBySymbol = dividends.filter(d => symbolsSet.has(d.stockSymbol));
    
    if (selectedYear === 'all') {
      return { 
        filteredStocks: stocksBySymbol,
        filteredDividends: dividendsBySymbol,
        yearFilteredStocks: stocksBySymbol 
      };
    }
    
    const yearFilteredDividends = dividendsBySymbol.filter(d => new Date(d.date).getFullYear() === selectedYear);
    
    // For stocks, we need to consider transactions up to the selected year for accurate cost basis,
    // but only transactions *within* the selected year for realized P&L.
    const yearFilteredStocksWithRelevantHistory = stocksBySymbol.map(stock => ({
        ...stock,
        transactions: stock.transactions.filter(t => new Date(t.date).getFullYear() <= selectedYear),
    }));

    // This version is for calculating stats based on what happened *within* the year.
    const stocksWithOnlyYearTransactions = stocksBySymbol.map(stock => ({
        ...stock,
        transactions: stock.transactions.filter(t => new Date(t.date).getFullYear() === selectedYear),
    })).filter(s => s.transactions.length > 0);
    
    return {
      filteredStocks: yearFilteredStocksWithRelevantHistory,
      filteredDividends: yearFilteredDividends,
      yearFilteredStocks: stocksWithOnlyYearTransactions, // For P&L charts for that year
    };
  }, [stocksWithLatestPrice, dividends, filteredSymbols, selectedYear]);

  const stats = useMemo(() => {
    let totalCurrentCost = 0, totalMarketValue = 0;
    
    const allTransactions = filteredStocks.flatMap(s => s.transactions);
    
    const financials = calculateStockFinancials({
        symbol: 'PORTFOLIO',
        name: 'Portfolio',
        currentPrice: 0, 
        transactions: allTransactions
    });

    totalCurrentCost = financials.totalCost;
    totalMarketValue = 0; // Needs to be calculated based on shares held at end of period
    
    const finalShares: { [key: string]: number } = {};
     filteredStocks.forEach(s => {
        const stockFinancials = calculateStockFinancials(s);
        finalShares[s.symbol] = stockFinancials.currentShares;
        totalMarketValue += stockFinancials.marketValue;
    });

    const totalRealizedPnl = yearFilteredStocks.reduce((sum, stock) => sum + calculateStockFinancials(stock).realizedPnl, 0);
    const totalDividends = filteredDividends.reduce((sum, d) => sum + d.amount, 0);
    const unrealizedPnl = totalMarketValue - totalCurrentCost;
    const totalPnl = unrealizedPnl + totalRealizedPnl;
    const totalReturn = totalPnl + totalDividends;
    const totalReturnRate = totalCurrentCost > 0 ? (totalReturn / totalCurrentCost) * 100 : 0;
    const dividendYield = totalCurrentCost > 0 ? (totalDividends / totalCurrentCost) * 100 : 0;
    
    return { totalCost: totalCurrentCost, totalMarketValue, unrealizedPnl, totalRealizedPnl, totalDividends, totalReturn, totalReturnRate, dividendYield };
  }, [filteredStocks, filteredDividends, yearFilteredStocks]);

  const dividendChartData = filteredStocks
    .map(stock => ({
      name: stock.symbol,
      dividends: filteredDividends
        .filter(d => d.stockSymbol === stock.symbol)
        .reduce((sum, d) => sum + d.amount, 0),
    }))
    .filter(item => item.dividends > 0);
  
  const activeStocks = filteredStocks.filter(s => calculateStockFinancials(s).currentShares > 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold hidden md:block">儀表板</h1>
        <div className="flex flex-col sm:flex-row gap-4">
            <YearFilterDropdown
                availableYears={availableYears}
                selectedYear={selectedYear}
                onChange={onYearChange}
            />
            <StockFilterDropdown 
                allSymbols={allStockSymbols}
                selectedSymbols={filteredSymbols}
                onChange={onFilterChange}
            />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <KpiCard title="持有股票市值" value={formatCurrency(stats.totalMarketValue, settings.currency)} />
        <KpiCard title="持有股票成本" value={formatCurrency(stats.totalCost, settings.currency)} />
        <KpiCard title="未實現損益" value={formatCurrency(stats.unrealizedPnl, settings.currency)} change={stats.totalCost > 0 ? (stats.unrealizedPnl / stats.totalCost) * 100 : 0} changeType="PERCENT"/>
        <KpiCard title="已實現損益" value={formatCurrency(stats.totalRealizedPnl, settings.currency)} />
        <KpiCard title="累計股利" value={formatCurrency(stats.totalDividends, settings.currency)} change={stats.dividendYield} changeType="PERCENT"/>
        <KpiCard title="總報酬率" value={formatCurrency(stats.totalReturn, settings.currency)} change={stats.totalReturnRate} changeType="PERCENT"/>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">投資組合分佈</h2>
            <PortfolioDonutChart stocks={activeStocks} theme={theme}/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">未實現損益貢獻</h2>
            <ProfitLossBarChart stocks={activeStocks} theme={theme}/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">累積報酬 vs 成本</h2>
            <CumulativeReturnChart stocks={yearFilteredStocks} theme={theme} historicalPrices={historicalPrices} />
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">月已實現損益</h2>
            <MonthlyRealizedPnlChart stocks={yearFilteredStocks} theme={theme} />
        </div>
      </div>
       <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-center">年度股利收入</h2>
            <AdvancedMonthlyDividendChart dividends={filteredDividends} theme={theme} />
        </div>
    </div>
  );
};