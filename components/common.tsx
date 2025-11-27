
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { EllipsisVerticalIcon, EditIcon, TrashIcon, PlusIcon, MinusIcon, SearchIcon, SortAscendingIcon, SortDescendingIcon, ArrowUpIcon, ChevronDownIcon } from './Icons';
import { stockDefinitions } from '../utils/data';

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
            <button onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><EllipsisVerticalIcon className="h-6 w-6" /></button>
            {isOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-light-card dark:bg-dark-card rounded-md shadow-lg z-20 border border-light-border dark:border-dark-border">
                    {onEdit && <button onClick={() => { onEdit(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-3 text-sm hover:bg-light-bg dark:hover:bg-dark-bg"><EditIcon className="h-5 w-5 mr-3"/>編輯</button>}
                    {onBuy && <button onClick={() => { onBuy(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-3 text-sm hover:bg-light-bg dark:hover:bg-dark-bg"><PlusIcon className="h-5 w-5 mr-3"/>買入</button>}
                    {onSell && <button onClick={() => { onSell(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-3 text-sm hover:bg-light-bg dark:hover:bg-dark-bg"><MinusIcon className="h-5 w-5 mr-3"/>賣出</button>}
                    {onDelete && <><div className="my-1 border-t border-light-border dark:border-dark-border"></div>
                    <button onClick={() => { onDelete(); setIsOpen(false); }} className="w-full text-left flex items-center px-4 py-3 text-sm text-danger hover:bg-light-bg dark:hover:bg-dark-bg"><TrashIcon className="h-5 w-5 mr-3"/>刪除</button></>}
                </div>
            )}
        </div>
    );
};


// --- Selection Action Bar ---
export const SelectionActionBar: React.FC<{count: number, onCancel: () => void, onDelete: () => void, itemName?: string}> = ({ count, onCancel, onDelete, itemName = '項' }) => (
    <div className="bg-primary/10 dark:bg-primary/20 border border-primary/20 rounded-lg p-3 flex justify-between items-center mb-6 transition-all duration-300">
        <span className="font-semibold text-light-text dark:text-dark-text">已選取 {count} {itemName}</span>
        <div className="space-x-2">
            <button onClick={onCancel} className="px-4 py-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors">取消選取</button>
            <button onClick={onDelete} className="px-4 py-2 bg-danger text-white rounded-lg hover:opacity-90 transition-opacity">刪除</button>
        </div>
    </div>
);


// --- Reusable UI Components ---
export const SearchInput: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string; }> = ({ value, onChange, placeholder }) => (
    <div className="relative">
        <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="w-full p-3 pl-10 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border focus:ring-primary focus:border-primary"/>
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-light-text/50 dark:text-dark-text/50" />
    </div>
);

type SortDirection = 'asc' | 'desc';
export interface SortConfig<T> {
    key: keyof T;
    direction: SortDirection;
}

export const SortableHeaderCell: React.FC<{label: string; sortKey: string; sortConfig: SortConfig<any>; onRequestSort: (key: string) => void; isNumeric?: boolean}> = ({ label, sortKey, sortConfig, onRequestSort, isNumeric }) => (
    <th className={`px-6 py-4 font-semibold cursor-pointer whitespace-nowrap ${isNumeric ? 'text-right' : 'text-left'}`} onClick={() => onRequestSort(sortKey)}>
        <div className={`flex items-center ${isNumeric ? 'justify-end' : ''}`}>
            {label}
            <span className="ml-2 w-4">
                {sortConfig.key === sortKey && (sortConfig.direction === 'asc' ? <SortAscendingIcon className="h-5 w-5"/> : <SortDescendingIcon className="h-5 w-5"/>)}
            </span>
        </div>
    </th>
);

export const ScrollToTopButton: React.FC<{ mainRef: React.RefObject<HTMLElement> }> = ({ mainRef }) => {
    const scrollToTop = () => {
        mainRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    return (
        <button 
            onClick={scrollToTop} 
            className="fixed bottom-20 right-5 md:bottom-8 md:right-8 bg-primary/80 hover:bg-primary text-primary-foreground w-12 h-12 rounded-full flex items-center justify-center shadow-lg z-20 backdrop-blur-sm transition-opacity"
            aria-label="Scroll to top"
        >
            <ArrowUpIcon className="h-6 w-6" />
        </button>
    );
};

export const StockFilterDropdown: React.FC<{
  allSymbols: string[];
  selectedSymbols: string[];
  onChange: (selected: string[]) => void;
  heldSymbols?: string[];
}> = ({ allSymbols, selectedSymbols, onChange, heldSymbols }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter States
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

  // Derived Filter Options based on allSymbols + stockDefinitions
  const availableMarkets = useMemo(() => {
    const markets = new Set<string>();
    allSymbols.forEach(s => {
        if (stockDefinitions[s]?.market) markets.add(stockDefinitions[s].market);
    });
    return Array.from(markets).sort();
  }, [allSymbols]);

  const availableTypes = useMemo(() => {
    const types = new Set<string>();
    allSymbols.forEach(s => {
        const def = stockDefinitions[s];
        if (def && (!filterMarket || def.market === filterMarket)) {
            if (def.type) types.add(def.type);
        }
    });
    return Array.from(types).sort();
  }, [allSymbols, filterMarket]);

  const availableIndustries = useMemo(() => {
    const industries = new Set<string>();
    allSymbols.forEach(s => {
        const def = stockDefinitions[s];
        if (def && 
            (!filterMarket || def.market === filterMarket) && 
            (!filterType || def.type === filterType)) {
            if (def.industry) industries.add(def.industry);
        }
    });
    return Array.from(industries).sort();
  }, [allSymbols, filterMarket, filterType]);

  // Handle Dropdown Filter Changes (Reset children filters)
  const handleMarketChange = (val: string) => {
      setFilterMarket(val);
      setFilterType('');
      setFilterIndustry('');
  };

  const handleTypeChange = (val: string) => {
      setFilterType(val);
      setFilterIndustry('');
  };

  // Filter and Sort Symbols
  const displayedSymbols = useMemo(() => {
    // 1. Filter
    let filtered = allSymbols.filter(s => {
        const def = stockDefinitions[s];
        if (filterMarket && def?.market !== filterMarket) return false;
        if (filterType && def?.type !== filterType) return false;
        if (filterIndustry && def?.industry !== filterIndustry) return false;
        return true;
    });

    // 2. Sort: Held First, then Symbol Alpha numeric
    return filtered.sort((a, b) => {
        const isHeldA = heldSymbols?.includes(a) || false;
        const isHeldB = heldSymbols?.includes(b) || false;

        // Held prioritized
        if (isHeldA && !isHeldB) return -1;
        if (!isHeldA && isHeldB) return 1;

        // Then by Symbol (Numeric aware for 0050 vs 2330 etc)
        return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [allSymbols, filterMarket, filterType, filterIndustry, heldSymbols]);

  const isAllDisplayedSelected = displayedSymbols.length > 0 && displayedSymbols.every(s => selectedSymbols.includes(s));

  // Toggle Logic
  const handleToggleSymbol = (symbol: string) => {
    const newSelected = selectedSymbols.includes(symbol)
      ? selectedSymbols.filter(s => s !== symbol)
      : [...selectedSymbols, symbol];
    onChange(newSelected);
  };

  const handleSelectAllVisible = (e: React.ChangeEvent<HTMLInputElement>) => {
    const shouldSelect = e.target.checked;
    if (shouldSelect) {
        // Add all displayed symbols to selection (Set to avoid duplicates)
        const newSet = new Set([...selectedSymbols, ...displayedSymbols]);
        onChange(Array.from(newSet));
    } else {
        // Remove displayed symbols from selection
        const displayedSet = new Set(displayedSymbols);
        const newSelected = selectedSymbols.filter(s => !displayedSet.has(s));
        onChange(newSelected);
    }
  };

  const buttonText = selectedSymbols.length === allSymbols.length
    ? `篩選股票 (全部 ${allSymbols.length})` 
    : `篩選股票 (${selectedSymbols.length}/${allSymbols.length})`;

  return (
    <div ref={dropdownRef} className="relative w-full md:w-80">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border"
      >
        <span>{buttonText}</span>
        <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-full bg-light-card dark:bg-dark-card rounded-md shadow-lg z-30 border border-light-border dark:border-dark-border max-h-[500px] flex flex-col">
          
          {/* Filters Area */}
          <div className="p-3 border-b border-light-border dark:border-dark-border space-y-2 bg-light-bg/50 dark:bg-dark-bg/50">
             <select 
                value={filterMarket} 
                onChange={(e) => handleMarketChange(e.target.value)}
                className="w-full p-2 text-sm rounded border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card"
             >
                 <option value="">所有市場</option>
                 {availableMarkets.map(m => <option key={m} value={m}>{m}</option>)}
             </select>

             <select 
                value={filterType} 
                onChange={(e) => handleTypeChange(e.target.value)}
                disabled={!filterMarket}
                className="w-full p-2 text-sm rounded border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-50"
             >
                 <option value="">所有類型</option>
                 {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
             </select>

             <select 
                value={filterIndustry} 
                onChange={(e) => setFilterIndustry(e.target.value)}
                disabled={!filterType && !filterMarket}
                className="w-full p-2 text-sm rounded border border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card disabled:opacity-50"
             >
                 <option value="">所有產業/指數</option>
                 {availableIndustries.map(i => <option key={i} value={i}>{i}</option>)}
             </select>
          </div>

          {/* Controls Area */}
          <div className="p-3 border-b border-light-border dark:border-dark-border bg-light-card dark:bg-dark-card">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary"
                checked={isAllDisplayedSelected} 
                onChange={handleSelectAllVisible}
              />
              <span className="font-semibold text-sm">全選 (目前列表 {displayedSymbols.length} 筆)</span>
            </label>
          </div>

          {/* List Area */}
          <div className="p-1 overflow-y-auto flex-grow">
            {displayedSymbols.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">無符合條件的股票</div>
            ) : (
                displayedSymbols.map(symbol => {
                    const isHeld = heldSymbols?.includes(symbol);
                    const def = stockDefinitions[symbol];
                    return (
                        <label key={symbol} className="flex items-center space-x-3 p-2 rounded-md hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer">
                            <input 
                            type="checkbox" 
                            className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary"
                            checked={selectedSymbols.includes(symbol)} 
                            onChange={() => handleToggleSymbol(symbol)} 
                            />
                            <div className="flex flex-col">
                                <span className="flex items-center">
                                    {symbol}
                                    {isHeld && <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-success/20 text-success rounded">持有</span>}
                                </span>
                                {def && <span className="text-xs text-light-text/60 dark:text-dark-text/60">{def.name}</span>}
                            </div>
                        </label>
                    );
                })
            )}
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
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSelect = (year: number | 'all') => {
    onChange(year);
    setIsOpen(false);
  };

  const buttonText = `篩選年份 (${selectedYear === 'all' ? '全部' : selectedYear})`;

  return (
    <div ref={dropdownRef} className="relative w-full md:w-48">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border"
      >
        <span>{buttonText}</span>
        <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-full bg-light-card dark:bg-dark-card rounded-md shadow-lg z-30 border border-light-border dark:border-dark-border max-h-60 overflow-y-auto">
          <div className="p-1">
            <button onClick={() => handleSelect('all')} className="w-full text-left p-2 rounded-md hover:bg-light-bg dark:hover:bg-dark-bg">全部</button>
            {availableYears.map(year => (
              <button key={year} onClick={() => handleSelect(year)} className="w-full text-left p-2 rounded-md hover:bg-light-bg dark:hover:bg-dark-bg">
                {year}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const StockTags: React.FC<{ symbol: string }> = ({ symbol }) => {
    const metadata = stockDefinitions[symbol];
    if (!metadata) return null;

    return (
        <div className="flex flex-wrap gap-1 mt-1">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary-foreground dark:text-primary">
                {metadata.market}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                {metadata.type}
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-secondary/20 text-secondary dark:text-secondary-foreground">
                {metadata.industry}
            </span>
        </div>
    );
};
