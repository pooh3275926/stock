import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DashboardIcon, PortfolioIcon, DividendIcon, HeartIcon, SettingsIcon, SunIcon, MoonIcon, HistoryIcon, PresentationChartLineIcon, BudgetIcon, GridIcon } from './components/Icons';
import type { Stock, Dividend, Settings, Page, Transaction, Donation, HistoricalPrice, BudgetEntry } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateStockFinancials } from './utils/calculations';
import { stockMaster } from './utils/data';

import { DashboardPage } from './pages/DashboardPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { DividendsPage } from './pages/DividendsPage';
import { DonationFundPage } from './pages/DonationFundPage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { HistoricalPricesPage } from './pages/HistoricalPricesPage';
import { BudgetPage } from './pages/BudgetPage';
import { MorePage } from './pages/MorePage';
import { ModalContainer, ModalState } from './components/modals';
import { ScrollToTopButton } from './components/common';
import { ParsedResult } from './utils/parser';

const pageTitles: { [key in Page]: string } = {
  DASHBOARD: '總覽',
  PORTFOLIO: '我的持股',
  DIVIDENDS: '股利紀錄',
  BUDGET: '投資預算',
  DONATION_FUND: '奉獻基金',
  TRANSACTION_HISTORY: '交易紀錄',
  HISTORICAL_PRICES: '歷史股價',
  SETTINGS: '設定',
  MORE: '更多功能',
};

