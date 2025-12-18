
import React, { useMemo, useState } from 'react';
import { KpiCard } from '../components/KpiCard';
import { ProfitLossBarChart, AdvancedMonthlyDividendChart, YieldContributionChart, DistributionPieChart } from '../components/PortfolioCharts';
import { Stock, Dividend, Settings, HistoricalPrice, StockMetadataMap, StockMetadata } from '../types';
import { calculateStockFinancials, formatCurrency, getHistoricalPriceAsOf } from '../utils/calculations';
import { StockFilterDropdown, YearFilterDropdown } from '../components/common';

export const DashboardPage: React.FC<any> = ({ stocks, dividends, settings, allStockSymbols, filteredSymbols, onFilterChange, availableYears, selectedYear, onYearChange, historicalPrices, stockMetadata }) => {
  const heldSymbols = useMemo(() => stocks.filter(s => calculateStockFinancials(s).currentShares > 0).map(s => s.symbol), [stocks]);

  const dashboardData = useMemo(() => {
    const symbolsSet = new Set(filteredSymbols);
    let marketValue = 0, cost = 0, realized = 0, activeStocksCalculated: any[] = [];
    
    const relevantDividends = dividends.filter(d => 
        symbolsSet.has(d.stockSymbol) && 
        (selectedYear === 'all' || new Date(d.date).getFullYear() === selectedYear)
    );

    stocks.filter(s => symbolsSet.has(s.symbol)).forEach(s => {
      const transactionsToConsider = selectedYear === 'all' 
        ? s.transactions 
        : s.transactions.filter(t => new Date(t.date).getFullYear() <= selectedYear);
      
      let effectiveCurrentPrice = s.currentPrice;
      if (selectedYear !== 'all' && selectedYear < new Date().getFullYear()) {
          effectiveCurrentPrice = getHistoricalPriceAsOf(s.symbol, selectedYear, 12, historicalPrices) || 0;
      }
      
      const f = calculateStockFinancials({ ...s, transactions: transactionsToConsider, currentPrice: effectiveCurrentPrice });
      
      if (selectedYear !== 'all') {
          const realizedThisYear = f.sellDetails
            .filter(d => new Date(d.transaction.date).getFullYear() === selectedYear)
            .reduce((sum, d) => sum + d.realizedPnl, 0);
          realized += realizedThisYear;
      } else {
          realized += f.realizedPnl;
      }

      if (f.currentShares > 0) {
          marketValue += f.marketValue;
          cost += f.totalCost;
          activeStocksCalculated.push({ ...s, financials: f });
      }
    });
    
    const totalDiv = relevantDividends.reduce((s,d) => s+d.amount, 0);
    const unrealized = marketValue - cost;
    const totalReturn = unrealized + realized + totalDiv;

    const contribution = activeStocksCalculated.map(s => {
      const f = s.financials;
      const stockDivs = relevantDividends.filter(d => d.stockSymbol === s.symbol);
      const stockDivTotal = stockDivs.reduce((sum, d) => sum + d.amount, 0);
      const frequency = stockMetadata[s.symbol]?.frequency || 1;
      const annualizedYield = f.avgCost > 0 && stockDivs.length > 0 
        ? (stockDivs[0].amount / (stockDivs[0].sharesHeld! * f.avgCost)) * 100 * frequency 
        : 0;
      return { 
          symbol: s.symbol, 
          pnl: f.unrealizedPnlPercent, 
          total: f.totalCost > 0 ? ((f.unrealizedPnl + stockDivTotal) / f.totalCost) * 100 : 0, 
          yield: annualizedYield 
      };
    });

    const calculateDist = (groupBy: (d: StockMetadata) => string) => {
        const dist: { [key: string]: number } = {};
        activeStocksCalculated.forEach(s => {
            const meta = stockMetadata[s.symbol];
            if (meta) {
                const k = groupBy(meta);
                dist[k] = (dist[k] || 0) + s.financials.marketValue;
            }
        });
        return Object.entries(dist).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value);
    };

    const sortedPnl = [...contribution].sort((a,b) => b.pnl - a.pnl);
    const sortedTotal = [...contribution].sort((a,b) => b.total - a.total);
    const sortedYield = [...contribution].filter(d => d.yield > 0).sort((a,b) => b.yield - a.yield);

    return {
      stats: { marketValue, cost, unrealized, realized, totalDiv, totalReturn, rate: cost > 0 ? (totalReturn/cost)*100 : 0, yield: cost > 0 ? (totalDiv/cost)*100 : 0 },
      topPnl: sortedPnl.slice(0, 3).map(d => ({ name: d.symbol, value: d.pnl })),
      lastPnl: sortedPnl.slice(-3).reverse().map(d => ({ name: d.symbol, value: d.pnl })),
      topTotal: sortedTotal.slice(0, 3).map(d => ({ name: d.symbol, value: d.total })),
      lastTotal: sortedTotal.slice(-3).reverse().map(d => ({ name: d.symbol, value: d.total })),
      topYield: sortedYield.slice(0, 3).map(d => ({ name: d.symbol, value: d.yield })),
      lastYield: sortedYield.slice(-3).reverse().map(d => ({ name: d.symbol, value: d.yield })),
      divInPeriod: relevantDividends,
      marketDist: calculateDist(d => d.market),
      typeDist: calculateDist(d => d.type),
      industryDist: calculateDist(d => d.industry)
    };
  }, [stocks, dividends, filteredSymbols, selectedYear, stockMetadata, historicalPrices]);

  return (
    <div className="space-y-10 pb-20">
      <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-6">
        <h1 className="text-2xl font-black tracking-tight uppercase">帳戶投資總覽</h1>
        <div className="flex flex-wrap gap-4">
            <YearFilterDropdown availableYears={availableYears} selectedYear={selectedYear} onChange={onYearChange} />
            <StockFilterDropdown allSymbols={allStockSymbols} selectedSymbols={filteredSymbols} onChange={onFilterChange} stockMetadata={stockMetadata} heldSymbols={heldSymbols} />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KpiCard title="期間持有市值" value={formatCurrency(dashboardData.stats.marketValue, settings.currency)} />
        <KpiCard title="期間投入成本" value={formatCurrency(dashboardData.stats.cost, settings.currency)} />
        <KpiCard title="未實現損益" value={formatCurrency(dashboardData.stats.unrealized, settings.currency)} change={dashboardData.stats.cost > 0 ? (dashboardData.stats.unrealized / dashboardData.stats.cost) * 100 : 0} changeType="PERCENT"/>
        <KpiCard title="期間已實現損益" value={formatCurrency(dashboardData.stats.realized, settings.currency)} />
        <KpiCard title="期間領取股利" value={formatCurrency(dashboardData.stats.totalDiv, settings.currency)} change={dashboardData.stats.yield} changeType="PERCENT"/>
        <KpiCard title="資產總報酬" value={formatCurrency(dashboardData.stats.totalReturn, settings.currency)} change={dashboardData.stats.rate} changeType="PERCENT"/>
      </div>

      <div className="bg-dark-card p-10 rounded-[2rem] border border-dark-border shadow-xl">
          <h2 className="text-xl font-black uppercase tracking-[0.2em] opacity-40 mb-10 text-center">績效貢獻排行榜</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
              <div className="space-y-12">
                  <div><h3 className="text-lg font-black uppercase mb-4 opacity-60 text-center">未實現報酬 Top 3</h3><ProfitLossBarChart data={dashboardData.topPnl} unit="percent"/></div>
                  <div><h3 className="text-lg font-black uppercase mb-4 opacity-60 text-center">未實現報酬 Last 3</h3><ProfitLossBarChart data={dashboardData.lastPnl} unit="percent"/></div>
              </div>
              <div className="space-y-12">
                  <div><h3 className="text-lg font-black uppercase mb-4 opacity-60 text-center">含息總報酬 Top 3</h3><ProfitLossBarChart data={dashboardData.topTotal} unit="percent"/></div>
                  <div><h3 className="text-lg font-black uppercase mb-4 opacity-60 text-center">含息總報酬 Last 3</h3><ProfitLossBarChart data={dashboardData.lastTotal} unit="percent"/></div>
              </div>
              <div className="space-y-12">
                  <div><h3 className="text-lg font-black uppercase mb-4 opacity-60 text-center">年化殖利率 Top 3</h3><YieldContributionChart data={dashboardData.topYield}/></div>
                  <div><h3 className="text-lg font-black uppercase mb-4 opacity-60 text-center">年化殖利率 Last 3</h3><YieldContributionChart data={dashboardData.lastYield}/></div>
              </div>
          </div>
      </div>

      <div className="bg-dark-card p-10 rounded-[2rem] border border-dark-border shadow-xl">
          <h2 className="text-xl font-black uppercase tracking-[0.2em] opacity-40 mb-10 text-center">年度股利收入分布</h2>
          <AdvancedMonthlyDividendChart dividends={dashboardData.divInPeriod} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-dark-card p-8 rounded-[2rem] border border-dark-border shadow-xl">
              <h2 className="text-lg font-black uppercase tracking-[0.2em] opacity-40 mb-6 text-center">投資市場分布</h2>
              <DistributionPieChart data={dashboardData.marketDist} />
          </div>
          <div className="bg-dark-card p-8 rounded-[2rem] border border-dark-border shadow-xl">
              <h2 className="text-lg font-black uppercase tracking-[0.2em] opacity-40 mb-6 text-center">標的類型分布</h2>
              <DistributionPieChart data={dashboardData.typeDist} />
          </div>
          <div className="bg-dark-card p-8 rounded-[2rem] border border-dark-border shadow-xl">
              <h2 className="text-lg font-black uppercase tracking-[0.2em] opacity-40 mb-6 text-center">產業板塊分布</h2>
              <DistributionPieChart data={dashboardData.industryDist} />
          </div>
      </div>
    </div>
  );
};
