import { Stock, HistoricalPrice } from '../types';

// Helper function to format currency
export const formatCurrency = (value: number, currency: 'USD' | 'TWD' = 'TWD', fractionDigits: number = 0) => {
  if (isNaN(value)) {
    value = 0;
  }
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
};

// --- New Helper Function ---
/**
 * Gets the latest price for a stock from the historical price records.
 * @param symbol - The stock symbol.
 * @param historicalPrices - The array of all historical price records.
 * @returns The latest price as a number, or null if not found.
 */
export const getLatestHistoricalPrice = (symbol: string, historicalPrices: HistoricalPrice[]): number | null => {
    const stockPrices = historicalPrices.find(hp => hp.stockSymbol === symbol);
    if (!stockPrices || Object.keys(stockPrices.prices).length === 0) {
        return null;
    }
    // Find the latest month (e.g., "2024-05") by sorting the keys
    const latestMonth = Object.keys(stockPrices.prices).sort().pop();
    return latestMonth ? stockPrices.prices[latestMonth] : null;
};


// --- Calculation Helpers ---
export const calculateStockFinancials = (stock: Stock) => {
    let realizedPnl = 0;
    let totalCostOfSoldShares = 0;
    let totalSharesSold = 0;
    const buyQueue: { shares: number, cost: number }[] = [];
    const sellDetails: Array<{ transaction: Stock['transactions'][0]; costOfShares: number; realizedPnl: number; returnRate: number; }> = [];

    let currentShares = 0;
    let totalCost = 0;
    
    const sortedTransactions = [...stock.transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTransactions.forEach(t => {
        if (t.type === 'BUY') {
            buyQueue.push({ shares: t.shares, cost: t.shares * t.price + t.fees });
        } else { // SELL
            let sharesToSell = t.shares;
            let costForThisSell = 0;
            totalSharesSold += t.shares;

            while (sharesToSell > 0 && buyQueue.length > 0) {
                const fifoBuy = buyQueue[0];
                const sellableShares = Math.min(sharesToSell, fifoBuy.shares);
                const costPerShare = fifoBuy.cost > 0 && fifoBuy.shares > 0 ? fifoBuy.cost / fifoBuy.shares : 0;
                
                costForThisSell += sellableShares * costPerShare;
                
                fifoBuy.shares -= sellableShares;
                fifoBuy.cost -= sellableShares * costPerShare;
                sharesToSell -= sellableShares;

                if (fifoBuy.shares <= 0.0001) {
                    buyQueue.shift();
                }
            }
            const proceeds = t.shares * t.price - t.fees;
            const pnlForThisSell = proceeds - costForThisSell;
            realizedPnl += pnlForThisSell;
            totalCostOfSoldShares += costForThisSell;

            sellDetails.push({
                transaction: t,
                costOfShares: costForThisSell,
                realizedPnl: pnlForThisSell,
                returnRate: costForThisSell > 0 ? (pnlForThisSell / costForThisSell) * 100 : 0,
            });
        }
    });

    buyQueue.forEach(buy => {
        currentShares += buy.shares;
        totalCost += buy.cost;
    });

    const avgCost = currentShares > 0 ? totalCost / currentShares : 0;
    const marketValue = currentShares * stock.currentPrice;
    const unrealizedPnl = currentShares > 0 ? marketValue - totalCost : 0;
    const unrealizedPnlPercent = totalCost > 0 ? (unrealizedPnl / totalCost) * 100 : 0;
    
    const realizedReturnRate = totalCostOfSoldShares > 0 ? (realizedPnl / totalCostOfSoldShares) * 100 : 0;
    const avgSellCost = totalSharesSold > 0 ? totalCostOfSoldShares / totalSharesSold : 0;

    return {
        currentShares,
        avgCost,
        totalCost,
        marketValue,
        unrealizedPnl,
        unrealizedPnlPercent,
        hasSell: stock.transactions.some(t => t.type === 'SELL'),
        totalSharesSold,
        avgSellCost,
        totalCostOfSoldShares,
        realizedPnl,
        realizedReturnRate,
        sellDetails,
    };
};