
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DashboardIcon, PortfolioIcon, DividendIcon, HeartIcon, SettingsIcon, SunIcon, MoonIcon, HistoryIcon, PresentationChartLineIcon, BudgetIcon, GridIcon, ChartBarSquareIcon, StrategyIcon } from './components/Icons';
import type { Stock, Dividend, Settings, Page, Transaction, Donation, HistoricalPrice, BudgetEntry, Strategy, StockMetadataMap } from './types';
import { useLocalStorage } from './hooks/useLocalStorage';
import { calculateStockFinancials } from './utils/calculations';
import { initialStockMetadataMap } from './utils/data';

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
  
  // 動態標的資料庫
  const [stockMetadata, setStockMetadata] = useLocalStorage<StockMetadataMap>('portfolio-stock-metadata', initialStockMetadataMap);

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

  const handleExportData = () => {
    const exportContent = {
      stocks,
      dividends,
      donations,
      budgetEntries,
      historicalPrices,
      strategies,
      settings,
      stockMetadata, // 同步匯出標的庫
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `investment-full-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    if (data.stockMetadata) setStockMetadata(data.stockMetadata);
    
    setModal(null);
    setPage('DASHBOARD');
    alert('資料與標的資料庫已成功還原！');
  };

  const handleSaveTransaction = (formData: any, mode: 'add' | 'edit' | 'buy' | 'sell', id?: string) => {
    setStocks(prev => {
      let newStocks = [...prev];
      let stockIndex = newStocks.findIndex(s => s.symbol === formData.symbol);
      
      const newTransaction = { id: id || crypto.randomUUID(), type: formData.type, shares: formData.shares, price: formData.price, date: formData.date, fees: formData.fees };

      if (stockIndex === -1) {
        newStocks.push({
          symbol: formData.symbol,
          // 從標的資料庫抓名稱
          name: formData.name || stockMetadata[formData.symbol]?.name || formData.symbol,
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

  const handleSaveMetadata = (meta: any) => {
    setStockMetadata(prev => ({ ...prev, [meta.symbol]: meta }));
    setModal(null);
  };

  const handleDeleteMetadata = (symbol: string) => {
    setStockMetadata(prev => {
      const next = { ...prev };
      delete next[symbol];
      return next;
    });
  };

  // FIX: Added missing handleSaveStrategy function.
  const handleSaveStrategy = (s: Omit<Strategy, 'id'>, id?: string) => {
    setStrategies(prev => {
      if (id) {
        return prev.map(x => x.id === id ? { ...x, ...s } : x);
      }
      return [...prev, { ...s, id: crypto.randomUUID() }];
    });
    setModal(null);
  };

  // FIX: Added missing handleUpdateAllPrices function.
  const handleUpdateAllPrices = (newPrices: { [symbol: string]: number }) => {
    setStocks(prev => prev.map(s => newPrices[s.symbol] !== undefined ? { ...s, currentPrice: newPrices[s.symbol] } : s));
    
    // Also record into historical prices for the current month
    const now = new Date();
    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    setHistoricalPrices(prev => {
      const next = [...prev];
      Object.entries(newPrices).forEach(([symbol, price]) => {
        const idx = next.findIndex(hp => hp.stockSymbol === symbol);
        if (idx > -1) {
          next[idx] = { ...next[idx], prices: { ...next[idx].prices, [yearMonth]: price } };
        } else {
          next.push({ stockSymbol: symbol, prices: { [yearMonth]: price } });
        }
      });
      return next;
    });
    
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
      case 'DASHBOARD': return <DashboardPage stocks={stocks} dividends={dividends} settings={settings} theme={theme} allStockSymbols={allStockSymbols} filteredSymbols={dashboardFilteredSymbols} onFilterChange={setDashboardFilteredSymbols} availableYears={availableYears} selectedYear={selectedDashboardYear} onYearChange={setSelectedDashboardYear} historicalPrices={historicalPrices} stockMetadata={stockMetadata} />;
      case 'PORTFOLIO': return <PortfolioPage stocks={activeStocks} settings={settings} stockMetadata={stockMetadata} onAdd={() => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'add' } })} onEdit={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock: s } })} onDelete={handleDeleteStock} onBuy={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'buy', stock: s } })} onSell={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'sell', stock: s } })} onEditTransaction={(sym, id) => { const stock = stocks.find(s => s.symbol === sym); const tx = stock?.transactions.find(t => t.id === id); setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock, transaction: tx } }); }} onDeleteTransaction={(sym, id) => setStocks(prev => prev.map(s => s.symbol === sym ? { ...s, transactions: s.transactions.filter(t => t.id !== id) } : s))} selectedSymbols={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} selectedTransactionIds={new Set()} toggleTransactionSelection={() => {}} clearTransactionSelection={() => {}} deleteSelectedTransactions={() => {}} onAutoUpdate={async () => {}} />;
      case 'DIVIDENDS': return <DividendsPage stocks={stocks} dividends={dividends} settings={settings} stockMetadata={stockMetadata} onAdd={() => setModal({ type: 'DIVIDEND', data: { mode: 'add' } })} onEdit={(d) => setModal({type: 'DIVIDEND', data: { mode: 'edit', dividend: d }})} onDelete={(d) => setDividends(prev => prev.filter(x => x.id !== d.id))} selectedGroups={new Set()} toggleGroupSelection={() => {}} clearGroupSelection={() => {}} deleteSelectedGroups={() => {}} selectedIds={new Set()} toggleIdSelection={() => {}} clearIdSelection={() => {}} deleteSelectedIds={() => {}} />;
      case 'TOTAL_RETURN': return <TotalReturnPage stocks={activeStocks} dividends={dividends} settings={settings} stockMetadata={stockMetadata} />;
      case 'STRATEGY': return <StrategyPage strategies={strategies} stocks={activeStocks} dividends={dividends} settings={settings} theme={theme} stockMetadata={stockMetadata} onAdd={() => setModal({ type: 'STRATEGY_FORM', data: { mode: 'add' } })} onEdit={(s) => setModal({ type: 'STRATEGY_FORM', data: { mode: 'edit', strategy: s } })} onDelete={(id) => setStrategies(prev => prev.filter(x => x.id !== id))} onSave={(s, id) => { setStrategies(prev => { const idx = prev.findIndex(x => x.id === id); if(idx > -1) { const n = [...prev]; n[idx] = { ...n[idx], ...s }; return n; } return [...prev, { ...s, id: crypto.randomUUID() }]; }); setModal(null); }} onReorder={setStrategies} />;
      case 'SETTINGS': return <SettingsPage stockMetadata={stockMetadata} onSaveMetadata={handleSaveMetadata} onDeleteMetadata={handleDeleteMetadata} onOpenMetadataModal={(m) => setModal({ type: 'METADATA_FORM', data: { mode: m ? 'edit' : 'add', meta: m } })} onExport={handleExportData} onImport={handleImportData} openModal={setModal} onBulkImport={(t, d) => {}} />;
      case 'BUDGET': return <BudgetPage stocks={stocks} dividends={dividends} donations={donations} budgetEntries={budgetEntries} settings={settings} onAdd={() => setModal({ type: 'BUDGET_ENTRY', data: { mode: 'add' } })} onEdit={(e) => setModal({type: 'BUDGET_ENTRY', data: { mode: 'edit', entry: e }})} onDelete={(e) => setBudgetEntries(prev => prev.filter(x => x.id !== e.id))} selectedIds={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} />;
      case 'DONATION_FUND': return <DonationFundPage stats={portfolioCalculations} donations={donations} settings={settings} onAdd={() => setModal({ type: 'DONATION_FORM', data: { mode: 'add' } })} onEdit={(d) => setModal({type: 'DONATION_FORM', data: { mode: 'edit', donation: d }})} onDelete={(d) => setDonations(prev => prev.filter(x => x.id !== d.id))} selectedIds={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} />;
      case 'TRANSACTION_HISTORY': return <TransactionHistoryPage stocks={stocksWithSellHistory} settings={settings} stockMetadata={stockMetadata} onBuy={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'buy', stock: s } })} onEditTransaction={(sym, id) => { const stock = stocks.find(s => s.symbol === sym); const tx = stock?.transactions.find(t => t.id === id); setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock, transaction: tx } }); }} onDeleteTransaction={(sym, id) => setStocks(prev => prev.map(s => s.symbol === sym ? { ...s, transactions: s.transactions.filter(t => t.id !== id) } : s))} selectedGroups={new Set()} toggleGroupSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} selectedTransactionIds={new Set()} toggleTransactionSelection={() => {}} clearTransactionSelection={() => {}} deleteSelectedTransactions={() => {}} />;
      case 'HISTORICAL_PRICES': return <HistoricalPricesPage stocks={stocks} historicalPrices={historicalPrices} stockMetadata={stockMetadata} onSave={setHistoricalPrices} onOpenUpdateAllPricesModal={() => setModal({ type: 'UPDATE_ALL_PRICES', data: { stocks: activeStocks } })} />;
      case 'MORE': return <MorePage setPage={setPage} />;
      default: return null;
    }
  };

  return (
    <div className="flex bg-light-bg dark:bg-dark-bg min-h-screen font-sans">
      <Sidebar setPage={setPage} currentPage={page} theme={theme} toggleTheme={toggleTheme}/>
      <div className="flex-1 flex flex-col">
          <MobileHeader currentPage={page} theme={theme} toggleTheme={toggleTheme} />
          <main ref={mainContentRef} className="flex-1 p-4 pb-24 md:pb-8 md:p-8 overflow-y-auto">
            {renderPage()}
          </main>
          <BottomNav setPage={setPage} currentPage={page} />
          <ScrollToTopButton mainRef={mainContentRef} />
      </div>
      {modal && <ModalContainer modal={modal} closeModal={() => setModal(null)} onSaveTransaction={handleSaveTransaction} onSaveStrategy={handleSaveStrategy} onSaveDividend={(d, id) => setDividends(prev => id ? prev.map(x => x.id === id ? { ...d, id } : x) : [...prev, { ...d, id: crypto.randomUUID() }])} onSaveDonation={(d, id) => setDonations(prev => id ? prev.map(x => x.id === id ? { ...d, id } : x) : [...prev, { ...d, id: crypto.randomUUID() }])} onSaveBudgetEntry={(d, id) => setBudgetEntries(prev => id ? prev.map(x => x.id === id ? { ...d, id } : x) : [...prev, { ...d, id: crypto.randomUUID() }])} onUpdateAllPrices={handleUpdateAllPrices} onBulkImport={() => {}} stocks={stocks} settings={settings} historicalPrices={historicalPrices} stockMetadata={stockMetadata} onSaveMetadata={handleSaveMetadata} />}
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
