import React, { useMemo } from 'react';
import { KpiCard } from '../components/KpiCard';
import { PortfolioDonutChart, DividendBarChart, ProfitLossBarChart, AdvancedMonthlyDividendChart, MonthlyRealizedPnlChart, CumulativeReturnChart } from '../components/PortfolioCharts';
import { Stock, Dividend, Settings, HistoricalPrice } from '../types';
import { calculateStockFinancials, formatCurrency, getLatestHistoricalPrice, getHistoricalPriceAsOf } from '../utils/calculations';
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

  const dashboardData = useMemo(() => {
    const symbolsSet = new Set(filteredSymbols);
    const relevantStocksBase = stocks.filter(s => symbolsSet.has(s.symbol));
    const relevantDividends = dividends.filter(d => symbolsSet.has(d.stockSymbol));

    // --- Calculation for "All Time" ---
    if (selectedYear === 'all') {
      // For "all time", we use the absolute latest historical price available for each stock.
      const relevantStocks = relevantStocksBase.map(stock => {
        const latestPrice = getLatestHistoricalPrice(stock.symbol, historicalPrices);
        return { ...stock, currentPrice: latestPrice !== null ? latestPrice : stock.currentPrice };
      });

      let totalMarketValue = 0;
      let totalCurrentCost = 0;
      let totalRealizedPnl = 0;
      const activeStocksForCharts = [];

      for (const stock of relevantStocks) {
        const financials = calculateStockFinancials(stock);
        if (financials.currentShares > 0) {
          totalMarketValue += financials.marketValue;
          totalCurrentCost += financials.totalCost;
          activeStocksForCharts.push(stock);
        }
        totalRealizedPnl += financials.realizedPnl;
      }
      
      const unrealizedPnl = totalMarketValue - totalCurrentCost;
      const totalDividends = relevantDividends.reduce((sum, d) => sum + d.amount, 0);
      const totalReturn = unrealizedPnl + totalRealizedPnl + totalDividends;
      const totalReturnRate = totalCurrentCost > 0 ? (totalReturn / totalCurrentCost) * 100 : 0;
      const dividendYield = totalCurrentCost > 0 ? (totalDividends / totalCurrentCost) * 100 : 0;
      
      return {
        stats: { totalMarketValue, totalCost: totalCurrentCost, unrealizedPnl, totalRealizedPnl, totalDividends, totalReturn, totalReturnRate, dividendYield },
        activeStocksForCharts,
        dividendsForChart: relevantDividends,
        stocksForPnlCharts: relevantStocks,
      };
    }

    // --- Calculation for a specific selected year ---
    const endDate = new Date(selectedYear, 11, 31, 23, 59, 59);
    if (new Date().getFullYear() === selectedYear) {
      const now = new Date();
      if (now < endDate) {
        endDate.setTime(now.getTime());
      }
    }
    
    let totalMarketValueAtYearEnd = 0;
    let totalCostAtYearEnd = 0;
    let totalRealizedPnlInYear = 0;
    const activeStocksAtYearEnd = [];
    const stocksWithSellInYear = [];

    for (const stock of relevantStocksBase) {
      // Get price as of Dec of the selected year. Fallback to user-entered current price.
      const priceForYear = getHistoricalPriceAsOf(stock.symbol, selectedYear, 12, historicalPrices);
      
      // For holdings stats: analyze state at the end of the year with the correct historical price
      const stockForHoldingsCalc = {
        ...stock,
        currentPrice: priceForYear !== null ? priceForYear : stock.currentPrice,
        transactions: stock.transactions.filter(t => new Date(t.date) <= endDate),
      };

      if (stockForHoldingsCalc.transactions.length > 0) {
        const financials = calculateStockFinancials(stockForHoldingsCalc);
        if (financials.currentShares > 0) {
          totalMarketValueAtYearEnd += financials.marketValue;
          totalCostAtYearEnd += financials.totalCost;
          activeStocksAtYearEnd.push(stockForHoldingsCalc);
        }
      }

      // For realized P&L: analyze sales within the year, based on full history for cost basis
      // Note: This calculation is independent of currentPrice, so we use the original full-history stock object
      const fullHistoryFinancials = calculateStockFinancials(stock);
      const sellsInYear = fullHistoryFinancials.sellDetails.filter(d => new Date(d.transaction.date).getFullYear() === selectedYear);
      if (sellsInYear.length > 0) {
        // Use the original stock object here, as it contains all transactions
        stocksWithSellInYear.push(stock); 
        totalRealizedPnlInYear += sellsInYear.reduce((sum, d) => sum + d.realizedPnl, 0);
      }
    }
    
    const unrealizedPnlAtYearEnd = totalMarketValueAtYearEnd - totalCostAtYearEnd;
    const dividendsInYear = relevantDividends.filter(d => new Date(d.date).getFullYear() === selectedYear);
    const totalDividendsInYear = dividendsInYear.reduce((sum, d) => sum + d.amount, 0);
    const totalReturn = unrealizedPnlAtYearEnd + totalRealizedPnlInYear + totalDividendsInYear;
    const totalReturnRate = totalCostAtYearEnd > 0 ? (totalReturn / totalCostAtYearEnd) * 100 : 0;
    const dividendYield = totalCostAtYearEnd > 0 ? (totalDividendsInYear / totalCostAtYearEnd) * 100 : 0;
    
    return {
      stats: { totalMarketValue: totalMarketValueAtYearEnd, totalCost: totalCostAtYearEnd, unrealizedPnl: unrealizedPnlAtYearEnd, totalRealizedPnl: totalRealizedPnlInYear, totalDividends: totalDividendsInYear, totalReturn, totalReturnRate, dividendYield },
      activeStocksForCharts: activeStocksAtYearEnd,
      dividendsForChart: dividendsInYear,
      stocksForPnlCharts: stocksWithSellInYear,
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
            <h2 className="text-xl font-semibold mb-4">投資組合分佈</h2>
            <PortfolioDonutChart stocks={dashboardData.activeStocksForCharts} theme={theme}/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">未實現損益貢獻</h2>
            <ProfitLossBarChart stocks={dashboardData.activeStocksForCharts} theme={theme}/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">累積報酬 vs 成本</h2>
            <CumulativeReturnChart stocks={dashboardData.activeStocksForCharts} theme={theme} historicalPrices={historicalPrices} />
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">月已實現損益</h2>
            <MonthlyRealizedPnlChart stocks={dashboardData.stocksForPnlCharts} theme={theme} />
        </div>
      </div>
       <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4 text-center">年度股利收入</h2>
            <AdvancedMonthlyDividendChart dividends={dashboardData.dividendsForChart} theme={theme} />
        </div>
    </div>
  );
};