// Main App Component
const App: React.FC = () => {
  const [page, setPage] = useState<Page>('DASHBOARD');
  const [stocks, setStocks] = useLocalStorage<Stock[]>('portfolio-stocks', []);
  const [dividends, setDividends] = useLocalStorage<Dividend[]>('portfolio-dividends', []);
  const [donations, setDonations] = useLocalStorage<Donation[]>('portfolio-donations', []);
  const [budgetEntries, setBudgetEntries] = useLocalStorage<BudgetEntry[]>('portfolio-budget-entries', []);
  const [historicalPrices, setHistoricalPrices] = useLocalStorage<HistoricalPrice[]>('portfolio-historical-prices', []);
  const [settings, setSettings] = useLocalStorage<Settings>('portfolio-settings', {
    currency: 'TWD',
    transactionFeeRate: 0.001425,
    taxRate: 0.001,
    displayMode: 'PERCENTAGE',
  });
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const storedTheme = localStorage.getItem('theme');
      if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });
  const [modal, setModal] = useState<ModalState | null>(null);

  // Selection states
  const [selectedStockSymbols, setSelectedStockSymbols] = useState<Set<string>>(new Set());
  const [selectedDividendGroups, setSelectedDividendGroups] = useState<Set<string>>(new Set());
  const [selectedDividendIds, setSelectedDividendIds] = useState<Set<string>>(new Set());
  const [selectedHistoryGroups, setSelectedHistoryGroups] = useState<Set<string>>(new Set());
  const [selectedDonationIds, setSelectedDonationIds] = useState<Set<string>>(new Set());
  const [selectedTransactionIds, setSelectedTransactionIds] = useState<Set<string>>(new Set());
  const [selectedBudgetEntryIds, setSelectedBudgetEntryIds] = useState<Set<string>>(new Set());
    
  // Dashboard filter states
  const allStockSymbols = useMemo(() => stocks.map(s => s.symbol), [stocks]);
  const [dashboardFilteredSymbols, setDashboardFilteredSymbols] = useState<string[]>(allStockSymbols);
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    stocks.forEach(s => s.transactions.forEach(t => years.add(new Date(t.date).getFullYear())));
    dividends.forEach(d => years.add(new Date(d.date).getFullYear()));
    return Array.from(years).sort((a, b) => b - a);
  }, [stocks, dividends]);
  const [selectedDashboardYear, setSelectedDashboardYear] = useState<number | 'all'>(new Date().getFullYear());
  
  useEffect(() => {
    setDashboardFilteredSymbols(prev => {
        const currentSymbols = new Set(prev);
        allStockSymbols.forEach(s => currentSymbols.add(s));
        return Array.from(currentSymbols).filter(s => allStockSymbols.includes(s));
    });
  }, [allStockSymbols]);


  const [isScrolled, setIsScrolled] = useState(false);
  const mainContentRef = useRef<HTMLElement>(null);

  // Theme effect
  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  // Scroll effect
  useEffect(() => {
    const mainEl = mainContentRef.current;
    if (!mainEl) return;
    const handleScroll = () => setIsScrolled(mainEl.scrollTop > 200);
    mainEl.addEventListener('scroll', handleScroll);
    return () => mainEl.removeEventListener('scroll', handleScroll);
  }, []);

  // Clear selections when changing page
  useEffect(() => {
    setSelectedStockSymbols(new Set());
    setSelectedDividendGroups(new Set());
    setSelectedDividendIds(new Set());
    setSelectedHistoryGroups(new Set());
    setSelectedDonationIds(new Set());
    setSelectedTransactionIds(new Set());
    setSelectedBudgetEntryIds(new Set());
  }, [page]);

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // --- Selection Handlers ---
  const toggleStockSelection = useCallback((symbol: string) => { setSelectedTransactionIds(new Set()); setSelectedStockSymbols(prev => { const newSet = new Set(prev); if (newSet.has(symbol)) newSet.delete(symbol); else newSet.add(symbol); return newSet; }) }, []);
  const handleDeleteSelectedStocks = () => {
    const confirmDelete = () => {
      setStocks(prev => prev.filter(s => !selectedStockSymbols.has(s.symbol)));
      setSelectedStockSymbols(new Set());
      setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除 ${selectedStockSymbols.size} 項持股`, message: '此操作將永久刪除所選股票及其所有交易紀錄，但不會刪除相關的股利紀錄。' } });
  };
  
  const toggleDividendGroupSelection = useCallback((symbol: string) => { 
    setSelectedDividendIds(new Set());
    setSelectedDividendGroups(prev => { const newSet = new Set(prev); if (newSet.has(symbol)) newSet.delete(symbol); else newSet.add(symbol); return newSet; }); 
  }, []);

  const handleDeleteSelectedDividendGroups = () => {
     const confirmDelete = () => {
        setDividends(prev => prev.filter(d => !selectedDividendGroups.has(d.stockSymbol)));
        setSelectedDividendGroups(new Set());
        setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除 ${selectedDividendGroups.size} 組股利紀錄`, message: '這將會刪除所選股票的所有股利紀錄。' } });
  };
    
  const toggleDividendIdSelection = useCallback((id: string) => {
    setSelectedDividendGroups(new Set());
    setSelectedDividendIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; });
  }, []);

  const handleDeleteSelectedDividendIds = () => {
    const confirmDelete = () => {
      setDividends(prev => prev.filter(d => !selectedDividendIds.has(d.id)));
      setSelectedDividendIds(new Set());
      setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除 ${selectedDividendIds.size} 筆股利紀錄` } });
  };

  const toggleHistoryGroupSelection = useCallback((symbol: string) => { setSelectedTransactionIds(new Set()); setSelectedHistoryGroups(prev => { const newSet = new Set(prev); if (newSet.has(symbol)) newSet.delete(symbol); else newSet.add(symbol); return newSet; }); }, []);
  const handleDeleteSelectedHistoryGroups = () => {
     const confirmDelete = () => {
        setStocks(prev => prev.filter(s => !selectedHistoryGroups.has(s.symbol)));
        setSelectedHistoryGroups(new Set());
        setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除 ${selectedHistoryGroups.size} 組交易紀錄`, message: '這將永久刪除所選股票及其所有相關的交易歷史。' } });
  };

  const toggleDonationSelection = useCallback((id: string) => { setSelectedDonationIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); }, []);
  const handleDeleteSelectedDonations = () => {
     const confirmDelete = () => {
        setDonations(prev => prev.filter(d => !selectedDonationIds.has(d.id)));
        setSelectedDonationIds(new Set());
        setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除 ${selectedDonationIds.size} 筆奉獻紀錄` } });
  };
    
  const toggleTransactionSelection = useCallback((id: string) => {
    setSelectedStockSymbols(new Set());
    setSelectedHistoryGroups(new Set());
    setSelectedTransactionIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; });
  }, []);

  const handleDeleteSelectedTransactions = () => {
    const confirmDelete = () => {
      setStocks(prev => prev.map(stock => ({...stock, transactions: stock.transactions.filter(tx => !selectedTransactionIds.has(tx.id))})).filter(stock => stock.transactions.length > 0));
      setSelectedTransactionIds(new Set());
      setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除 ${selectedTransactionIds.size} 筆交易紀錄` } });
  };

  const toggleBudgetEntrySelection = useCallback((id: string) => { setSelectedBudgetEntryIds(prev => { const newSet = new Set(prev); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); return newSet; }); }, []);
    const handleDeleteSelectedBudgetEntries = () => {
     const confirmDelete = () => {
        setBudgetEntries(prev => prev.filter(d => !selectedBudgetEntryIds.has(d.id)));
        setSelectedBudgetEntryIds(new Set());
        setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除 ${selectedBudgetEntryIds.size} 筆預算紀錄` } });
  };

  // --- CRUD Operations ---
  const handleSaveTransaction = (
    formData: Omit<Transaction, 'id'> & { symbol: string; name?: string; currentPrice?: number },
    mode: 'add' | 'edit' | 'buy' | 'sell',
    originalTransactionId?: string
  ) => {
    const { symbol, name, shares, price, fees, date, currentPrice, type } = formData;
    
    setStocks(prevStocks => {
        const stockIndex = prevStocks.findIndex(s => s.symbol.toUpperCase() === symbol.toUpperCase());
        const newStocks = [...prevStocks];
        
        if (mode === 'add') {
             const financials = stockIndex !== -1 ? calculateStockFinancials(newStocks[stockIndex]) : null;
             if (financials && financials.currentShares > 0) {
                alert('此股票代號已存在於您的持股中。');
                return prevStocks;
             }
             if (stockIndex !== -1) {
                const stockToUpdate = { ...newStocks[stockIndex] };
                stockToUpdate.transactions = [...stockToUpdate.transactions, { id: crypto.randomUUID(), type: 'BUY', shares, price, date, fees }];
                if (currentPrice !== undefined) stockToUpdate.currentPrice = currentPrice;
                newStocks[stockIndex] = stockToUpdate;
                return newStocks;
             }
            
            const stockName = name || stockMaster[symbol.toUpperCase()] || symbol.toUpperCase();
            const newStock: Stock = {
                symbol: symbol.toUpperCase(),
                name: stockName,
                currentPrice: currentPrice || price,
                transactions: [{ id: crypto.randomUUID(), type: 'BUY', shares, price, date, fees }],
            };
            return [...newStocks, newStock];
        }

        if (stockIndex === -1) {
            alert('找不到對應的股票。');
            return prevStocks;
        }

        if (mode === 'buy' || mode === 'sell') {
            const stockToUpdate = { ...newStocks[stockIndex] };
            stockToUpdate.transactions = [...stockToUpdate.transactions, { id: crypto.randomUUID(), type, shares, price, date, fees }];
            if (currentPrice !== undefined) {
                stockToUpdate.currentPrice = currentPrice;
            }
            newStocks[stockIndex] = stockToUpdate;
            return newStocks;
        }
        
        if (mode === 'edit') {
            const stockToUpdate = { ...newStocks[stockIndex] };
            if (name) stockToUpdate.name = name;
            if (currentPrice !== undefined) stockToUpdate.currentPrice = currentPrice;

            if (originalTransactionId) {
                const txIndex = stockToUpdate.transactions.findIndex(t => t.id === originalTransactionId);
                if (txIndex > -1) {
                    const newTransactions = [...stockToUpdate.transactions];
                    newTransactions[txIndex] = { ...newTransactions[txIndex], shares, price, fees, date };
                    stockToUpdate.transactions = newTransactions;
                }
            }
            newStocks[stockIndex] = stockToUpdate;
            return newStocks;
        }
        
        return prevStocks;
    });

    setModal(null);
  };
  const handleDeleteStock = (stock: Stock) => {
    const confirmDelete = () => {
      setStocks(prev => prev.filter(s => s.symbol !== stock.symbol));
      setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除持股 ${stock.symbol}`, message: '此操作將永久刪除此股票及其所有交易紀錄。' } });
  };
    
  const handleEditTransaction = (stockSymbol: string, transactionId: string) => {
    const stock = stocks.find(s => s.symbol === stockSymbol);
    if (!stock) return;
    const transaction = stock.transactions.find(t => t.id === transactionId);
    if (!transaction) return;
    setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock, transaction } });
  };
    
  const handleDeleteTransaction = (stockSymbol: string, transactionId: string) => {
    const confirmDelete = () => {
        setStocks(prevStocks => {
            return prevStocks.map(stock => {
                if (stock.symbol === stockSymbol) {
                    return { ...stock, transactions: stock.transactions.filter(tx => tx.id !== transactionId) };
                }
                return stock;
            }).filter(stock => stock.transactions.length > 0);
        });
        setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除此筆交易紀錄` } });
  };


  const handleSaveDividend = (dividendData: Omit<Dividend, 'id'>, id?: string) => {
     setDividends(prev => id ? prev.map(d => d.id === id ? { ...d, ...dividendData } : d) : [...prev, { ...dividendData, id: crypto.randomUUID() }]);
     setModal(null);
  };
  const handleDeleteDividend = (dividend: Dividend) => {
    const confirmDelete = () => {
      setDividends(prev => prev.filter(d => d.id !== dividend.id));
      setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除此筆股利紀錄` } });
  };

  const handleSaveDonation = (donationData: Omit<Donation, 'id'>, id?: string) => {
     setDonations(prev => id ? prev.map(d => d.id === id ? { ...d, ...donationData } : d) : [...prev, { ...donationData, id: crypto.randomUUID() }]);
     setModal(null);
  };
  const handleDeleteDonation = (donation: Donation) => {
    const confirmDelete = () => {
        setDonations(prev => prev.filter(d => d.id !== donation.id));
        setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除此筆奉獻紀錄` } });
  };

  const handleSaveBudgetEntry = (entryData: Omit<BudgetEntry, 'id'>, id?: string) => {
     setBudgetEntries(prev => id ? prev.map(d => d.id === id ? { ...d, ...entryData } : d) : [...prev, { ...entryData, id: crypto.randomUUID() }]);
     setModal(null);
  };
  const handleDeleteBudgetEntry = (entry: BudgetEntry) => {
    const confirmDelete = () => {
        setBudgetEntries(prev => prev.filter(d => d.id !== entry.id));
        setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除此筆預算紀錄` } });
  };
  
  const handleUpdateAllPrices = (prices: { [symbol: string]: number }) => {
    setStocks(prevStocks => 
      prevStocks.map(stock => 
        prices[stock.symbol] !== undefined 
          ? { ...stock, currentPrice: prices[stock.symbol] } 
          : stock
      )
    );
    
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    setHistoricalPrices(prevPrices => {
        const newPrices = [...prevPrices];
        const pricesMap = new Map(newPrices.map(p => [p.stockSymbol, p]));

        for (const symbol in prices) {
            if (Object.prototype.hasOwnProperty.call(prices, symbol)) {
                const price = prices[symbol];
                if (!pricesMap.has(symbol)) {
                    const newEntry: HistoricalPrice = { stockSymbol: symbol, prices: {} };
                    newPrices.push(newEntry);
                    pricesMap.set(symbol, newEntry);
                }
                const entry = pricesMap.get(symbol)!;
                entry.prices[yearMonth] = price;
            }
        }
        return newPrices;
    });

    setModal(null);
    alert('股票價格已更新！');
  };

  const portfolioCalculations = useMemo(() => {
    let totalCurrentCost = 0, totalMarketValue = 0, totalRealizedPnl = 0;
    
    stocks.forEach(stock => {
      const financials = calculateStockFinancials(stock);
      totalCurrentCost += financials.totalCost;
      totalMarketValue += financials.marketValue;
      totalRealizedPnl += financials.realizedPnl;
    });
    
    const totalDividends = dividends.reduce((sum, d) => sum + d.amount, 0);
    const unrealizedPnl = totalMarketValue - totalCurrentCost;
    const totalPnl = unrealizedPnl + totalRealizedPnl;
    const totalReturn = totalPnl + totalDividends;
    const totalReturnRate = totalCurrentCost > 0 ? (totalReturn / totalCurrentCost) * 100 : 0;
    
    return { totalCost: totalCurrentCost, totalMarketValue, unrealizedPnl, totalRealizedPnl, totalDividends, totalReturn, totalReturnRate };
  }, [stocks, dividends]);
  
  const { activeStocks, stocksWithSellHistory } = useMemo(() => {
    const active: Stock[] = [];
    const historical: Array<Stock & { financials: ReturnType<typeof calculateStockFinancials> }> = [];
    
    stocks.forEach(stock => {
        const financials = calculateStockFinancials(stock);
        if (financials.currentShares > 0) {
            active.push(stock);
        }
        if (financials.hasSell) {
            historical.push({ ...stock, financials });
        }
    });
    return { activeStocks: active, stocksWithSellHistory: historical };
  }, [stocks]);
  
  const handleEditStock = (stock: Stock) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock, transaction: stock.transactions[0] } });
  const handleBuyStock = (stock: Stock) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'buy', stock }});
  const handleSellStock = (stock: Stock) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'sell', stock }});
  const handleEditDividend = (dividend: Dividend) => setModal({type: 'DIVIDEND', data: { mode: 'edit', dividend: dividend }});
  const handleEditDonation = (donation: Donation) => setModal({type: 'DONATION_FORM', data: { mode: 'edit', donation: donation }});
  const handleEditBudgetEntry = (entry: BudgetEntry) => setModal({type: 'BUDGET_ENTRY', data: { mode: 'edit', entry: entry }});

  const handleExportData = () => {
    const sellHistoryForExport = stocksWithSellHistory.map(({ financials, ...stock }) => stock);
    const data = { 
      stocks, 
      dividends, 
      donations,
      budgetEntries,
      historicalPrices, 
      settings,
      sellHistory: sellHistoryForExport,
    };
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = `portfolio-pilot-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImportData = (data: any) => {
    if (data.settings) setSettings(data.settings);
    setStocks(data.stocks || []);
    setDividends(data.dividends || []);
    setDonations(data.donations || []);
    setBudgetEntries(data.budgetEntries || []);
    setHistoricalPrices(data.historicalPrices || []);
    setModal(null);
    alert('資料已成功匯入！');
  };

  const handleBulkImport = useCallback((type: 'transactions' | 'dividends' | 'donations' | 'prices', data: ParsedResult<any>['success']) => {
    if (data.length === 0) {
      setModal(null);
      return;
    }

    if (type === 'transactions') {
      setStocks(prevStocks => {
        const newStocks = [...prevStocks];
        const stocksMap = new Map(newStocks.map(s => [s.symbol, s]));

        data.forEach((tx: Omit<Transaction, 'id'> & { symbol: string }) => {
          if (stocksMap.has(tx.symbol)) {
            const stock = stocksMap.get(tx.symbol)!;
            stock.transactions.push({ ...tx, id: crypto.randomUUID() });
          } else {
            const newStock: Stock = {
              symbol: tx.symbol,
              name: stockMaster[tx.symbol] || tx.symbol,
              currentPrice: tx.price,
              transactions: [{ ...tx, id: crypto.randomUUID() }],
            };
            stocksMap.set(tx.symbol, newStock);
            newStocks.push(newStock);
          }
        });
        return Array.from(stocksMap.values());
      });
    } else if (type === 'dividends') {
      const newDividends: Dividend[] = data.map(d => ({ ...d, id: crypto.randomUUID() }));
      setDividends(prev => [...prev, ...newDividends]);
    } else if (type === 'donations') {
      const newDonations: Donation[] = data.map(d => ({ ...d, id: crypto.randomUUID() }));
      setDonations(prev => [...prev, ...newDonations]);
    } else if (type === 'prices') {
        setHistoricalPrices(prevPrices => {
            const pricesMap = new Map(prevPrices.map(p => [p.stockSymbol, p.prices]));
            data.forEach((priceEntry: { symbol: string; yearMonth: string; price: number }) => {
                if (!pricesMap.has(priceEntry.symbol)) {
                    pricesMap.set(priceEntry.symbol, {});
                }
                const stockPrices = pricesMap.get(priceEntry.symbol)!;
                stockPrices[priceEntry.yearMonth] = priceEntry.price;
            });
            return Array.from(pricesMap.entries()).map(([stockSymbol, prices]) => ({ stockSymbol, prices }));
        });
    }

    setModal(null);
    alert('資料批次匯入成功！');
  }, []);

  const handleAutoFetchPrices = async () => {
    const symbols = Array.from(new Set(activeStocks.map(s => s.symbol)));
    if (symbols.length === 0) {
        alert("目前沒有持有任何股票，無法更新價格。");
        return;
    }

    // Construct query string: tse_{id}.tw|otc_{id}.tw for each symbol to cover both markets
    const channels = symbols.map(id => `tse_${id}.tw|otc_${id}.tw`).join('|');
    const twseUrl = `https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=${channels}&json=1&delay=0`;
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(twseUrl)}`;

    try {
      const response = await fetch(proxyUrl);
      const data = await response.json();
      const prices: {[key: string]: number} = {};

      if (data.msgArray && Array.isArray(data.msgArray)) {
        data.msgArray.forEach((item: any) => {
           const symbol = item.c;
           // z = recent trade price, y = yesterday closing (if no trade today or early morning)
           // Sometimes 'z' is '-' if no deal has been made yet.
           const tradePrice = item.z !== '-' ? item.z : item.y;
           const price = parseFloat(tradePrice);
           
           if (!isNaN(price) && price > 0) {
             // If we successfully parsed a price, store it. 
             // Since we query both TSE and OTC, we might get duplicates or invalid entries for the wrong market,
             // but usually the invalid market entry returns empty or partial data without 'z'/'y' or with 'z':'-' and no valid price.
             // We overwrite to ensure we capture the valid one.
             prices[symbol] = price;
           }
        });
      }

      if (Object.keys(prices).length > 0) {
         handleUpdateAllPrices(prices);
      } else {
         alert("無法從證交所取得有效資料，請稍後再試。");
      }
    } catch (error) {
      console.error("Auto fetch failed:", error);
      alert("更新失敗，請檢查網路連線或稍後再試。");
    }
  };

  const renderPage = () => {
    switch (page) {
      case 'DASHBOARD':
        return <DashboardPage 
                    stocks={stocks} 
                    dividends={dividends} 
                    settings={settings} 
                    theme={theme}
                    allStockSymbols={allStockSymbols}
                    filteredSymbols={dashboardFilteredSymbols}
                    onFilterChange={setDashboardFilteredSymbols}
                    availableYears={availableYears}
                    selectedYear={selectedDashboardYear}
                    onYearChange={setSelectedDashboardYear}
                    historicalPrices={historicalPrices}
                />;
      case 'PORTFOLIO':
        return <PortfolioPage 
                    stocks={activeStocks} 
                    settings={settings} 
                    onAdd={() => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'add' } })} 
                    onEdit={handleEditStock} 
                    onDelete={handleDeleteStock} 
                    onBuy={handleBuyStock} 
                    onSell={handleSellStock} 
                    selectedSymbols={selectedStockSymbols} 
                    toggleSelection={toggleStockSelection} 
                    clearSelection={() => setSelectedStockSymbols(new Set())} 
                    deleteSelected={handleDeleteSelectedStocks}
                    selectedTransactionIds={selectedTransactionIds}
                    toggleTransactionSelection={toggleTransactionSelection}
                    clearTransactionSelection={() => setSelectedTransactionIds(new Set())}
                    deleteSelectedTransactions={handleDeleteSelectedTransactions}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                    onAutoUpdate={handleAutoFetchPrices}
                />;
      case 'DIVIDENDS':
        return <DividendsPage 
                    stocks={stocks} 
                    dividends={dividends} 
                    settings={settings} 
                    onAdd={() => setModal({ type: 'DIVIDEND', data: { mode: 'add' } })} 
                    onEdit={handleEditDividend} 
                    onDelete={handleDeleteDividend} 
                    selectedGroups={selectedDividendGroups} 
                    toggleGroupSelection={toggleDividendGroupSelection} 
                    clearGroupSelection={() => setSelectedDividendGroups(new Set())} 
                    deleteSelectedGroups={handleDeleteSelectedDividendGroups}
                    selectedIds={selectedDividendIds}
                    toggleIdSelection={toggleDividendIdSelection}
                    clearIdSelection={() => setSelectedDividendIds(new Set())}
                    deleteSelectedIds={handleDeleteSelectedDividendIds}
                />;
      case 'BUDGET':
        return <BudgetPage
                    stocks={stocks}
                    dividends={dividends}
                    donations={donations}
                    budgetEntries={budgetEntries}
                    settings={settings}
                    onAdd={() => setModal({ type: 'BUDGET_ENTRY', data: { mode: 'add' } })}
                    onEdit={handleEditBudgetEntry}
                    onDelete={handleDeleteBudgetEntry}
                    selectedIds={selectedBudgetEntryIds}
                    toggleSelection={toggleBudgetEntrySelection}
                    clearSelection={() => setSelectedBudgetEntryIds(new Set())}
                    deleteSelected={handleDeleteSelectedBudgetEntries}
                />;
      case 'DONATION_FUND':
        return <DonationFundPage stats={portfolioCalculations} donations={donations} settings={settings} onAdd={() => setModal({ type: 'DONATION_FORM', data: { mode: 'add' } })} onEdit={handleEditDonation} onDelete={handleDeleteDonation} selectedIds={selectedDonationIds} toggleSelection={toggleDonationSelection} clearSelection={() => setSelectedDonationIds(new Set())} deleteSelected={handleDeleteSelectedDonations} />;
      case 'TRANSACTION_HISTORY':
        return <TransactionHistoryPage 
                    stocks={stocksWithSellHistory} 
                    settings={settings} 
                    onBuy={handleBuyStock} 
                    selectedGroups={selectedHistoryGroups} 
                    toggleGroupSelection={toggleHistoryGroupSelection} 
                    clearSelection={() => setSelectedHistoryGroups(new Set())} 
                    deleteSelected={handleDeleteSelectedHistoryGroups} 
                    selectedTransactionIds={selectedTransactionIds}
                    toggleTransactionSelection={toggleTransactionSelection}
                    clearTransactionSelection={() => setSelectedTransactionIds(new Set())}
                    deleteSelectedTransactions={handleDeleteSelectedTransactions}
                    onEditTransaction={handleEditTransaction}
                    onDeleteTransaction={handleDeleteTransaction}
                />;
      case 'HISTORICAL_PRICES':
          return <HistoricalPricesPage
                      stocks={stocks}
                      historicalPrices={historicalPrices}
                      onSave={setHistoricalPrices}
                      onOpenUpdateAllPricesModal={() => setModal({ type: 'UPDATE_ALL_PRICES', data: { stocks: activeStocks } })}
                  />;
      case 'SETTINGS':
        return <SettingsPage onExport={handleExportData} onImport={handleImportData} openModal={setModal} onBulkImport={handleBulkImport} />;
      case 'MORE':
        return <MorePage setPage={setPage} />;
      default:
        return <div className="p-8 text-center text-light-text/70 dark:text-dark-text/70">頁面開發中...</div>;
    }
  };

  return (
    <div className="flex bg-light-bg dark:bg-dark-bg">
      <Sidebar setPage={setPage} currentPage={page} theme={theme} toggleTheme={toggleTheme}/>
      <div className="flex-1 flex flex-col min-h-screen">
          <MobileHeader currentPage={page} theme={theme} toggleTheme={toggleTheme} />
          <main ref={mainContentRef} className="flex-1 p-4 pb-24 md:pb-8 md:p-8 overflow-y-auto">
            {renderPage()}
          </main>
          <BottomNav setPage={setPage} currentPage={page} />
          {isScrolled && <ScrollToTopButton mainRef={mainContentRef} />}
      </div>
      {modal && <ModalContainer modal={modal} closeModal={() => setModal(null)} onSaveTransaction={handleSaveTransaction} onSaveDividend={handleSaveDividend} onSaveDonation={handleSaveDonation} onSaveBudgetEntry={handleSaveBudgetEntry} onUpdateAllPrices={handleUpdateAllPrices} onBulkImport={handleBulkImport} stocks={stocks} settings={settings} historicalPrices={historicalPrices} />}
    </div>
  );
};

