
import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { DashboardIcon, PortfolioIcon, DividendIcon, HeartIcon, SettingsIcon, HistoryIcon, PresentationChartLineIcon, BudgetIcon, GridIcon, ChartBarSquareIcon, StrategyIcon, ArrowUpIcon } from './components/Icons';
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

const pageTitles: { [key in Page]: string } = {
  DASHBOARD: '股票總覽',
  PORTFOLIO: '我的持股',
  DIVIDENDS: '股利紀錄',
  TOTAL_RETURN: '含息損益',
  STRATEGY: '複利實驗室',
  BUDGET: '投資預算',
  DONATION_FUND: '奉獻基金',
  TRANSACTION_HISTORY: '賣出紀錄',
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
  const [stockMetadata, setStockMetadata] = useLocalStorage<StockMetadataMap>('portfolio-stock-metadata', initialStockMetadataMap);
  const [settings, setSettings] = useLocalStorage<Settings>('portfolio-settings', { currency: 'TWD', transactionFeeRate: 0.001425, taxRate: 0.001, displayMode: 'PERCENTAGE' });
  const [modal, setModal] = useState<ModalState | null>(null);
  
  const mainContentRef = useRef<HTMLElement>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (mainContentRef.current) {
        setShowScrollTop(mainContentRef.current.scrollTop > 400);
      }
    };
    const mainEl = mainContentRef.current;
    mainEl?.addEventListener('scroll', handleScroll);
    return () => mainEl?.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    mainContentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleExportData = () => {
    const exportContent = {
      stocks, dividends, donations, budgetEntries, historicalPrices, strategies, settings, stockMetadata,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(exportContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `stock-pilot-full-backup-${new Date().toISOString().split('T')[0]}.json`;
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
    alert('資料還原成功！');
  };

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

  const handleAutoUpdate = async () => {
    try {
      const fetchWithProxy = async (url: string) => {
        const response = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
      };
      const [twseResult, tpexResult] = await Promise.allSettled([
        fetchWithProxy('https://openapi.twse.com.tw/v1/exchangeReport/STOCK_DAY_AVG_ALL'),
        fetchWithProxy('https://www.tpex.org.tw/openapi/v1/tpex_mainboard_quotes')
      ]);
      const priceMap: { [key: string]: number } = {};
      if (twseResult.status === 'fulfilled' && Array.isArray(twseResult.value)) {
        twseResult.value.forEach((item: any) => {
          const price = parseFloat(item.ClosingPrice);
          if (!isNaN(price) && item.Code) priceMap[item.Code] = price;
        });
      }
      if (tpexResult.status === 'fulfilled' && Array.isArray(tpexResult.value)) {
        tpexResult.value.forEach((item: any) => {
          const price = parseFloat(item.Close);
          if (!isNaN(price) && item.SecId) priceMap[item.SecId] = price;
        });
      }
      const updatedCount = Object.keys(priceMap).length;
      if (updatedCount > 0) {
        setStocks(prev => prev.map(s => priceMap[s.symbol] !== undefined ? { ...s, currentPrice: priceMap[s.symbol] } : s));
        alert(`更新成功！已同步 ${updatedCount} 檔股票現價。`);
      } else {
        throw new Error('未取得有效資料');
      }
    } catch (error) {
      console.error('Update failed:', error);
      alert('自動更新失敗，請稍後再試。');
    }
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
      case 'DASHBOARD': return <DashboardPage stocks={stocks} dividends={dividends} settings={settings} allStockSymbols={allStockSymbols} filteredSymbols={dashboardFilteredSymbols} onFilterChange={setDashboardFilteredSymbols} availableYears={availableYears} selectedYear={selectedDashboardYear} onYearChange={setSelectedDashboardYear} historicalPrices={historicalPrices} stockMetadata={stockMetadata} />;
      case 'PORTFOLIO': return <PortfolioPage stocks={activeStocks} settings={settings} stockMetadata={stockMetadata} onAdd={() => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'add' } })} onEdit={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock: s } })} onDelete={(s) => setStocks(prev => prev.filter(x => x.symbol !== s.symbol))} onBuy={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'buy', stock: s } })} onSell={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'sell', stock: s } })} onEditTransaction={(sym, id) => { const stock = stocks.find(s => s.symbol === sym); const tx = stock?.transactions.find(t => t.id === id); setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock, transaction: tx } }); }} onDeleteTransaction={(sym, id) => setStocks(prev => prev.map(s => s.symbol === sym ? { ...s, transactions: s.transactions.filter(t => t.id !== id) } : s))} selectedSymbols={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} selectedTransactionIds={new Set()} toggleTransactionSelection={() => {}} clearTransactionSelection={() => {}} deleteSelectedTransactions={() => {}} onAutoUpdate={handleAutoUpdate} />;
      case 'DIVIDENDS': return <DividendsPage stocks={stocks} dividends={dividends} settings={settings} stockMetadata={stockMetadata} onAdd={() => setModal({ type: 'DIVIDEND', data: { mode: 'add' } })} onEdit={(d) => setModal({type: 'DIVIDEND', data: { mode: 'edit', dividend: d }})} onDelete={(d) => setDividends(prev => prev.filter(x => x.id !== d.id))} selectedGroups={new Set()} toggleGroupSelection={() => {}} clearGroupSelection={() => {}} deleteSelectedGroups={() => {}} selectedIds={new Set()} toggleIdSelection={() => {}} clearIdSelection={() => {}} deleteSelectedIds={() => {}} />;
      case 'TOTAL_RETURN': return <TotalReturnPage stocks={activeStocks} dividends={dividends} settings={settings} stockMetadata={stockMetadata} />;
      case 'STRATEGY': return <StrategyPage strategies={strategies} stocks={activeStocks} dividends={dividends} settings={settings} stockMetadata={stockMetadata} onAdd={() => setModal({ type: 'STRATEGY_FORM', data: { mode: 'add' } })} onEdit={(s) => setModal({ type: 'STRATEGY_FORM', data: { mode: 'edit', strategy: s } })} onDelete={(id) => setStrategies(prev => prev.filter(x => x.id !== id))} onSave={(s, id) => { setStrategies(prev => id ? prev.map(x => x.id === id ? { ...x, ...s } : x) : [...prev, { ...s, id: crypto.randomUUID() }]); setModal(null); }} onReorder={setStrategies} />;
      case 'BUDGET': return <BudgetPage stocks={stocks} dividends={dividends} donations={donations} budgetEntries={budgetEntries} settings={settings} onAdd={() => setModal({ type: 'BUDGET_ENTRY', data: { mode: 'add' } })} onEdit={(e) => setModal({type: 'BUDGET_ENTRY', data: { mode: 'edit', entry: e }})} onDelete={(e) => setBudgetEntries(prev => prev.filter(x => x.id !== e.id))} selectedIds={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} />;
      case 'DONATION_FUND': return <DonationFundPage stats={portfolioCalculations} donations={donations} settings={settings} onAdd={() => setModal({ type: 'DONATION_FORM', data: { mode: 'add' } })} onEdit={(d) => setModal({type: 'DONATION_FORM', data: { mode: 'edit', donation: d }})} onDelete={(d) => setDonations(prev => prev.filter(x => x.id !== d.id))} selectedIds={new Set()} toggleSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} />;
      case 'TRANSACTION_HISTORY': return <TransactionHistoryPage stocks={stocksWithSellHistory} settings={settings} stockMetadata={stockMetadata} onBuy={(s) => setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'buy', stock: s } })} onEditTransaction={(sym, id) => { const stock = stocks.find(s => s.symbol === sym); const tx = stock?.transactions.find(t => t.id === id); setModal({ type: 'STOCK_TRANSACTION', data: { mode: 'edit', stock, transaction: tx } }); }} onDeleteTransaction={(sym, id) => setStocks(prev => prev.map(s => s.symbol === sym ? { ...s, transactions: s.transactions.filter(t => t.id !== id) } : s))} selectedGroups={new Set()} toggleGroupSelection={() => {}} clearSelection={() => {}} deleteSelected={() => {}} selectedTransactionIds={new Set()} toggleTransactionSelection={() => {}} clearTransactionSelection={() => {}} deleteSelectedTransactions={() => {}} />;
      case 'HISTORICAL_PRICES': return <HistoricalPricesPage stocks={stocks} historicalPrices={historicalPrices} stockMetadata={stockMetadata} onSave={setHistoricalPrices} onOpenUpdateAllPricesModal={() => setModal({ type: 'UPDATE_ALL_PRICES', data: { stocks: activeStocks } })} />;
      case 'SETTINGS': return <SettingsPage stockMetadata={stockMetadata} onSaveMetadata={(m) => setStockMetadata(prev => ({ ...prev, [m.symbol]: m }))} onDeleteMetadata={(sym) => setStockMetadata(prev => { const n = {...prev}; delete n[sym]; return n; })} onOpenMetadataModal={(m) => setModal({ type: 'METADATA_FORM', data: { mode: m ? 'edit' : 'add', meta: m } })} onExport={handleExportData} onImport={handleImportData} openModal={setModal} onBulkImport={() => {}} />;
      case 'MORE': return <MorePage setPage={setPage} />;
      default: return null;
    }
  };

  return (
    <div className="flex bg-dark-bg min-h-screen font-sans text-dark-text overflow-hidden">
      <nav className="hidden md:flex md:flex-col w-64 bg-dark-card border-r border-dark-border sticky top-0 h-screen z-40 shrink-0">
        <div className="p-8">
            <div className="text-primary text-2xl font-black tracking-tighter">STOCK PILOT</div>
        </div>
        <ul className="flex-grow px-4 space-y-1 overflow-y-auto custom-scrollbar">
          {allNavItems.map(item => (
            <li key={item.id}>
              <button onClick={() => { setPage(item.id); scrollToTop(); }} className={`w-full flex items-center px-4 py-4 rounded-2xl transition-all group ${ page === item.id ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' : 'hover:bg-primary/10 text-dark-text/60 hover:text-primary'}`}>
                <item.icon className="h-6 w-6" /> <span className="ml-4 font-black text-lg">{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
        <div className={`p-6 transition-all duration-500 ${showScrollTop ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}>
            <button onClick={scrollToTop} className="w-full bg-dark-bg border border-dark-border hover:border-primary/50 py-4 rounded-2xl flex flex-col items-center justify-center gap-2 group transition-all shadow-inner">
                <ArrowUpIcon className="h-5 w-5 text-primary group-hover:-translate-y-1 transition-transform" />
                <span className="text-lg font-black opacity-50 uppercase tracking-widest">Top</span>
            </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0 h-screen relative">
          <MobileHeader currentPage={page} />
          <main ref={mainContentRef} className="flex-1 p-4 pb-32 md:p-10 overflow-y-auto scroll-smooth custom-scrollbar">
            <div className="max-w-[1400px] mx-auto">
                {renderPage()}
            </div>
          </main>
          <BottomNav setPage={setPage} currentPage={page} />
      </div>

      {modal && <ModalContainer modal={modal} closeModal={() => setModal(null)} onSaveTransaction={(f, m, id) => { 
        setStocks(prev => {
          let newStocks = [...prev];
          let idx = newStocks.findIndex(s => s.symbol === f.symbol);
          const tx = { id: id || crypto.randomUUID(), type: f.type, shares: f.shares, price: f.price, date: f.date, fees: f.fees };
          if (idx === -1) { newStocks.push({ symbol: f.symbol, name: f.name || f.symbol, currentPrice: f.currentPrice || f.price, transactions: [tx] }); }
          else {
            const stock = { ...newStocks[idx] };
            if (f.currentPrice !== undefined) stock.currentPrice = f.currentPrice;
            if (m === 'edit') stock.transactions = stock.transactions.map(t => t.id === id ? tx : t);
            else stock.transactions = [...stock.transactions, tx];
            newStocks[idx] = stock;
          }
          return newStocks;
        });
        setModal(null);
      }} onSaveStrategy={(s, id) => { setStrategies(prev => id ? prev.map(x => x.id === id ? { ...x, ...s } : x) : [...prev, { ...s, id: crypto.randomUUID() }]); setModal(null); }} onSaveDividend={(d, id) => setDividends(prev => id ? prev.map(x => x.id === id ? { ...d, id } : x) : [...prev, { ...d, id: crypto.randomUUID() }])} onSaveDonation={(d, id) => setDonations(prev => id ? prev.map(x => x.id === id ? { ...d, id } : x) : [...prev, { ...d, id: crypto.randomUUID() }])} onSaveBudgetEntry={(d, id) => setBudgetEntries(prev => id ? prev.map(x => x.id === id ? { ...d, id } : x) : [...prev, { ...d, id: crypto.randomUUID() }])} onUpdateAllPrices={(p) => { setStocks(prev => prev.map(s => p[s.symbol] !== undefined ? { ...s, currentPrice: p[s.symbol] } : s)); setModal(null); }} onBulkImport={() => {}} stocks={stocks} settings={settings} historicalPrices={historicalPrices} stockMetadata={stockMetadata} onSaveMetadata={(m) => { setStockMetadata(prev => ({ ...prev, [m.symbol]: m })); setModal(null); }} />}
    </div>
  );
};

const allNavItems: { id: Page; icon: React.FC<{ className?: string }>; label: string }[] = [ 
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

const mainBottomNavItems: { id: Page; icon: React.FC<{ className?: string }>; label: string }[] = [ 
    { id: 'DASHBOARD', icon: DashboardIcon, label: '總覽' }, 
    { id: 'PORTFOLIO', icon: PortfolioIcon, label: '持股' }, 
    { id: 'DIVIDENDS', icon: DividendIcon, label: '股利' }, 
    { id: 'STRATEGY', icon: StrategyIcon, label: '實驗' }
];

const BottomNav: React.FC<any> = ({ setPage, currentPage }) => (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-dark-card/90 backdrop-blur-xl border-t border-dark-border flex justify-around p-3 z-40">
        {mainBottomNavItems.map(item => (<button key={item.id} onClick={() => setPage(item.id)} className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${ currentPage === item.id ? 'text-primary scale-110' : 'text-dark-text/30'}`}><item.icon className="h-6 w-6 mb-1" /> <span className="text-[10px] font-black">{item.label}</span></button>))}
        <button onClick={() => setPage('MORE')} className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-all ${ currentPage === 'MORE' ? 'text-primary scale-110' : 'text-dark-text/30'}`}><GridIcon className="h-6 w-6 mb-1" /> <span className="text-[10px] font-black">更多</span></button>
    </nav>
);
const MobileHeader: React.FC<any> = ({ currentPage }) => (<header className="md:hidden flex items-center px-6 py-5 bg-dark-card border-b border-dark-border sticky top-0 z-30"><h1 className="text-lg font-black tracking-tight text-primary uppercase">Stock Pilot <span className="mx-2 text-dark-text/20 font-normal">|</span> <span className="text-dark-text normal-case font-black text-2xl">{pageTitles[currentPage as Page] || '更多功能'}</span></h1></header>);

export default App;
