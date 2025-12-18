
import React, { useRef, useState, useMemo } from 'react';
import { DownloadIcon, UploadIcon, PlusIcon, EditIcon, TrashIcon, SearchIcon, GridIcon } from '../components/Icons';
import { ModalState } from '../components/modals';
import { StockMetadataMap, StockMetadata } from '../types';

interface SettingsPageProps {
    stockMetadata: StockMetadataMap;
    onSaveMetadata: (meta: StockMetadata) => void;
    onDeleteMetadata: (symbol: string) => void;
    onOpenMetadataModal: (meta?: StockMetadata) => void;
    onExport: () => void;
    onImport: (data: any) => void;
    openModal: (modal: ModalState) => void;
    onBulkImport: (type: any, data: any[]) => void;
}

type CategoryType = 'ALL' | 'STOCK' | 'ACTIVE' | 'BOND' | 'HIGH_DIV' | 'GENERAL_ETF';

export const SettingsPage: React.FC<SettingsPageProps> = ({ stockMetadata, onSaveMetadata, onDeleteMetadata, onOpenMetadataModal, onExport, onImport, openModal, onBulkImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryType>('ALL');

  // 智慧分類邏輯
  const categorize = (m: StockMetadata): CategoryType => {
    // 1. 優先判斷功能性類別 (不分市場)
    if (m.type === '債券') return 'BOND';
    if (m.type === '主動型') return 'ACTIVE';
    if (m.type === '高股息') return 'HIGH_DIV';

    // 2. 判斷個股 (台股規則：4碼且非0開頭)
    const isTwStockCode = m.market === '台股' && m.symbol.length === 4 && !m.symbol.startsWith('0');
    // 如果不是常見的 ETF 類型 (市值/成長)，且符合個股代號特徵，則歸類為個股
    if (isTwStockCode) return 'STOCK';
    
    // 3. 判斷一般 ETF (市值型、成長型)
    if (m.type === '市值型' || m.type === '成長型') return 'GENERAL_ETF';

    // 4. 剩餘情況 (可能是美股個股如 AAPL，或未定義類型的標的)
    // 如果代號不是純數字或不符合台股 ETF 規則，通常也是個股
    return 'STOCK';
  };

  const filteredMetadata = useMemo(() => {
    const all = Object.values(stockMetadata);
    
    return all.filter(m => {
      const matchSearch = m.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;

      if (activeCategory === 'ALL') return true;
      return categorize(m) === activeCategory;
    }).sort((a, b) => a.symbol.localeCompare(b.symbol, undefined, { numeric: true }));
  }, [stockMetadata, searchTerm, activeCategory]);

  const counts = useMemo(() => {
    const all = Object.values(stockMetadata);
    return {
      ALL: all.length,
      STOCK: all.filter(m => categorize(m) === 'STOCK').length,
      ACTIVE: all.filter(m => categorize(m) === 'ACTIVE').length,
      BOND: all.filter(m => categorize(m) === 'BOND').length,
      HIGH_DIV: all.filter(m => categorize(m) === 'HIGH_DIV').length,
      GENERAL_ETF: all.filter(m => categorize(m) === 'GENERAL_ETF').length,
    };
  }, [stockMetadata]);

  const handleImportClick = () => fileInputRef.current?.click();
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File content is not a string");
        const data = JSON.parse(text);
        const confirmImport = () => { onImport(data); if (fileInputRef.current) fileInputRef.current.value = ""; };
        openModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmImport, title: '還原備份', message: '這將會覆蓋所有資料與標的庫紀錄。建議先下載目前的備份。' } });
      } catch (error) {
        alert('匯入失敗: ' + (error as Error).message);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const tabs: { id: CategoryType, label: string }[] = [
    { id: 'ALL', label: '全部' },
    { id: 'STOCK', label: '個股專區' },
    { id: 'ACTIVE', label: '主動式' },
    { id: 'BOND', label: '債券型 (台美)' },
    { id: 'HIGH_DIV', label: '高股息 (台美)' },
    { id: 'GENERAL_ETF', label: '一般 ETF' },
  ];

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-black hidden md:block">資料設定</h1>
      
      <section className="bg-light-card dark:bg-dark-card p-6 md:p-8 rounded-[2.5rem] shadow-xl border border-light-border dark:border-dark-border">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
            <div>
                <h2 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
                    <div className="p-2 bg-primary/10 rounded-xl"><GridIcon className="h-6 w-6 text-primary" /></div>
                    標的資料庫管理
                </h2>
                <p className="text-sm opacity-60 mt-1 font-medium">自定義標的基本面，系統會自動根據代號特徵與類型進行分區歸類。</p>
            </div>
            <button onClick={() => onOpenMetadataModal()} className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white px-8 py-4 rounded-[1.2rem] font-black shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
                <PlusIcon className="h-6 w-6" /> 新增標的
            </button>
        </div>

        {/* 智慧分類 Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b border-light-border dark:border-dark-border pb-4">
            {tabs.map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => setActiveCategory(tab.id)}
                    className={`px-5 py-2.5 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeCategory === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-light-bg dark:bg-dark-bg opacity-60 hover:opacity-100'}`}
                >
                    {tab.label}
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeCategory === tab.id ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>
                        {counts[tab.id]}
                    </span>
                </button>
            ))}
        </div>

        <div className="relative mb-6">
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋代號或名稱..." className="w-full p-4 pl-12 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border focus:ring-4 focus:ring-primary/20 outline-none font-bold" />
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-primary opacity-50" />
        </div>

        <div className="overflow-x-auto rounded-2xl border border-light-border dark:border-dark-border">
            <table className="w-full text-left">
                <thead className="bg-light-bg dark:bg-dark-bg text-xs font-black uppercase tracking-widest opacity-60">
                    <tr>
                        <th className="px-6 py-4">代號 / 名稱</th>
                        <th className="px-6 py-4">市場 / 類型</th>
                        <th className="px-6 py-4">產業</th>
                        <th className="px-6 py-4 text-center">配息模式</th>
                        <th className="px-6 py-4 text-center">殖利率</th>
                        <th className="px-6 py-4 text-right">操作</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-light-border dark:divide-dark-border">
                    {filteredMetadata.map(meta => (
                        <tr key={meta.symbol} className="hover:bg-primary/5 transition-colors">
                            <td className="px-6 py-4">
                                <div className="font-black text-lg">{meta.symbol}</div>
                                <div className="text-xs font-bold opacity-60">{meta.name}</div>
                            </td>
                            <td className="px-6 py-4">
                                <div className="flex gap-1">
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-lg text-[10px] font-black">{meta.market}</span>
                                    <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 rounded-lg text-[10px] font-black">{meta.type}</span>
                                </div>
                            </td>
                            <td className="px-6 py-4 font-bold text-sm">{meta.industry}</td>
                            <td className="px-6 py-4 text-center">
                                <div className="text-sm font-black">{meta.mode}</div>
                                <div className="text-[10px] opacity-50 font-bold">除息月: {meta.exDivMonths.join(', ') || '無'}</div>
                            </td>
                            <td className="px-6 py-4 text-center font-black text-success">{meta.defaultYield}%</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                    <button onClick={() => onOpenMetadataModal(meta)} className="p-2 hover:bg-primary/10 text-primary rounded-xl transition-all"><EditIcon className="h-5 w-5" /></button>
                                    <button onClick={() => onDeleteMetadata(meta.symbol)} className="p-2 hover:bg-danger/10 text-danger rounded-xl transition-all"><TrashIcon className="h-5 w-5" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {filteredMetadata.length === 0 && (
                        <tr><td colSpan={6} className="px-6 py-12 text-center opacity-40 font-bold italic">在此分類中找不到相符的標的項目</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-light-card dark:bg-dark-card p-8 rounded-[2.5rem] shadow-xl border border-light-border dark:border-dark-border">
          <h2 className="text-xl font-black mb-2">資料匯出 (JSON)</h2>
          <p className="text-sm opacity-60 mb-6 font-medium">下載完整備份檔案，包含所有持股紀錄與自訂標的庫。</p>
          <button onClick={onExport} className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white font-black py-4 rounded-2xl flex items-center justify-center transition-all"><DownloadIcon className="h-5 w-5 mr-2" /> 下載備份檔案</button>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-8 rounded-[2.5rem] shadow-xl border border-light-border dark:border-dark-border">
          <h2 className="text-xl font-black mb-2">資料還原 (JSON)</h2>
          <p className="text-sm text-danger/80 mb-6 font-bold">警告：還原備份將會覆蓋目前所有資料且無法復原！</p>
          <button onClick={handleImportClick} className="w-full border-2 border-danger/40 text-danger hover:bg-danger hover:text-white font-black py-4 rounded-2xl flex items-center justify-center transition-all"><UploadIcon className="h-5 w-5 mr-2" /> 選取備份匯入</button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
        </div>
      </section>
    </div>
  );
};
