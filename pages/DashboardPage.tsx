
import React, { useMemo, useState, useEffect } from 'react';
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
  const [expectedDivRate, setExpectedDivRate] = useState<number>(5);
  const [hasUserSetRates, setHasUserSetRates] = useState(false);

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
    
    // Calculate Average Historical Dividend Yield for default rate
    let historicalAvgYield = 0;
    const startYear = 2021;
    const currentYear = new Date().getFullYear();
    let yieldSum = 0;
    let yieldCount = 0;

    // Helper to get cost for a specific year (duplicated logic for accuracy)
    const getCostForYear = (year: number) => {
        const yearEndDate = new Date(year, 11, 31, 23, 59, 59);
        let yearCost = 0;
        relevantStocksBase.forEach(stock => {
            const txUntilDate = stock.transactions.filter(t => new Date(t.date) <= yearEndDate).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const buyQueue: {shares: number, cost: number}[] = [];
            txUntilDate.forEach(t => {
                if(t.type === 'BUY') {
                    buyQueue.push({shares: t.shares, cost: t.shares * t.price + t.fees});
                } else {
                    let sellShares = t.shares;
                    while(sellShares > 0 && buyQueue.length > 0) {
                        const b = buyQueue[0];
                        const take = Math.min(sellShares, b.shares);
                        b.shares -= take;
                        b.cost -= take * (b.cost / (b.shares + take)); // Approximation
                        sellShares -= take;
                        if(b.shares <= 0.0001) buyQueue.shift();
                    }
                }
            });
            yearCost += buyQueue.reduce((s, b) => s + b.cost, 0);
        });
        return yearCost;
    };

    for(let y = startYear; y <= currentYear; y++) {
        const yDividends = relevantDividendsBase.filter(d => new Date(d.date).getFullYear() === y).reduce((sum, d) => sum + d.amount, 0);
        const yCost = getCostForYear(y);
        if (yCost > 0) {
            yieldSum += (yDividends / yCost);
            yieldCount++;
        }
    }
    historicalAvgYield = yieldCount > 0 ? (yieldSum / yieldCount) * 100 : 5;


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
      historicalAvgYield
    };
  }, [stocks, dividends, filteredSymbols, selectedYear, historicalPrices]);

  // Update default rates once based on calculation
  useEffect(() => {
    if (!hasUserSetRates) {
        const div = Math.max(0, parseFloat(dashboardData.historicalAvgYield.toFixed(2)));
        if (!isNaN(div) && div !== 0) setExpectedDivRate(div);
    }
  }, [dashboardData.historicalAvgYield, hasUserSetRates]);


  // --- Annual Dividend Projection vs Actual Logic ---
  const annualDividendComparisonData = useMemo(() => {
    const startYear = 2021;
    const currentYear = new Date().getFullYear();
    const chartData: { year: number; actual: number; estimated: number }[] = [];
    const yieldHistory: number[] = [];

    const symbolsSet = new Set(filteredSymbols);
    const chartStocks = stocks.filter(s => symbolsSet.has(s.symbol));
    const chartDividends = dividends.filter(d => symbolsSet.has(d.stockSymbol));

    for (let y = startYear; y <= currentYear; y++) {
         const yearEndDate = new Date(y, 11, 31, 23, 59, 59);
         
         // Calculate Total Held Cost at year end
         let yearCost = 0;
         chartStocks.forEach(stock => {
            const txUntilDate = stock.transactions.filter(t => new Date(t.date) <= yearEndDate).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const buyQueue: {shares: number, cost: number}[] = [];
            
            txUntilDate.forEach(t => {
                if(t.type === 'BUY') {
                    buyQueue.push({shares: t.shares, cost: t.shares * t.price + t.fees});
                } else {
                    let sellShares = t.shares;
                    while(sellShares > 0 && buyQueue.length > 0) {
                        const b = buyQueue[0];
                        const take = Math.min(sellShares, b.shares);
                        const costPerShare = b.cost / b.shares;
                        b.shares -= take;
                        b.cost -= take * costPerShare;
                        sellShares -= take;
                        if(b.shares <= 0.0001) buyQueue.shift();
                    }
                }
            });
            yearCost += buyQueue.reduce((s, b) => s + b.cost, 0);
         });

         const yearDividend = chartDividends
            .filter(d => new Date(d.date).getFullYear() === y)
            .reduce((sum, d) => sum + d.amount, 0);

         // Calculate Estimated for current year Y
         let estimated = 0;
         if (y === startYear) {
             estimated = yearDividend;
         } else {
             const avgYield = yieldHistory.length > 0 
                ? yieldHistory.reduce((a, b) => a + b, 0) / yieldHistory.length 
                : 0;
             estimated = yearCost * avgYield;
         }

         // Store current yield for future estimations
         // Avoid NaN or Infinity if cost is 0
         if (yearCost > 0) {
             yieldHistory.push(yearDividend / yearCost);
         } else {
             yieldHistory.push(0);
         }

         chartData.push({
             year: y,
             actual: yearDividend,
             estimated: Math.round(estimated)
         });
    }

    return chartData;
  }, [stocks, dividends, filteredSymbols]);


  // --- Compound Interest (Dividend Growth) Calculation Logic ---
  const compoundInterestData = useMemo(() => {
    const startYear = 2021;
    const currentYear = new Date().getFullYear();
    const endYear = startYear + projectionYears;
    const chartData: { year: number; actual?: number; estimated: number }[] = [];

    const symbolsSet = new Set(filteredSymbols);
    const chartStocks = stocks.filter(s => symbolsSet.has(s.symbol));
    const chartDividends = dividends.filter(d => symbolsSet.has(d.stockSymbol));

    // 1. Prepare historical cost and dividend data
    const historyData = new Map<number, { cost: number; dividend: number }>();

    for (let y = startYear; y <= currentYear; y++) {
         const yearEndDate = new Date(y, 11, 31, 23, 59, 59);
         
         // Calculate Total Held Cost at year end
         let yearCost = 0;
         chartStocks.forEach(stock => {
            const txUntilDate = stock.transactions.filter(t => new Date(t.date) <= yearEndDate).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const buyQueue: {shares: number, cost: number}[] = [];
            
            txUntilDate.forEach(t => {
                if(t.type === 'BUY') {
                    buyQueue.push({shares: t.shares, cost: t.shares * t.price + t.fees});
                } else {
                    let sellShares = t.shares;
                    while(sellShares > 0 && buyQueue.length > 0) {
                        const b = buyQueue[0];
                        const take = Math.min(sellShares, b.shares);
                        const costPerShare = b.cost / b.shares;
                        b.shares -= take;
                        b.cost -= take * costPerShare;
                        sellShares -= take;
                        if(b.shares <= 0.0001) buyQueue.shift();
                    }
                }
            });
            yearCost += buyQueue.reduce((s, b) => s + b.cost, 0);
         });

         const yearDividend = chartDividends
            .filter(d => new Date(d.date).getFullYear() === y)
            .reduce((sum, d) => sum + d.amount, 0);
        
         historyData.set(y, { cost: yearCost, dividend: yearDividend });
    }

    const rateDiv = expectedDivRate / 100;
    const currentCost = historyData.get(currentYear)?.cost || 0;

    // 2. Build Chart Data
    for (let y = startYear; y <= endYear; y++) {
        let actualVal: number | undefined = undefined;
        let estimatedVal = 0;

        if (y <= currentYear) {
            const data = historyData.get(y);
            actualVal = data?.dividend || 0;
            const cost = data?.cost || 0;
            
            // Past Estimation: Based on Actual Cost * User Rate
            // User requested: 2021 Actual = Estimated.
            if (y === startYear) {
                // Force align 2021
                estimatedVal = actualVal;
            } else {
                // 2022+ Past: Cost * Rate
                estimatedVal = cost * rateDiv;
            }
        } else {
            // Future Estimation: 
            // Assumes reinvestment: Principal grows by (1+rate)^n
            // Dividend Income = Projected Principal * Rate
            const yearsSinceCurrent = y - currentYear;
            const projectedPrincipal = currentCost * Math.pow(1 + rateDiv, yearsSinceCurrent);
            estimatedVal = projectedPrincipal * rateDiv;
        }

        chartData.push({
            year: y,
            actual: actualVal,
            estimated: Math.round(estimatedVal)
        });
    }

    return chartData;
  }, [stocks, dividends, filteredSymbols, projectionYears, expectedDivRate]);

  const handleRateChange = (val: string) => {
      setHasUserSetRates(true);
      const num = parseFloat(val);
      if (!isNaN(num)) setExpectedDivRate(num);
  };


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

        {/* Projected Annual Dividend vs Actual Annual Dividend */}
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-6">預估年度股利 vs 實際股利收入</h2>
            <CompoundInterestChart 
                data={annualDividendComparisonData} 
                theme={theme} 
                labelEstimated="預估年度股利"
                labelActual="實際年度股利"
            />
        </div>

        {/* Compound Interest Calculator Section */}
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md relative">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-6 gap-4">
                 <div className="flex-1">
                    <h2 className="text-xl font-semibold">股利收入複利預估 vs 實際股利收入</h2>
                </div>
                 <div className="w-full md:w-auto flex flex-wrap gap-3 items-end bg-light-bg dark:bg-dark-bg p-3 rounded-lg border border-light-border dark:border-dark-border">
                    <div>
                        <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-1">預估年數</label>
                        <select 
                            value={projectionYears} 
                            onChange={(e) => setProjectionYears(Number(e.target.value))}
                            className="p-1.5 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded text-sm w-full md:w-20"
                        >
                            <option value={10}>10 年</option>
                            <option value={20}>20 年</option>
                            <option value={30}>30 年</option>
                            <option value={40}>40 年</option>
                        </select>
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-1">平均年股利率 (%)</label>
                        <input 
                            type="number" 
                            value={expectedDivRate} 
                            onChange={(e) => handleRateChange(e.target.value)}
                            className="p-1.5 w-full md:w-24 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded text-sm"
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
