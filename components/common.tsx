
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EllipsisVerticalIcon, EditIcon, TrashIcon, PlusIcon, MinusIcon, SearchIcon, SortAscendingIcon, SortDescendingIcon, ArrowUpIcon, ChevronDownIcon } from './Icons';
import { StockMetadataMap } from '../types';

// Define HELD_KEY constant for stock filtering
const HELD_KEY = 'HELD_ONLY';

// Define SortConfig interface for table sorting
export interface SortConfig<T> {
  key: keyof T | string;
  direction: 'asc' | 'desc';
}

// --- Action Menu Component ---
export const ActionMenu: React.FC<{ onEdit?: () => void; onDelete?: () => void; onBuy?: () => void; onSell?: () => void; }> = ({ onEdit, onDelete, onBuy, onSell }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) setIsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [menuRef]);
    return (
        <div className="relative" ref={menuRef}>
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-2 rounded-full hover:bg-dark-bg"><EllipsisVerticalIcon className="h-6 w-6" /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-dark-card rounded-md shadow-lg z-20 border border-dark-border">
                    {onEdit && <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-4 text-lg font-bold hover:bg-dark-bg"><EditIcon className="h-5 w-5 mr-3"/>編輯</button>}
                    {onBuy && <button onClick={() => { onBuy(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-4 text-lg font-bold hover:bg-dark-bg"><PlusIcon className="h-5 w-5 mr-3"/>買入</button>}
                    {onSell && <button onClick={() => { onSell(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-4 text-lg font-bold hover:bg-dark-bg"><MinusIcon className="h-5 w-5 mr-3"/>賣出</button>}
                    {onDelete && <><div className="my-1 border-t border-dark-border"></div>
                    <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-4 text-lg font-bold text-danger hover:bg-dark-bg"><TrashIcon className="h-5 w-5 mr-3"/>刪除</button></>}
                </div>
            )}
        </div>
    );
};


// --- Selection Action Bar ---
export const SelectionActionBar: React.FC<{count: number, onCancel: () => void, onDelete: () => void, itemName?: string}> = ({ count, onCancel, onDelete, itemName = '項' }) => (
    <div className="bg-primary/20 border border-primary/20 rounded-2xl p-4 flex justify-between items-center mb-6 transition-all duration-300">
        <span className="font-black text-dark-text text-lg">已選取 {count} {itemName}</span>
        <div className="space-x-4">
            <button onClick={onCancel} className="px-6 py-3 rounded-xl hover:bg-dark-bg transition-colors text-lg font-black">取消選取</button>
            <button onClick={onDelete} className="px-6 py-3 bg-danger text-white rounded-xl hover:opacity-90 transition-opacity text-lg font-black shadow-lg shadow-danger/20">刪除</button>
        </div>
    </div>
);


// --- Reusable UI Components ---
export const SearchInput: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string; }> = ({ value, onChange, placeholder }) => (
    <div className="relative">
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-4 pl-12 bg-transparent rounded-2xl border border-dark-border focus:ring-4 focus:ring-primary/10 focus:border-primary text-lg font-bold outline-none transition-all"/>
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-dark-text/30" />
    </div>
);

export const SortableHeaderCell: React.FC<{label: string; sortKey: string; sortConfig: SortConfig<any>; onRequestSort: (key: string) => void; isNumeric?: boolean}> = ({ label, sortKey, sortConfig, onRequestSort, isNumeric }) => (
    <th className={`px-6 py-5 font-black cursor-pointer whitespace-nowrap text-lg ${isNumeric ? 'text-right' : 'text-left'} transition-colors hover:text-primary`} onClick={() => onRequestSort(sortKey)}>
        <div className={`flex items-center ${isNumeric ? 'justify-end' : ''}`}>
            {label}
            <span className="ml-2 w-5">
                {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <SortAscendingIcon className="h-5 w-5"/> : <SortDescendingIcon className="h-5 w-5"/>)}
            </span>
        </div>
    </th>
);

export const StockFilterDropdown: React.FC<{
  allSymbols: string[];
  selectedSymbols: string[];
  onChange: (selected: string[]) => void;
  stockMetadata: StockMetadataMap;
  heldSymbols?: string[];
}> = ({ allSymbols, selectedSymbols, onChange, stockMetadata, heldSymbols }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [filterMarket, setFilterMarket] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterIndustry, setFilterIndustry] = useState<string>('');

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const availableMarkets = useMemo(() => {
    const markets = new Set<string>();
    allSymbols.forEach(s => { if (stockMetadata[s]?.market) markets.add(stockMetadata[s].market); });
    return Array.from(markets).sort();
  }, [allSymbols, stockMetadata]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    allSymbols.forEach(s => {
        const def = stockMetadata[s];
        let marketMatch = filterMarket === HELD_KEY ? heldSymbols?.includes(s) : !filterMarket || def?.market === filterMarket;
        if (def && marketMatch && def.type) types.add(def.type);
    });
    return Array.from(types).sort();
  }, [allSymbols, filterMarket, heldSymbols, stockMetadata]);

  const availableIndustries = useMemo(() => {
    const industries = new Set<string>();
    allSymbols.forEach(s => {
        const def = stockMetadata[s];
        let marketMatch = filterMarket === HELD_KEY ? heldSymbols?.includes(s) : !filterMarket || def?.market === filterMarket;
        let typeMatch = filterType === HELD_KEY ? heldSymbols?.includes(s) : !filterType || def?.type === filterType;
        if (def && marketMatch && typeMatch && def.industry) industries.add(def.industry);
    });
    return Array.from(industries).sort();
  }, [allSymbols, filterMarket, filterType, heldSymbols, stockMetadata]);

  const displayedSymbols = useMemo(() => {
    return allSymbols.filter(s => {
        const def = stockMetadata[s];
        if (filterMarket === HELD_KEY && !heldSymbols?.includes(s)) return false;
        if (filterMarket && filterMarket !== HELD_KEY && def?.market !== filterMarket) return false;
        if (filterType === HELD_KEY && !heldSymbols?.includes(s)) return false;
        if (filterType && filterType !== HELD_KEY && def?.type !== filterType) return false;
        if (filterIndustry === HELD_KEY && !heldSymbols?.includes(s)) return false;
        if (filterIndustry && filterIndustry !== HELD_KEY && def?.industry !== filterIndustry) return false;
        return true;
    }).sort((a, b) => {
        const isHeldA = heldSymbols?.includes(a) || false;
        const isHeldB = heldSymbols?.includes(b) || false;
        if (isHeldA !== isHeldB) return isHeldA ? -1 : 1;
        return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [allSymbols, filterMarket, filterType, filterIndustry, heldSymbols, stockMetadata]);

  const buttonText = selectedSymbols.length === allSymbols.length ? `篩選股票 (${allSymbols.length})` : `已選 ${selectedSymbols.length} / ${allSymbols.length}`;

  return (
    <div ref={dropdownRef} className="relative w-full md:w-80">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-dark-card rounded-2xl border border-dark-border shadow-sm">
        <span className="text-lg font-black">{buttonText}</span>
        <ChevronDownIcon className={`h-6 w-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-3 w-full bg-dark-card rounded-[1.5rem] shadow-2xl z-30 border border-dark-border max-h-[600px] flex flex-col overflow-hidden">
          <div className="p-4 border-b border-dark-border space-y-3 bg-dark-bg/50">
             <select value={filterMarket} onChange={(e) => setFilterMarket(e.target.value)} className="w-full p-3 text-lg rounded-xl border border-dark-border bg-dark-card font-black outline-none"><option value="">所有市場</option><option value={HELD_KEY}>持有中</option>{availableMarkets.map(m => <option key={m} value={m}>{m}</option>)}</select>
             <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="w-full p-3 text-lg rounded-xl border border-dark-border bg-dark-card font-black outline-none"><option value="">所有類型</option><option value={HELD_KEY}>持有中</option>{availableTypes.map(t => <option key={t} value={t}>{t}</option>)}</select>
             <select value={filterIndustry} onChange={(e) => setFilterIndustry(e.target.value)} className="w-full p-3 text-lg rounded-xl border border-dark-border bg-dark-card font-black outline-none"><option value="">所有產業</option><option value={HELD_KEY}>持有中</option>{availableIndustries.map(i => <option key={i} value={i}>{i}</option>)}</select>
          </div>
          <div className="p-4 bg-dark-card border-b border-dark-border">
            <label className="flex items-center space-x-3 cursor-pointer"><input type="checkbox" className="form-checkbox h-6 w-6 text-primary bg-dark-bg border-dark-border rounded-lg" checked={displayedSymbols.length > 0 && displayedSymbols.every(s => selectedSymbols.includes(s))} onChange={(e) => { const should = e.target.checked; if (should) onChange(Array.from(new Set([...selectedSymbols, ...displayedSymbols]))); else onChange(selectedSymbols.filter(s => !displayedSymbols.includes(s))); }} /><span className="font-black text-lg">全選目前符合列表</span></label>
          </div>
          <div className="p-2 overflow-y-auto flex-grow custom-scrollbar">
            {displayedSymbols.length === 0 ? <div className="p-10 text-center text-lg opacity-40 font-black">無符合股票</div> : displayedSymbols.map(symbol => (
                <label key={symbol} className="flex items-center space-x-4 p-4 rounded-xl hover:bg-dark-bg/60 cursor-pointer transition-colors"><input type="checkbox" className="form-checkbox h-6 w-6 text-primary bg-dark-bg border-dark-border rounded-lg" checked={selectedSymbols.includes(symbol)} onChange={() => onChange(selectedSymbols.includes(symbol) ? selectedSymbols.filter(s => s !== symbol) : [...selectedSymbols, symbol])} /><div className="flex flex-col"><span className="text-xl font-black flex items-center">{symbol}{heldSymbols?.includes(symbol) && <span className="ml-2 px-2 py-0.5 text-xs bg-success/20 text-success rounded-full font-black uppercase">Held</span>}</span><span className="text-lg font-bold opacity-40">{stockMetadata[symbol]?.name}</span></div></label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};


export const YearFilterDropdown: React.FC<{
  availableYears: number[];
  selectedYear: number | 'all';
  onChange: (year: number | 'all') => void;
}> = ({ availableYears, selectedYear, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const click = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", click); return () => document.removeEventListener("mousedown", click);
  }, []);

  return (
    <div ref={dropdownRef} className="relative w-full md:w-56">
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-4 bg-dark-card rounded-2xl border border-dark-border shadow-sm">
        <span className="text-lg font-black">年度: {selectedYear === 'all' ? '全部' : selectedYear}</span>
        <ChevronDownIcon className={`h-6 w-6 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-3 w-full bg-dark-card rounded-[1.5rem] shadow-2xl z-30 border border-dark-border max-h-80 overflow-y-auto">
          <div className="p-2">
            <button onClick={() => { onChange('all'); setIsOpen(false); }} className="w-full text-left p-4 rounded-xl hover:bg-dark-bg font-black text-lg">全部歷史紀錄</button>
            {availableYears.map(year => (
              <button key={year} onClick={() => { onChange(year); setIsOpen(false); }} className="w-full text-left p-4 rounded-xl hover:bg-dark-bg font-black text-lg">{year} 年度報表</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const StockTags: React.FC<{ symbol: string; stockMetadata: StockMetadataMap }> = ({ symbol, stockMetadata }) => {
    const metadata = stockMetadata[symbol];
    if (!metadata) return null;
    return (
        <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 rounded-lg text-lg font-black bg-primary/20 text-primary uppercase">{metadata.market}</span>
            <span className="px-3 py-1 rounded-lg text-lg font-black bg-white/5 text-dark-text/60 uppercase">{metadata.type}</span>
            <span className="px-3 py-1 rounded-lg text-lg font-black bg-success/20 text-success uppercase">{metadata.industry}</span>
        </div>
    );
};
