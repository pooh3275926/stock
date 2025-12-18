
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

  const categorize = (m: StockMetadata): CategoryType => {
    if (m.type === '債券') return 'BOND';
    if (m.type === '主動型') return 'ACTIVE';
    if (m.type === '高股息') return 'HIGH_DIV';
    const isTwStockCode = m.market === '台股' && m.symbol.length === 4 && !m.symbol.startsWith('0');
    if (isTwStockCode) return 'STOCK';
    if (m.type === '市值型' || m.type === '成長型') return 'GENERAL_ETF';
    return 'STOCK';
  };

  const filteredMetadata = useMemo(() => {
    // FIX: Cast Object.values to StockMetadata[] to avoid 'unknown' type errors
    const all = Object.values(stockMetadata) as StockMetadata[];
    return all.filter(m => {
      const matchSearch = m.symbol.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.name.toLowerCase().includes(searchTerm.toLowerCase());
      if (!matchSearch) return false;
      if (activeCategory === 'ALL') return true;
      return categorize(m) === activeCategory;
    }).sort((a, b) => a.symbol.localeCompare(b.symbol, undefined, { numeric: true }));
  }, [stockMetadata, searchTerm, activeCategory]);

  const counts = useMemo(() => {
    // FIX: Cast Object.values to StockMetadata[] to ensure correct type in categorization logic
    const all = Object.values(stockMetadata) as StockMetadata[];
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
        if (!data.stocks && !data.stockMetadata) throw new Error("備份檔案格式不正確");
        const confirmImport = () => { onImport(data); if (fileInputRef.current) fileInputRef.current.value = ""; };
        openModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmImport, title: '還原備份資料', message: '這將會覆蓋目前所有的持股紀錄、股利、奉獻及自訂標的資料庫。' } });
      } catch (error) {
        alert('匯入失敗: ' + (error as Error).message);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };

  const tabs: { id: CategoryType, label: string }[] = [
    { id: 'ALL', label: '全部' }, { id: 'STOCK', label: '個股' }, { id: 'ACTIVE', label: '主動' }, { id: 'BOND', label: '債券' }, { id: 'HIGH_DIV', label: '高息' }, { id: 'GENERAL_ETF', label: '市值型' }
  ];

  return (
    <div className="space-y-10 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
              <h1 className="text-2xl font-black flex items-center gap-4 uppercase tracking-tight">
                  <div className="p-3 bg-primary/10 rounded-2xl"><GridIcon className="h-8 w-8 text-primary" /></div>
                  標的資料庫
              </h1>
              <p className="text-lg opacity-40 mt-2 font-bold uppercase tracking-widest">Global Assets Metadata</p>
          </div>
          <button onClick={() => onOpenMetadataModal()} className="w-full md:w-auto bg-primary hover:bg-primary-hover text-white px-8 py-5 rounded-2xl font-black text-lg shadow-xl shadow-primary/20 transition-all flex items-center justify-center gap-3 transform hover:scale-105">
              <PlusIcon className="h-6 w-6" /> 新增標的
          </button>
      </div>

      <section className="bg-dark-card p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-dark-border">
        <div className="flex flex-wrap gap-3 mb-10 border-b border-dark-border pb-6">
            {tabs.map(tab => (
                <button key={tab.id} onClick={() => setActiveCategory(tab.id)} className={`px-6 py-3 rounded-2xl text-lg font-black transition-all flex items-center gap-3 ${activeCategory === tab.id ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-105' : 'bg-dark-bg text-dark-text/40 hover:text-dark-text'}`}>
                    {tab.label} <span className={`px-3 py-1 rounded-xl text-lg ${activeCategory === tab.id ? 'bg-white/20' : 'bg-primary/10 text-primary'}`}>{counts[tab.id]}</span>
                </button>
            ))}
        </div>

        <div className="relative mb-10">
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="搜尋代號或名稱..." className="w-full p-6 pl-16 bg-dark-bg rounded-[2rem] border border-dark-border focus:border-primary outline-none font-black text-lg transition-all" />
            <SearchIcon className="absolute left-6 top-1/2 -translate-y-1/2 h-8 w-8 text-primary opacity-30" />
        </div>

        <div className="overflow-x-auto rounded-[2rem] border border-dark-border">
            <table className="w-full text-left">
                <thead className="bg-dark-bg text-lg font-black uppercase tracking-widest opacity-40">
                    <tr>
                        <th className="px-8 py-6">代號 / 名稱</th>
                        <th className="px-8 py-6">市場/類型</th>
                        <th className="px-8 py-6">產業板塊</th>
                        <th className="px-8 py-6 text-center">配息模式</th>
                        <th className="px-8 py-6 text-center">殖利率</th>
                        <th className="px-8 py-6 text-right">管理</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-dark-border text-lg font-bold">
                    {filteredMetadata.map(meta => (
                        <tr key={meta.symbol} className="hover:bg-primary/5 transition-colors">
                            <td className="px-8 py-7">
                                <div className="font-black text-2xl tracking-tighter">{meta.symbol}</div>
                                <div className="text-lg font-bold opacity-40">{meta.name}</div>
                            </td>
                            <td className="px-8 py-7">
                                <div className="flex flex-col gap-2">
                                    <span className="px-3 py-1 bg-primary/20 text-primary rounded-lg text-lg font-black self-start uppercase">{meta.market}</span>
                                    <span className="px-3 py-1 bg-white/5 text-dark-text/60 rounded-lg text-lg font-black self-start uppercase">{meta.type}</span>
                                </div>
                            </td>
                            <td className="px-8 py-7 font-black text-lg tracking-tight uppercase">{meta.industry}</td>
                            <td className="px-8 py-7 text-center">
                                <div className="text-lg font-black">{meta.mode}</div>
                                <div className="text-lg opacity-40 font-black mt-1 uppercase tracking-tighter">EX: {meta.exDivMonths.join(',') || '-'}</div>
                            </td>
                            <td className="px-8 py-7 text-center">
                                <div className="inline-block px-5 py-2 bg-success/10 text-success rounded-xl border border-success/20 font-black text-xl">{meta.defaultYield}%</div>
                            </td>
                            <td className="px-8 py-7 text-right">
                                <div className="flex justify-end gap-5">
                                    <button onClick={() => onOpenMetadataModal(meta)} className="p-3 hover:bg-primary/10 text-primary rounded-2xl transition-all"><EditIcon className="h-7 w-7" /></button>
                                    <button onClick={() => onDeleteMetadata(meta.symbol)} className="p-3 hover:bg-danger/10 text-danger rounded-2xl transition-all"><TrashIcon className="h-7 w-7" /></button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-dark-card p-10 rounded-[3rem] border border-dark-border shadow-2xl">
          <h2 className="text-xl font-black mb-2 flex items-center gap-3"><DownloadIcon className="h-8 w-8 text-primary" /> 備份匯出</h2>
          <p className="text-lg opacity-40 mb-10 font-bold uppercase tracking-widest">Backup & Export</p>
          <button onClick={onExport} className="w-full bg-primary/10 text-primary hover:bg-primary hover:text-white font-black py-6 rounded-3xl text-lg flex items-center justify-center transition-all shadow-sm">立即下載備份</button>
        </div>
        <div className="bg-dark-card p-10 rounded-[3rem] border border-dark-border shadow-2xl">
          <h2 className="text-xl font-black mb-2 flex items-center gap-3 text-danger"><UploadIcon className="h-8 w-8" /> 資料還原</h2>
          <p className="text-lg text-danger/40 mb-10 font-bold uppercase tracking-widest">Restore Data</p>
          <button onClick={handleImportClick} className="w-full border-2 border-danger/40 text-danger hover:bg-danger hover:text-white font-black py-6 rounded-3xl text-lg flex items-center justify-center transition-all shadow-sm">選取備份檔案</button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
        </div>
      </div>
    </div>
  );
};
