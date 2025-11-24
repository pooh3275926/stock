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
  // Default values will be calculated in useEffect if they haven't been touched, but for now init with sensible defaults
  const [expectedPnlRate, setExpectedPnlRate] = useState<number>(5);
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
    
    // Auto-calculate default rates if user hasn't set them
    const calculatedPnlRate = totalCurrentCost > 0 ? (unrealizedPnl / totalCurrentCost) * 100 : 0;
    // For dividend rate, use yield as a proxy for annual reinvestment rate
    const calculatedDivRate = dividendYield; 

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
      calculatedPnlRate,
      calculatedDivRate
    };
  }, [stocks, dividends, filteredSymbols, selectedYear, historicalPrices]);

  // Update default rates once based on calculation
  useEffect(() => {
    if (!hasUserSetRates && dashboardData.calculatedPnlRate !== 0) {
        // Use a conservative simplification: current total % / 3 years roughly or just use the current total % as a "Optimistic Long Term Target"
        // Let's default to flat 5% if calculated is crazy, otherwise use calculated but cap at reasonable display
        const pnl = Math.max(0, parseFloat(dashboardData.calculatedPnlRate.toFixed(1)));
        const div = Math.max(0, parseFloat(dashboardData.calculatedDivRate.toFixed(1)));
        if (pnl !== 0) setExpectedPnlRate(pnl);
        if (div !== 0) setExpectedDivRate(div);
    }
  }, [dashboardData.calculatedPnlRate, dashboardData.calculatedDivRate, hasUserSetRates]);


  // --- Compound Interest Calculation Logic ---
  const compoundInterestData = useMemo(() => {
    const startYear = 2021;
    const currentYear = new Date().getFullYear();
    const endYear = startYear + projectionYears;
    const chartData: { year: number; actual?: number; estimated: number }[] = [];

    // Helper to calculate stats for a specific historical year
    const getStatsByYear = (year: number) => {
        const yearEndDate = new Date(year, 11, 31, 23, 59, 59);
        let yearTotalMarketValue = 0;
        let yearCumulativeRealized = 0;
        let yearCost = 0;

        stocks.forEach(stock => {
            const txUntilDate = stock.transactions.filter(t => new Date(t.date) <= yearEndDate);
            if (txUntilDate.length === 0) return;

            const tempStock = { ...stock, transactions: txUntilDate };
            // Need price at that year end
            const histPrice = getHistoricalPriceAsOf(stock.symbol, year, 12, historicalPrices);
            
            // Recalculate financial state
            let shares = 0;
            let totalBuyCost = 0;
            let soldPnL = 0;
            const buyQueue: {shares: number, cost: number}[] = [];
            
            const sortedTx = [...txUntilDate].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            
            sortedTx.forEach(t => {
                if(t.type === 'BUY') {
                    buyQueue.push({shares: t.shares, cost: t.shares * t.price + t.fees});
                    shares += t.shares;
                    totalBuyCost += (t.shares * t.price + t.fees);
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

            // Calculate Remaining Cost for held shares
            const remainingCost = buyQueue.reduce((s, b) => s + b.cost, 0);
            yearCost += remainingCost;

            const finalPrice = histPrice !== null ? histPrice : (
                 txUntilDate.length > 0 ? txUntilDate[txUntilDate.length - 1].price : stock.currentPrice
            );
            
            yearTotalMarketValue += (shares * finalPrice);
            yearCumulativeRealized += soldPnL;
        });

        const dividendsUntilDate = dividends
            .filter(d => new Date(d.date) <= yearEndDate)
            .reduce((sum, d) => sum + d.amount, 0);

        // Unrealized PnL = MarketValue - Cost
        const yearUnrealized = yearTotalMarketValue - yearCost;

        return {
            cost: yearCost,
            marketValue: yearTotalMarketValue,
            cumDiv: dividendsUntilDate,
            realizedPnl: yearCumulativeRealized,
            unrealizedPnl: yearUnrealized
        };
    };

    // 1. Get Baseline (2021)
    const baseline = getStatsByYear(startYear);
    const baseCost = baseline.cost;
    const baseCumDiv = baseline.cumDiv;
    
    // 2. Build Series
    for (let y = startYear; y <= endYear; y++) {
        // --- Actual Calculation ---
        let actualVal: number | undefined = undefined;
        
        if (y <= currentYear) {
            const currentStats = getStatsByYear(y);
            // Actual Logic: Deduct change in cost (Principal) from Total Asset
            // Adjusted Actual = (MarketValue + CumDiv + Realized) - (CurrentCost - BaseCost)
            // Explanation: (Cost + Unrealized + CumDiv + Realized) - Cost + BaseCost
            //            = BaseCost + Unrealized + CumDiv + Realized
            // This represents the "Value of the original 2021 principal + All accumulated returns"
            const totalAsset = currentStats.marketValue + currentStats.cumDiv + currentStats.realizedPnl;
            const costChange = currentStats.cost - baseCost;
            actualVal = totalAsset - costChange;
        }

        // --- Estimated Calculation ---
        // Formula per request:
        // Part 1: Dividend Compounding = (BaseCost + BaseDiv) * (1 + DivRate)^n
        // Part 2: P&L Compounding = BaseCost * (1 + PnlRate)^n
        // Part 3 (Total): We need to be careful not to double count BaseCost.
        // Interpretation: 
        //   Projected P&L Wealth = BaseCost * (1+r_pnl)^n
        //   Projected Div Wealth (Growth) = (BaseCost + BaseDiv) * (1+r_div)^n - BaseCost
        //   Total = Projected P&L Wealth + Projected Div Wealth (Growth)
        
        const n = y - startYear;
        const ratePnl = expectedPnlRate / 100;
        const rateDiv = expectedDivRate / 100;

        // Part 1: Projected Dividend Growth Amount (Using BaseCost+BaseDiv as generator)
        // We subtract BaseCost to isolate the "Dividend Asset Value" generated, assuming BaseCost is accounted for in P&L part
        const projectedDivAsset = (baseCost + baseCumDiv) * Math.pow(1 + rateDiv, n) - baseCost;
        
        // Part 2: Projected Stock Asset (Principal + Unrealized P&L)
        const projectedStockAsset = baseCost * Math.pow(1 + ratePnl, n);

        // Sum
        const estimatedVal = projectedStockAsset + projectedDivAsset;

        chartData.push({
            year: y,
            actual: actualVal,
            estimated: Math.round(estimatedVal)
        });
    }

    return chartData;
  }, [stocks, dividends, historicalPrices, projectionYears, expectedPnlRate, expectedDivRate]);

  const handleRateChange = (type: 'pnl' | 'div', val: string) => {
      setHasUserSetRates(true);
      const num = parseFloat(val);
      if (type === 'pnl') setExpectedPnlRate(num);
      else setExpectedDivRate(num);
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

        {/* Compound Interest Calculator Section */}
        <div className="bg-light-card dark:bg-dark-card p-4 sm:p-6 rounded-lg shadow-md relative">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-start mb-6 gap-4">
                 <div className="flex-1">
                    <h2 className="text-xl font-semibold">複利成長預估 vs 實際資產</h2>
                    <p className="text-sm text-light-text/70 dark:text-dark-text/70 mt-1 max-w-xl">
                        以 2021 年為基準，比較實際資產成長與預期複利效果。實際資產已扣除 2021 年後的本金投入變動。
                    </p>
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
                        <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-1">預估未實現損益率 (%)</label>
                        <input 
                            type="number" 
                            value={expectedPnlRate} 
                            onChange={(e) => handleRateChange('pnl', e.target.value)}
                            className="p-1.5 w-full md:w-24 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded text-sm"
                            step="0.1"
                        />
                    </div>
                     <div>
                        <label className="block text-xs font-medium text-light-text/70 dark:text-dark-text/70 mb-1">預估累計股利率 (%)</label>
                        <input 
                            type="number" 
                            value={expectedDivRate} 
                            onChange={(e) => handleRateChange('div', e.target.value)}
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