// --- Navigation Components ---
const allNavItems = [ 
    { id: 'DASHBOARD', icon: DashboardIcon, label: '總覽' }, 
    { id: 'PORTFOLIO', icon: PortfolioIcon, label: '我的持股' }, 
    { id: 'DIVIDENDS', icon: DividendIcon, label: '股利紀錄' },
    { id: 'BUDGET', icon: BudgetIcon, label: '投資預算' },
    { id: 'DONATION_FUND', icon: HeartIcon, label: '奉獻基金' }, 
    { id: 'TRANSACTION_HISTORY', icon: HistoryIcon, label: '賣出紀錄' }, 
    { id: 'HISTORICAL_PRICES', icon: PresentationChartLineIcon, label: '歷史股價' }, 
    { id: 'SETTINGS', icon: SettingsIcon, label: '設定' }
];

const mainBottomNavItems = allNavItems.slice(0, 4);
const moreBottomNavItem = { id: 'MORE', icon: GridIcon, label: '更多' };

const Sidebar: React.FC<{ setPage: (page: Page) => void; currentPage: Page, theme: 'light' | 'dark', toggleTheme: () => void; }> = ({ setPage, currentPage, theme, toggleTheme }) => {
    return (
        <nav className="hidden md:flex md:flex-col w-64 bg-light-card dark:bg-dark-card p-6 shadow-lg shrink-0">
          <div className="text-primary text-2xl font-bold mb-10">Portfolio Pilot</div>
          <ul className="space-y-4 flex-grow">{allNavItems.map(item => (<li key={item.id}><button onClick={() => setPage(item.id as Page)} className={`w-full flex items-center p-4 rounded-lg transition-colors ${ currentPage === item.id ? 'bg-primary text-primary-foreground' : 'hover:bg-light-bg dark:hover:bg-dark-bg'}`}><item.icon className="h-6 w-6" /> <span className="ml-4 font-medium">{item.label}</span></button></li>))}</ul>
          <div className="mt-4"><button onClick={toggleTheme} className="w-full flex items-center p-4 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg"><span className="mr-4">{theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}</span> {theme === 'light' ? '夜間模式' : '日間模式'}</button></div>
        </nav>
    );
};
const BottomNav: React.FC<{ setPage: (page: Page) => void; currentPage: Page }> = ({ setPage, currentPage }) => {
    const isMorePageActive = !mainBottomNavItems.some(item => item.id === currentPage);
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-light-card dark:bg-dark-card border-t border-light-border dark:border-dark-border flex justify-around p-2 z-20">
            {mainBottomNavItems.map(item => (<button key={item.id} onClick={() => setPage(item.id as Page)} className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors ${ currentPage === item.id ? 'text-primary' : 'text-light-text/70 dark:text-dark-text/70'}`}><item.icon className="h-6 w-6 mb-1" /> <span className="text-xs">{item.label}</span></button>))}
            <button key={moreBottomNavItem.id} onClick={() => setPage(moreBottomNavItem.id as Page)} className={`flex flex-col items-center justify-center w-16 h-16 rounded-lg transition-colors ${ isMorePageActive ? 'text-primary' : 'text-light-text/70 dark:text-dark-text/70'}`}><moreBottomNavItem.icon className="h-6 w-6 mb-1" /> <span className="text-xs">{moreBottomNavItem.label}</span></button>
        </nav>
    )
};
const MobileHeader: React.FC<{ currentPage: Page, theme: 'light' | 'dark', toggleTheme: () => void }> = ({ currentPage, theme, toggleTheme }) => (
    <header className="md:hidden flex justify-between items-center px-5 py-4 bg-light-card dark:bg-dark-card shadow-sm sticky top-0 z-20"><h1 className="text-xl font-bold">{pageTitles[currentPage]}</h1><button onClick={toggleTheme} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">{theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}</button></header>
);


export default App;