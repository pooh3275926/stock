import React, { useMemo } from 'react';
import { KpiCard } from '../components/KpiCard';
import { ProfitLossBarChart, AdvancedMonthlyDividendChart, YieldContributionChart } from '../components/PortfolioCharts';
import { Stock, Dividend, Settings, HistoricalPrice } from '../types';
import { calculateStockFinancials, formatCurrency, getLatestHistoricalPrice, getHistoricalPriceAsOf } from '../utils/calculations';
import { StockFilterDropdown, YearFilterDropdown } from '../components/common';
import { stockDividendFrequency } from '../utils/data';


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

  const dashboardData = useMemo(() => {
    const symbolsSet = new Set(filteredSymbols);
    const relevantStocksBase = stocks.filter(s => symbolsSet.has(s.symbol));
    const relevantDividendsBase = dividends.filter(d => symbolsSet.has(d.stockSymbol));

    let activeStocksForCharts: Stock[];
    let dividendsForChart: Dividend[];
    let totalMarketValue, totalCurrentCost, totalRealizedPnl, unrealizedPnl, totalDividends;

    if (selectedYear === 'all') {
      const relevantStocks = relevantStocksBase.map(stock => {
        const latestPrice = getLatestHistoricalPrice(stock.symbol, historicalPrices);
        return { ...stock, currentPrice: latestPrice !== null ? latestPrice : stock.currentPrice };
      });

      activeStocksForCharts = [];
      totalMarketValue = 0;
      totalCurrentCost = 0;
      totalRealizedPnl = 0;

      for (const stock of relevantStocks) {
        const financials = calculateStockFinancials(stock);
        if (financials.currentShares > 0) {
          totalMarketValue += financials.marketValue;
          totalCurrentCost += financials.totalCost;
          activeStocksForCharts.push(stock);
        }
        totalRealizedPnl += financials.realizedPnl;
      }
      
      unrealizedPnl = totalMarketValue - totalCurrentCost;
      dividendsForChart = relevantDividendsBase;
      totalDividends = dividendsForChart.reduce((sum, d) => sum + d.amount, 0);

    } else {
      const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
      if (new Date().getFullYear() === selectedYear) {
          const now = new Date();
          if (now < endDate) endDate.setTime(now.getTime());
      }
    
      totalMarketValue = 0;
      totalCurrentCost = 0;
      totalRealizedPnl = 0;
      activeStocksForCharts = [];

      for (const stock of relevantStocksBase) {
        const priceForYear = getHistoricalPriceAsOf(stock.symbol, selectedYear, 12, historicalPrices);
        const stockForHoldingsCalc = {
          ...stock,
          currentPrice: priceForYear !== null ? priceForYear : stock.currentPrice,
          transactions: stock.transactions.filter(t => new Date(t.date) <= endDate),
        };

        if (stockForHoldingsCalc.transactions.length > 0) {
          const financials = calculateStockFinancials(stockForHoldingsCalc);
          if (financials.currentShares > 0) {
            totalMarketValue += financials.marketValue;
            totalCurrentCost += financials.totalCost;
            activeStocksForCharts.push(stockForHoldingsCalc);
          }
        }
        
        const fullHistoryFinancials = calculateStockFinancials(stock);
        const sellsInYear = fullHistoryFinancials.sellDetails.filter(d => new Date(d.transaction.date).getFullYear() === selectedYear);
        totalRealizedPnl += sellsInYear.reduce((sum, d) => sum + d.realizedPnl, 0);
      }
    
      unrealizedPnl = totalMarketValue - totalCurrentCost;
      dividendsForChart = relevantDividendsBase.filter(d => new Date(d.date).getFullYear() === selectedYear);
      totalDividends = dividendsForChart.reduce((sum, d) => sum + d.amount, 0);
    }
    
    // --- Common Calculations for KPIs and Charts ---
    const totalReturn = unrealizedPnl + totalRealizedPnl + totalDividends;
    const totalReturnRate = totalCurrentCost > 0 ? (totalReturn / totalCurrentCost) * 100 : 0;
    const dividendYield = totalCurrentCost > 0 ? (totalDividends / totalCurrentCost) * 100 : 0;

    const contributionData = activeStocksForCharts.map(stock => {
        const financials = calculateStockFinancials(stock);
        const stockDividendsInPeriod = dividendsForChart.filter(d => d.stockSymbol === stock.symbol);
        const totalDividendsForStock = stockDividendsInPeriod.reduce((sum, d) => sum + d.amount, 0);
        
        const totalReturnWithDividends = financials.unrealizedPnl + totalDividendsForStock;

        const annualizedYields = stockDividendsInPeriod.map(d => {
            const sharesHeld = d.sharesHeld || 0;
            if (sharesHeld === 0 || financials.avgCost === 0) return 0;
            const proportionalCost = sharesHeld * financials.avgCost;
            if (proportionalCost === 0) return 0;
            const individualYieldRate = (d.amount / proportionalCost) * 100;
            const frequency = stockDividendFrequency[stock.symbol] || 1;
            return individualYieldRate * frequency;
        });
        const avgAnnualizedYield = annualizedYields.length > 0
            ? annualizedYields.reduce((sum, y) => sum + y, 0) / annualizedYields.length
            : 0;

        return {
            symbol: stock.symbol,
            unrealizedPnl: financials.unrealizedPnl,
            totalReturnWithDividends,
            avgAnnualizedYield,
        };
    });

    const topPnl = [...contributionData].sort((a, b) => b.unrealizedPnl - a.unrealizedPnl).slice(0, 3).map(d => ({ name: d.symbol, value: d.unrealizedPnl }));
    const bottomPnl = [...contributionData].sort((a, b) => a.unrealizedPnl - b.unrealizedPnl).slice(0, 3).map(d => ({ name: d.symbol, value: d.unrealizedPnl }));
    
    const topTotalReturn = [...contributionData].sort((a, b) => b.totalReturnWithDividends - a.totalReturnWithDividends).slice(0, 3).map(d => ({ name: d.symbol, value: d.totalReturnWithDividends }));
    const bottomTotalReturn = [...contributionData].sort((a, b) => a.totalReturnWithDividends - b.totalReturnWithDividends).slice(0, 3).map(d => ({ name: d.symbol, value: d.totalReturnWithDividends }));

    const topYield = [...contributionData].sort((a, b) => b.avgAnnualizedYield - a.avgAnnualizedYield).slice(0, 3).map(d => ({ name: d.symbol, value: d.avgAnnualizedYield }));
    const bottomYield = [...contributionData].filter(d => d.avgAnnualizedYield > 0).sort((a, b) => a.avgAnnualizedYield - b.avgAnnualizedYield).slice(0, 3).map(d => ({ name: d.symbol, value: d.avgAnnualizedYield }));

    return {
      stats: { totalMarketValue, totalCost: totalCurrentCost, unrealizedPnl, totalRealizedPnl, totalDividends, totalReturn, totalReturnRate, dividendYield },
      dividendsForChart,
      topPnl, bottomPnl,
      topTotalReturn, bottomTotalReturn,
      topYield, bottomYield,
    };
  }, [stocks, dividends, filteredSymbols, selectedYear, historicalPrices]);

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
        <KpiCard title="持有股票市值" value={formatCurrency(dashboardData.stats.totalMarketValue, settings.currency)} />
        <KpiCard title="持有股票成本" value={formatCurrency(dashboardData.stats.totalCost, settings.currency)} />
        <KpiCard title="未實現損益" value={formatCurrency(dashboardData.stats.unrealizedPnl, settings.currency)} change={dashboardData.stats.totalCost > 0 ? (dashboardData.stats.unrealizedPnl / dashboardData.stats.totalCost) * 100 : 0} changeType="PERCENT"/>
        <KpiCard title="已實現損益" value={formatCurrency(dashboardData.stats.totalRealizedPnl, settings.currency)} />
        <KpiCard title="累計股利" value={formatCurrency(dashboardData.stats.totalDividends, settings.currency)} change={dashboardData.stats.dividendYield} changeType="PERCENT"/>
        <KpiCard title="總報酬率" value={formatCurrency(dashboardData.stats.totalReturn, settings.currency)} change={dashboardData.stats.totalReturnRate} changeType="PERCENT"/>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最佳未實現損益貢獻 Top 3</h2>
            <ProfitLossBarChart data={dashboardData.topPnl} theme={theme}/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最差未實現損益貢獻 Top 3</h2>
            <ProfitLossBarChart data={dashboardData.bottomPnl} theme={theme}/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最佳含息總報酬貢獻 Top 3</h2>
            <ProfitLossBarChart data={dashboardData.topTotalReturn} theme={theme}/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最差含息總報酬貢獻 Top 3</h2>
            <ProfitLossBarChart data={dashboardData.bottomTotalReturn} theme={theme}/>
        </div>
         <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最佳年化殖利率貢獻 Top 3</h2>
            <YieldContributionChart data={dashboardData.topYield} theme={theme}/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最差年化殖利率貢獻 Top 3</h2>
            <YieldContributionChart data={dashboardData.bottomYield} theme={theme}/>
        </div>
      </div>

       <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-center">年度股利收入</h2>
            <AdvancedMonthlyDividendChart dividends={dashboardData.dividendsForChart} theme={theme} />
        </div>
    </div>
  );
};
