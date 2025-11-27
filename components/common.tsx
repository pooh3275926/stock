
import React, { useState, useEffect, useRef } from 'react';
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

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked ? allSymbols : []);
  };

  const handleToggleSymbol = (symbol: string) => {
    const newSelected = selectedSymbols.includes(symbol)
      ? selectedSymbols.filter(s => s !== symbol)
      : [...selectedSymbols, symbol];
    onChange(newSelected);
  };
  
  const isAllSelected = allSymbols.length > 0 && selectedSymbols.length === allSymbols.length;
  const isHeldSelected = heldSymbols && heldSymbols.length > 0 && 
                         selectedSymbols.length === heldSymbols.length && 
                         heldSymbols.every(s => selectedSymbols.includes(s));

  const buttonText = isAllSelected ? `篩選股票 (全部 ${allSymbols.length})` : `篩選股票 (${selectedSymbols.length}/${allSymbols.length})`;

  return (
    <div ref={dropdownRef} className="relative w-full md:w-64">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border"
      >
        <span>{buttonText}</span>
        <ChevronDownIcon className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-full bg-light-card dark:bg-dark-card rounded-md shadow-lg z-30 border border-light-border dark:border-dark-border max-h-60 overflow-y-auto">
          <div className="p-3 border-b border-light-border dark:border-dark-border space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input 
                type="checkbox" 
                className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary"
                checked={isAllSelected} 
                onChange={handleSelectAll}
              />
              <span className="font-semibold">全選</span>
            </label>
            {heldSymbols && heldSymbols.length > 0 && (
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary"
                    checked={isHeldSelected || false} 
                    onChange={() => onChange(isHeldSelected ? [] : heldSymbols)}
                  />
                  <span className="font-semibold">持有中</span>
                </label>
            )}
          </div>
          <div className="p-1">
            {allSymbols.map(symbol => (
              <label key={symbol} className="flex items-center space-x-3 p-2 rounded-md hover:bg-light-bg dark:hover:bg-dark-bg cursor-pointer">
                <input 
                  type="checkbox" 
                  className="form-checkbox h-5 w-5 text-primary bg-light-bg dark:bg-dark-bg border-light-border dark:border-dark-border rounded focus:ring-primary"
                  checked={selectedSymbols.includes(symbol)} 
                  onChange={() => handleToggleSymbol(symbol)} 
                />
                <span>{symbol}</span>
              </label>
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
