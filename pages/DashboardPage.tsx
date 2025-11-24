import React, { useMemo, useState } from 'react';
import { KpiCard } from '../components/KpiCard';
import { ProfitLossBarChart, AdvancedMonthlyDividendChart, YieldContributionChart, CompoundInterestChart } from '../components/PortfolioCharts';
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

  const [projectionYears, setProjectionYears] = useState<number>(30);
  const [expectedReturnRate, setExpectedReturnRate] = useState<number>(6);

  const heldSymbols = useMemo(() => {
    return stocks.filter(stock => {
        const financials = calculateStockFinancials(stock);
        return financials.currentShares > 0;
    }).map(stock => stock.symbol);
  }, [stocks]);

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
        const totalReturnWithDividendsPercent = financials.totalCost > 0 ? (totalReturnWithDividends / financials.totalCost) * 100 : 0;

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
            unrealizedPnlPercent: financials.unrealizedPnlPercent,
            totalReturnWithDividendsPercent,
            avgAnnualizedYield,
        };
    });

    const topPnl = [...contributionData].sort((a, b) => b.unrealizedPnlPercent - a.unrealizedPnlPercent).slice(0, 3).map(d => ({ name: d.symbol, value: d.unrealizedPnlPercent }));
    const bottomPnl = [...contributionData].sort((a, b) => a.unrealizedPnlPercent - b.unrealizedPnlPercent).slice(0, 3).map(d => ({ name: d.symbol, value: d.unrealizedPnlPercent }));
    
    const topTotalReturn = [...contributionData].sort((a, b) => b.totalReturnWithDividendsPercent - a.totalReturnWithDividendsPercent).slice(0, 3).map(d => ({ name: d.symbol, value: d.totalReturnWithDividendsPercent }));
    const bottomTotalReturn = [...contributionData].sort((a, b) => a.totalReturnWithDividendsPercent - b.totalReturnWithDividendsPercent).slice(0, 3).map(d => ({ name: d.symbol, value: d.totalReturnWithDividendsPercent }));

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

  // --- Compound Interest Calculation Logic ---
  const compoundInterestData = useMemo(() => {
    const startYear = 2021;
    const currentYear = new Date().getFullYear();
    const endYear = startYear + projectionYears;
    const chartData: { year: number; actual?: number; estimated: number }[] = [];

    // 1. Calculate Historical "Actual" Values (2021 -> Current Year)
    const actualValues: { [year: number]: number } = {};
    
    for (let y = startYear; y <= currentYear; y++) {
        const yearEndDate = new Date(y, 11, 31, 23, 59, 59);
        
        let yearTotalMarketValue = 0;
        let yearCumulativeRealized = 0;
        
        // Loop all stocks to find value at end of year 'y'
        stocks.forEach(stock => {
            const txUntilDate = stock.transactions.filter(t => new Date(t.date) <= yearEndDate);
            if (txUntilDate.length === 0) return;

            // Re-calculate stock position at this point in time
            const tempStock = { ...stock, transactions: txUntilDate };
            // Need historical price for this year
            const histPrice = getHistoricalPriceAsOf(stock.symbol, y, 12, historicalPrices);
            
            // Re-calc using helper
            // We need a lightweight calc here or mock object
            // To properly do this, we replicate simple logic:
            let shares = 0;
            let soldPnL = 0;
            const buyQueue: {shares: number, cost: number}[] = [];
            
            // Sort by date ascending
            const sortedTx = [...txUntilDate].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            sortedTx.forEach(t => {
                if(t.type === 'BUY') {
                    buyQueue.push({shares: t.shares, cost: t.shares * t.price + t.fees});
                    shares += t.shares;
                } else {
                    let sellShares = t.shares;
                    shares -= t.shares;
                    let costSold = 0;
                    while(sellShares > 0 && buyQueue.length > 0) {
                        const b = buyQueue[0];
                        const take = Math.min(sellShares, b.shares);
                        const costPerShare = b.cost / b.shares;
                        costSold += take * costPerShare;
                        b.shares -= take;
                        b.cost -= take * costPerShare;
                        sellShares -= take;
                        if(b.shares <= 0.0001) buyQueue.shift();
                    }
                    const proceeds = t.shares * t.price - t.fees;
                    soldPnL += (proceeds - costSold);
                }
            });

            const finalPrice = histPrice !== null ? histPrice : (
                 // Fallback: If no historical price, use the LAST transaction price of that year or current price if none
                 // This is an estimation fallback.
                 txUntilDate.length > 0 ? txUntilDate[txUntilDate.length - 1].price : stock.currentPrice
            );
            
            yearTotalMarketValue += (shares * finalPrice);
            yearCumulativeRealized += soldPnL;
        });

        // Cumulative Dividends until end of year y
        const dividendsUntilDate = dividends
            .filter(d => new Date(d.date) <= yearEndDate)
            .reduce((sum, d) => sum + d.amount, 0);

        actualValues[y] = yearTotalMarketValue + yearCumulativeRealized + dividendsUntilDate;
    }

    // 2. Build Projection Series
    // Base amount is Actual Value of 2021 (Start Year)
    let baseAmount = actualValues[startYear] || 0;
    
    // If 2021 has 0 value (user started later), try to find the first non-zero year to base the curve slope,
    // BUT the requirement says "2021 actual = 2021 estimated". So if 2021 is 0, projection starts at 0.
    // However, to make it look like a projection chart, we usually want to see growth.
    // If base is 0, let's keep it 0 until actual data starts.
    
    for (let y = startYear; y <= endYear; y++) {
        // Calculate Estimated
        // Formula: Year N = Base * (1 + rate)^(N - StartYear)
        const yearsDiff = y - startYear;
        const estimated = baseAmount * Math.pow(1 + expectedReturnRate / 100, yearsDiff);

        // Actual value exists?
        const actual = (y <= currentYear) ? (actualValues[y] || 0) : undefined;

        chartData.push({
            year: y,
            actual,
            estimated: Math.round(estimated)
        });
    }

    return chartData;
  }, [stocks, dividends, historicalPrices, projectionYears, expectedReturnRate]);


  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <h1 className="text-3xl font-bold hidden md:block">股票總覽</h1>
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
                heldSymbols={heldSymbols}
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
            <ProfitLossBarChart data={dashboardData.topPnl} theme={theme} unit="percent"/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最差未實現損益貢獻 Top 3</h2>
            <ProfitLossBarChart data={dashboardData.bottomPnl} theme={theme} unit="percent"/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最佳含息總報酬貢獻 Top 3</h2>
            <ProfitLossBarChart data={dashboardData.topTotalReturn} theme={theme} unit="percent"/>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">最差含息總報酬貢獻 Top 3</h2>
            <ProfitLossBarChart data={dashboardData.bottomTotalReturn} theme={theme} unit="percent"/>
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

        {/* Compound Interest Calculator Section */}
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                 <div>
                    <h2 className="text-xl font-semibold">複利成長預估 vs 實際資產</h2>
                    <p className="text-sm text-light-text/70 dark:text-dark-text/70 mt-1">
                        以 2021 年為基準，比較實際資產成長與預期複利效果。實際資產包含持股市值、累計已實現損益與累計股利。
                    </p>
                </div>
                <div className="flex flex-wrap gap-4 items-end">
                    <div>
                        <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-1">預估年數</label>
                        <select 
                            value={projectionYears} 
                            onChange={(e) => setProjectionYears(Number(e.target.value))}
                            className="p-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md text-sm"
                        >
                            <option value={10}>10 年</option>
                            <option value={20}>20 年</option>
                            <option value={30}>30 年</option>
                            <option value={40}>40 年</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-1">預期年化報酬率 (%)</label>
                        <input 
                            type="number" 
                            value={expectedReturnRate} 
                            onChange={(e) => setExpectedReturnRate(Number(e.target.value))}
                            className="p-2 w-24 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-md text-sm"
                            step="0.1"
                        />
                    </div>
                </div>
            </div>
            <CompoundInterestChart data={compoundInterestData} theme={theme} />
        </div>
    </div>
  );
};