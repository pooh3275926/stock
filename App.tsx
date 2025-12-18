
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DashboardIcon, PortfolioIcon, DividendIcon, HeartIcon, SettingsIcon, SunIcon, MoonIcon, HistoryIcon, PresentationChartLineIcon, BudgetIcon, GridIcon, ChartBarSquareIcon, StrategyIcon } from './components/Icons';
import type { Stock, Dividend, Settings, Page, Transaction, Donation, HistoricalPrice, BudgetEntry, Strategy } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateStockFinancials } from './utils/calculations';
import { stockMaster } from './utils/data';

import { DashboardPage } from './pages/DashboardPage';
import { PortfolioPage } from './pages/PortfolioPage';
import { DividendsPage } from './pages/DividendsPage';
import { TotalReturnPage } from './pages/TotalReturnPage';
import { StrategyPage } from './pages/StrategyPage';
import { DonationFundPage } from './pages/DonationFundPage';
import { TransactionHistoryPage } from './pages/TransactionHistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { HistoricalPricesPage } from './pages/HistoricalPricesPage';
import { BudgetPage } from './pages/BudgetPage';
import { MorePage } from './pages/MorePage';
import { ModalContainer, ModalState } from './components/modals';
import { ScrollToTopButton } from './components/common';

const pageTitles: { [key in Page]: string } = {
  DASHBOARD: '股票總覽',
  PORTFOLIO: '我的持股',
  DIVIDENDS: '股利紀錄',
  TOTAL_RETURN: '含息損益',
  STRATEGY: '複利實驗室',
  BUDGET: '投資預算',
  DONATION_FUND: '奉獻基金',
  TRANSACTION_HISTORY: '交易紀錄',
  HISTORICAL_PRICES: '歷史股價',
  SETTINGS: '資料設定',
  MORE: '更多功能',
};

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('DASHBOARD');
  const [stocks, setStocks] = useLocalStorage<Stock[]>('portfolio-stocks', []);
  const [dividends, setDividends] = useLocalStorage<Dividend[]>('portfolio-dividends', []);
  const [donations, setDonations] = useLocalStorage<Donation[]>('portfolio-donations', []);
  const [budgetEntries, setBudgetEntries] = useLocalStorage<BudgetEntry[]>('portfolio-budget-entries', []);
  const [historicalPrices, setHistoricalPrices] = useLocalStorage<HistoricalPrice[]>('portfolio-historical-prices', []);
  const [strategies, setStrategies] = useLocalStorage<Strategy[]>('portfolio-strategies', []);
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

  const mainContentRef = useRef<HTMLElement>(null);

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

  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  // --- 核心數據處理函數 (修正匯出匯入) ---

  const handleExportData = () => {
    const exportContent = {
      stocks,
      dividends,
      donations,
      budgetEntries,
      historicalPrices,
      strategies,
      settings,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `investment-backup-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (data: any) => {
    if (data.stocks) setStocks(data.stocks);
    if (data.dividends) setDividends(data.dividends);
    if (data.donations) setDonations(data.donations);
    if (data.budgetEntries) setBudgetEntries(data.budgetEntries);
    if (data.historicalPrices) setHistoricalPrices(data.historicalPrices);
    if (data.strategies) setStrategies(data.strategies);
    if (data.settings) setSettings(data.settings);
    
    setModal(null);
    setPage('DASHBOARD');
    alert('資料已成功還原！');
  };

  const handleSaveTransaction = (formData: any, mode: 'add' | 'edit' | 'buy' | 'sell', id?: string) => {
    setStocks(prev => {
      let newStocks = [...prev];
      let stockIndex = newStocks.findIndex(s => s.symbol === formData.symbol);
      
      const newTransaction = {
        id: id || crypto.randomUUID(),
        type: formData.type,
        shares: formData.shares,
        price: formData.price,
        date: formData.date,
        fees: formData.fees
      };

      if (stockIndex === -1) {
        newStocks.push({
          symbol: formData.symbol,
          name: formData.name || stockMaster[formData.symbol] || formData.symbol,
          currentPrice: formData.currentPrice || formData.price,
          transactions: [newTransaction]
        });
      } else {
        const stock = { ...newStocks[stockIndex] };
        if (formData.currentPrice !== undefined) stock.currentPrice = formData.currentPrice;
        
        if (mode === 'edit') {
          stock.transactions = stock.transactions.map(t => t.id === id ? newTransaction : t);
        } else {
          stock.transactions = [...stock.transactions, newTransaction];
        }
        newStocks[stockIndex] = stock;
      }
      return newStocks;
    });
    setModal(null);
  };

  const handleDeleteStock = (stock: Stock) => {
    const confirmDelete = () => {
      setStocks(prev => prev.filter(s => s.symbol !== stock.symbol));
      setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: `刪除股票 ${stock.symbol}` } });
  };

  const handleDeleteTransaction = (symbol: string, id: string) => {
    setStocks(prev => prev.map(s => {
      if (s.symbol === symbol) {
        return { ...s, transactions: s.transactions.filter(t => t.id !== id) };
      }
      return s;
    }));
  };

  const handleSaveDividend = (data: Omit<Dividend, 'id'>, id?: string) => {
    setDividends(prev => {
      if (id) return prev.map(d => d.id === id ? { ...data, id } : d);
      return [...prev, { ...data, id: crypto.randomUUID() }];
    });
    setModal(null);
  };

  const handleDeleteDividend = (div: Dividend) => {
    setDividends(prev => prev.filter(d => d.id !== div.id));
  };

  const handleSaveDonation = (data: Omit<Donation, 'id'>, id?: string) => {
    setDonations(prev => {
      if (id) return prev.map(d => d.id === id ? { ...data, id } : d);
      return [...prev, { ...data, id: crypto.randomUUID() }];
    });
    setModal(null);
  };

  const handleDeleteDonation = (don: Donation) => {
    setDonations(prev => prev.filter(d => d.id !== don.id));
  };

  const handleSaveBudgetEntry = (data: Omit<BudgetEntry, 'id'>, id?: string) => {
    setBudgetEntries(prev => {
      if (id) return prev.map(e => e.id === id ? { ...data, id } : e);
      return [...prev, { ...data, id: crypto.randomUUID() }];
    });
    setModal(null);
  };

  const handleDeleteBudgetEntry = (ent: BudgetEntry) => {
    setBudgetEntries(prev => prev.filter(e => e.id !== ent.id));
  };

  const handleSaveStrategy = (strategyData: Omit<Strategy, 'id'>, id?: string) => {
    setStrategies(prev => {
       const index = prev.findIndex(s => s.id === id || (s.targetSymbol === strategyData.targetSymbol));
       if (index > -1) {
          const newStrategies = [...prev];
          newStrategies[index] = { ...newStrategies[index], ...strategyData, id: prev[index].id };
          return newStrategies;
       }
       return [...prev, { ...strategyData, id: crypto.randomUUID() }];
    });
    setModal(null);
  };

  const handleReorderStrategies = (newStrategies: Strategy[]) => {
    setStrategies(newStrategies);
  };
  
  const handleDeleteStrategy = (id: string) => {
    const confirmDelete = () => {
      setStrategies(prev => prev.filter(s => s.id !== id));
      setModal(null);
    };
    setModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmDelete, title: '刪除複利策略' } });
  };

  const handleUpdateAllPrices = (newPrices: { [symbol: string]: number }) => {
    setStocks(prev => prev.map(stock => {
      if (newPrices[stock.symbol]) {
        return { ...stock, currentPrice: newPrices[stock.symbol] };
      }
      return stock;
    }));
    
    // 同時記錄到歷史價格
    const currentYearMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    setHistoricalPrices(prev => {
      let newHistorical = [...prev];
      Object.entries(newPrices).forEach(([symbol, price]) => {
        let hpIndex = newHistorical.findIndex(hp => hp.stockSymbol === symbol);
        if (hpIndex === -1) {
          newHistorical.push({ stockSymbol: symbol, prices: { [currentYearMonth]: price } });
        } else {
          newHistorical[hpIndex] = {
            ...newHistorical[hpIndex],
            prices: { ...newHistorical[hpIndex].prices, [currentYearMonth]: price }
          };
        }
      });
      return newHistorical;
    });
    setModal(null);
  };

  const handleBulkImport = (type: string, data: any[]) => {
    if (type === 'transactions') {
      data.forEach(item => {
        handleSaveTransaction(item, 'add');
      });
    } else if (type === 'dividends') {
      setDividends(prev => [...prev, ...data.map(d => ({ ...d, id: crypto.randomUUID() }))]);
    } else if (type === 'donations') {
      setDonations(prev => [...prev, ...data.map(d => ({ ...d, id: crypto.randomUUID() }))]);
    } else if (type === 'prices') {
      setHistoricalPrices(prev => {
        let newHistory = [...prev];
        data.forEach(item => {
          let hpIndex = newHistory.findIndex(hp => hp.stockSymbol === item.symbol);
          if (hpIndex === -1) {
            newHistory.push({ stockSymbol: item.symbol, prices: { [item.yearMonth]: item.price } });
          } else {
            newHistory[hpIndex] = {
              ...newHistory[hpIndex],
              prices: { ...newHistory[hpIndex].prices, [item.yearMonth]: item.price }
            };
          }
        });
        return newHistory;
      });
    }
    setModal(null);
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
    return { totalCost: totalCurrentCost, totalMarketValue, totalRealizedPnl, totalDividends };
  }, [stocks, dividends]);

  const activeStocks = useMemo(() => stocks.filter(s => calculateStockFinancials(s).currentShares > 0), [stocks]);
  const stocksWithSellHistory = useMemo(() => stocks.filter(s => calculateStockFinancials(s).hasSell).map(s => ({...s, financials: calculateStockFinancials(s)})), [stocks]);

  const renderPage = () => {
    switch (page) {
      case 'STRATEGY':
        return <StrategyPage 
                  strategies={strategies} 
                  stocks={activeStocks}
                  dividends={dividends}
                  settings={settings} 
                  theme={theme}
                  onAdd={() => setModal({ type: 'STRATEGY_FORM', data: { mode: 'add' } })}
                  onEdit={(s) => setModal({ type: 'STRATEGY_FORM', data: { mode: 'edit', strategy: s } })}
                  onDelete={handleDeleteStrategy}
                  onSave={handleSaveStrategy}
                  onReorder={handleReorderStrategies}
                />;
      case 'DASHBOARD': return <DashboardPage stocks={stocks} dividends={dividends} settings={settings} theme={theme} allStockSymbols={allStockSymbols} filteredSymbols={dashboardFilteredSymbols} onFilterChange={setDashboardFilteredSymbols} availableYears={availableYears} selectedYear={selectedDashboardYear} onYearChange={setSelectedDashboardYear} historicalPrices={historicalPrices} />;
      case 'PORTFOLIO': return <PortfolioPage stocks={activeStocks} settings={settings} onAdd={() => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'add' } })} onEdit={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock: s } })} onDelete={handleDeleteStock} onBuy={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'buy', stock: s } })} onSell={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'sell', stock: s } })} selectedSymbols={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} selectedTransactionIds={new Set()} toggleTransactionSelection={() => {}} clearTransactionSelection={() => {}} deleteSelectedTransactions={() => {}} onEditTransaction={(sym, id) => { const stock = stocks.find(s => s.symbol === sym); const tx = stock?.transactions.find(t => t.id === id); setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock, transaction: tx } }); }} onDeleteTransaction={handleDeleteTransaction} onAutoUpdate={async () => { alert('自動更新功能需對接交易所 API，目前請使用手動「一鍵更新」。'); }} />;
      case 'DIVIDENDS': return <DividendsPage stocks={stocks} dividends={dividends} settings={settings} onAdd={() => setModal({ type: 'DIVIDEND', data: { mode: 'add' } })} onEdit={(d) => setModal({type: 'DIVIDEND', data: { mode: 'edit', dividend: d }})} onDelete={handleDeleteDividend} selectedGroups={new Set()} toggleGroupSelection={() => {}} clearGroupSelection={() => {}} deleteSelectedGroups={() => {}} selectedIds={new Set()} toggleIdSelection={() => {}} clearIdSelection={() => {}} deleteSelectedIds={() => {}} />;
      case 'TOTAL_RETURN': return <TotalReturnPage stocks={activeStocks} dividends={dividends} settings={settings} />;
      case 'BUDGET': return <BudgetPage stocks={stocks} dividends={dividends} donations={donations} budgetEntries={budgetEntries} settings={settings} onAdd={() => setModal({ type: 'BUDGET_ENTRY', data: { mode: 'add' } })} onEdit={(e) => setModal({type: 'BUDGET_ENTRY', data: { mode: 'edit', entry: e }})} onDelete={handleDeleteBudgetEntry} selectedIds={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} />;
      case 'DONATION_FUND': return <DonationFundPage stats={portfolioCalculations} donations={donations} settings={settings} onAdd={() => setModal({ type: 'DONATION_FORM', data: { mode: 'add' } })} onEdit={(d) => setModal({type: 'DONATION_FORM', data: { mode: 'edit', donation: d }})} onDelete={handleDeleteDonation} selectedIds={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} />;
      case 'TRANSACTION_HISTORY': return <TransactionHistoryPage stocks={stocksWithSellHistory} settings={settings} onBuy={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'buy', stock: s } })} selectedGroups={new Set()} toggleGroupSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} selectedTransactionIds={new Set()} toggleTransactionSelection={() => {}} clearTransactionSelection={() => {}} deleteSelectedTransactions={() => {}} onEditTransaction={(sym, id) => { const stock = stocks.find(s => s.symbol === sym); const tx = stock?.transactions.find(t => t.id === id); setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock, transaction: tx } }); }} onDeleteTransaction={handleDeleteTransaction} />;
      case 'HISTORICAL_PRICES': return <HistoricalPricesPage stocks={stocks} historicalPrices={historicalPrices} onSave={setHistoricalPrices} onOpenUpdateAllPricesModal={() => setModal({ type: 'UPDATE_ALL_PRICES', data: { stocks: activeStocks } })} />;
      case 'SETTINGS': return <SettingsPage onExport={handleExportData} onImport={handleImportData} openModal={setModal} onBulkImport={handleBulkImport} />;
      case 'MORE': return <MorePage setPage={setPage} />;
      default: return null;
    }
  };

  return (
    <div className="flex bg-light-bg dark:bg-dark-bg min-h-screen">
      <Sidebar setPage={setPage} currentPage={page} theme={theme} toggleTheme={toggleTheme}/>
      <div className="flex-1 flex flex-col">
          <MobileHeader currentPage={page} theme={theme} toggleTheme={toggleTheme} />
          <main ref={mainContentRef} className="flex-1 p-4 pb-24 md:pb-8 md:p-8 overflow-y-auto">
            {renderPage()}
          </main>
          <BottomNav setPage={setPage} currentPage={page} />
          <ScrollToTopButton mainRef={mainContentRef} />
      </div>
      {modal && <ModalContainer modal={modal} closeModal={() => setModal(null)} onSaveTransaction={handleSaveTransaction} onSaveStrategy={handleSaveStrategy} onSaveDividend={handleSaveDividend} onSaveDonation={handleSaveDonation} onSaveBudgetEntry={handleSaveBudgetEntry} onUpdateAllPrices={handleUpdateAllPrices} onBulkImport={handleBulkImport} stocks={stocks} settings={settings} historicalPrices={historicalPrices} />}
    </div>
  );
};

const Sidebar: React.FC<any> = ({ setPage, currentPage, theme, toggleTheme }) => (
    <nav className="hidden md:flex md:flex-col w-64 bg-light-card dark:bg-dark-card p-6 shadow-lg shrink-0 border-r border-light-border dark:border-dark-border">
      <div className="text-primary text-2xl font-black mb-10 tracking-tighter">STOCK PILOT</div>
      <ul className="space-y-2 flex-grow">
          {allNavItems.map(item => (<li key={item.id}><button onClick={() => setPage(item.id)} className={`w-full flex items-center p-4 rounded-2xl transition-all ${ currentPage === item.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'hover:bg-light-bg dark:hover:bg-dark-bg text-light-text/70 dark:text-dark-text/70'}`}><item.icon className="h-6 w-6" /> <span className="ml-4 font-bold">{item.label}</span></button></li>))}
      </ul>
      <button onClick={toggleTheme} className="w-full flex items-center p-4 rounded-2xl hover:bg-light-bg dark:hover:bg-dark-bg text-light-text/70 dark:text-dark-text/70 transition-all mt-4"><span className="mr-4">{theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}</span> {theme === 'light' ? '夜間模式' : '日間模式'}</button>
    </nav>
);

const allNavItems = [ 
    { id: 'DASHBOARD', icon: DashboardIcon, label: '股票總覽' }, 
    { id: 'PORTFOLIO', icon: PortfolioIcon, label: '我的持股' }, 
    { id: 'DIVIDENDS', icon: DividendIcon, label: '股利紀錄' },
    { id: 'TOTAL_RETURN', icon: ChartBarSquareIcon, label: '含息損益' },
    { id: 'STRATEGY', icon: StrategyIcon, label: '複利實驗室' },
    { id: 'BUDGET', icon: BudgetIcon, label: '投資預算' },
    { id: 'DONATION_FUND', icon: HeartIcon, label: '奉獻基金' }, 
    { id: 'TRANSACTION_HISTORY', icon: HistoryIcon, label: '賣出紀錄' }, 
    { id: 'HISTORICAL_PRICES', icon: PresentationChartLineIcon, label: '歷史股價' }, 
    { id: 'SETTINGS', icon: SettingsIcon, label: '資料設定' }
];

const mainBottomNavItems = [ { id: 'DASHBOARD', icon: DashboardIcon, label: '總覽' }, { id: 'PORTFOLIO', icon: PortfolioIcon, label: '持股' }, { id: 'DIVIDENDS', icon: DividendIcon, label: '股利' }, { id: 'STRATEGY', icon: StrategyIcon, label: '實驗' }];
const moreBottomNavItem = { id: 'MORE', icon: GridIcon, label: '更多' };
const BottomNav: React.FC<any> = ({ setPage, currentPage }) => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-light-card/80 dark:bg-dark-card/80 backdrop-blur-lg border-t border-light-border dark:border-dark-border flex justify-around p-2 z-40">
        {mainBottomNavItems.map(item => (<button key={item.id} onClick={() => setPage(item.id)} className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${ currentPage === item.id ? 'text-primary' : 'text-light-text/50 dark:text-dark-text/40'}`}><item.icon className="h-6 w-6 mb-1" /> <span className="text-[10px] font-black">{item.label}</span></button>))}
        <button onClick={() => setPage('MORE')} className={`flex flex-col items-center justify-center w-16 h-16 rounded-xl transition-all ${ currentPage === 'MORE' ? 'text-primary' : 'text-light-text/50 dark:text-dark-text/40'}`}><moreBottomNavItem.icon className="h-6 w-6 mb-1" /> <span className="text-[10px] font-black">{moreBottomNavItem.label}</span></button>
    </nav>
);
const MobileHeader: React.FC<any> = ({ currentPage, theme, toggleTheme }) => (<header className="md:hidden flex justify-between items-center px-6 py-4 bg-light-card dark:bg-dark-card border-b border-light-border dark:border-dark-border sticky top-0 z-30"><h1 className="text-xl font-black tracking-tight">{pageTitles[currentPage] || '更多功能'}</h1><button onClick={toggleTheme} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">{theme === 'light' ? <MoonIcon className="h-6 w-6" /> : <SunIcon className="h-6 w-6" />}</button></header>);

export default App;
