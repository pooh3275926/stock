
import React, { useState, useMemo, useEffect } from 'react';
import { CloseIcon } from './Icons';
import type { Stock, Transaction, Dividend, Donation, Settings, HistoricalPrice, BudgetEntry, Strategy, StockMetadataMap, StockMetadata } from '../types';
import { calculateStockFinancials, getLatestHistoricalPrice } from '../utils/calculations';

export type ModalType = 'STOCK_TRANSACTION' | 'DIVIDEND' | 'DONATION_FORM' | 'DELETE_CONFIRMATION' | 'IMPORT_CONFIRMATION' | 'IMPORT_PREVIEW' | 'BUDGET_ENTRY' | 'UPDATE_ALL_PRICES' | 'STRATEGY_FORM' | 'METADATA_FORM';
export interface ModalState {
  type: ModalType;
  data?: any;
}

export const ModalContainer: React.FC<{modal: ModalState; closeModal: () => void; onSaveTransaction: any; onSaveStrategy: any; onSaveDividend: any; onSaveDonation: any; onSaveBudgetEntry: any; onUpdateAllPrices: (prices: { [symbol: string]: number }) => void; onBulkImport: (type: string, data: any[]) => void; stocks: Stock[]; settings: Settings; historicalPrices: HistoricalPrice[]; stockMetadata: StockMetadataMap; onSaveMetadata: (m: StockMetadata) => void;}> = ({ modal, closeModal, onSaveTransaction, onSaveStrategy, onSaveDividend, onSaveDonation, onSaveBudgetEntry, onUpdateAllPrices, onBulkImport, stocks, settings, historicalPrices, stockMetadata, onSaveMetadata }) => {
    const renderContent = () => {
        if (!modal.type) return null;
        switch(modal.type) {
            case 'STOCK_TRANSACTION': return <StockTransactionForm stocks={stocks} settings={settings} stockMetadata={stockMetadata} onSave={onSaveTransaction} onCancel={closeModal} mode={modal.data.mode} stock={modal.data.stock} transaction={modal.data.transaction} historicalPrices={historicalPrices} />;
            case 'METADATA_FORM': return <StockMetadataForm onSave={onSaveMetadata} onCancel={closeModal} mode={modal.data.mode} meta={modal.data.meta} />;
            case 'STRATEGY_FORM': return <StrategyForm stockMetadata={stockMetadata} onSave={onSaveStrategy} onCancel={closeModal} mode={modal.data.mode} strategy={modal.data.strategy} />;
            case 'DIVIDEND': return <DividendForm stocks={stocks} onSave={handleSaveDividend} onCancel={closeModal} mode={modal.data.mode} dividend={modal.data.dividend} />;
            case 'DONATION_FORM': return <DonationForm onSave={handleSaveDonation} onCancel={closeModal} mode={modal.data.mode} donation={modal.data.donation} />;
            case 'DELETE_CONFIRMATION': return <DeleteConfirmation title={modal.data.title} message={modal.data.message} onConfirm={modal.data.onConfirm} onCancel={modal.data.onCancel || closeModal} />;
            case 'BUDGET_ENTRY': return <BudgetEntryForm onSave={handleSaveBudgetEntry} onCancel={closeModal} mode={modal.data.mode} entry={modal.data.entry} />;
            case 'UPDATE_ALL_PRICES': return <UpdateAllPricesForm stocks={modal.data.stocks} onSave={onUpdateAllPrices} onCancel={closeModal} />;
            default: return null;
        }
    };
    
    const handleSaveDividend = (data: Omit<Dividend, 'id'>) => onSaveDividend(data, modal.data?.dividend?.id);
    const handleSaveDonation = (data: Omit<Donation, 'id'>) => onSaveDonation(data, modal.data?.donation?.id);
    const handleSaveBudgetEntry = (data: Omit<BudgetEntry, 'id'>) => onSaveBudgetEntry(data, modal.data?.entry?.id);

    if (!modal) return null;
    const isLargeModal = modal.type === 'IMPORT_PREVIEW' || modal.type === 'UPDATE_ALL_PRICES' || modal.type === 'STRATEGY_FORM' || modal.type === 'METADATA_FORM';

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm" onClick={closeModal}>
            <div className={`bg-light-card dark:bg-dark-card rounded-[2.5rem] shadow-2xl w-full border border-light-border dark:border-dark-border overflow-hidden ${isLargeModal ? 'max-w-3xl' : 'max-w-md'}`} onClick={e => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>
    );
};

const StockMetadataForm: React.FC<{ onSave: (m: StockMetadata) => void; onCancel: () => void; mode: 'add' | 'edit'; meta?: StockMetadata; }> = ({ onSave, onCancel, mode, meta }) => {
    const [symbol, setSymbol] = useState(meta?.symbol || '');
    const [name, setName] = useState(meta?.name || '');
    const [market, setMarket] = useState(meta?.market || '台股');
    const [type, setType] = useState(meta?.type || '高股息');
    const [industry, setIndustry] = useState(meta?.industry || '科技');
    const [divMode, setDivMode] = useState(meta?.mode || '季配(年化*4)');
    const [exDivMonths, setExDivMonths] = useState<number[]>(meta?.exDivMonths || []);
    const [payMonths, setPayMonths] = useState<number[]>(meta?.payMonths || []);
    const [defaultYield, setDefaultYield] = useState(meta?.defaultYield?.toString() || '5.0');

    const marketOptions = ['台股', '美股'];
    const typeOptions = ['高股息', '成長型', '市值型', '債券', '主動型'];
    const industryOptions = ['台灣50', '傳統產業', 'S&P500', '費城半導體', '科技', '金融', '航空', '美國國債', '不動產', 'ESG', 'NASDAQ', '半導體', 'IC設計', '公司債'];
    const divModeOptions = [
        { label: '月配', freq: 12 },
        { label: '雙月配', freq: 6 },
        { label: '季配', freq: 4 },
        { label: '半年配', freq: 2 },
        { label: '年配', freq: 1 },
        { label: '不配息', freq: 0 }
    ];

    const toggleMonth = (month: number, list: number[], setter: (val: number[]) => void) => {
        setter(list.includes(month) ? list.filter(m => m !== month) : [...list, month].sort((a,b)=>a-b));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const freq = divModeOptions.find(o => o.label === divMode)?.freq || 1;
        onSave({ symbol: symbol.toUpperCase(), name, market, type, industry, mode: divMode, frequency: freq, exDivMonths, payMonths, defaultYield: parseFloat(defaultYield) });
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[90vh] overflow-y-auto scrollbar-hide">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black">{mode === 'edit' ? '編輯' : '新增'}標的資料庫項目</h2>
                <button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div><label className="text-xs font-black uppercase opacity-60 mb-2 block">股票代號</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-black outline-none focus:ring-4 focus:ring-primary/20" type="text" value={symbol} onChange={e => setSymbol(e.target.value)} required disabled={mode === 'edit'} /></div>
                    <div><label className="text-xs font-black uppercase opacity-60 mb-2 block">股票名稱</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold outline-none focus:ring-4 focus:ring-primary/20" type="text" value={name} onChange={e => setName(e.target.value)} required /></div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black uppercase opacity-60 mb-2 block">市場</label>
                            <select className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold outline-none" value={market} onChange={e => setMarket(e.target.value)}>
                                {marketOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                {!marketOptions.includes(market) && <option value={market}>{market}</option>}
                            </select>
                            <input className="w-full mt-2 p-2 text-xs bg-transparent border-b border-primary/20" placeholder="或自行輸入市場..." onBlur={e => e.target.value && setMarket(e.target.value)} />
                        </div>
                        <div>
                            <label className="text-xs font-black uppercase opacity-60 mb-2 block">類型</label>
                            <select className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold outline-none" value={type} onChange={e => setType(e.target.value)}>
                                {typeOptions.map(o => <option key={o} value={o}>{o}</option>)}
                                {!typeOptions.includes(type) && <option value={type}>{type}</option>}
                            </select>
                            <input className="w-full mt-2 p-2 text-xs bg-transparent border-b border-primary/20" placeholder="或自行輸入類型..." onBlur={e => e.target.value && setType(e.target.value)} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase opacity-60 mb-2 block">產業/板塊</label>
                        <select className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold outline-none" value={industry} onChange={e => setIndustry(e.target.value)}>
                            {industryOptions.map(o => <option key={o} value={o}>{o}</option>)}
                            {!industryOptions.includes(industry) && <option value={industry}>{industry}</option>}
                        </select>
                        <input className="w-full mt-2 p-2 text-xs bg-transparent border-b border-primary/20" placeholder="或自行輸入產業..." onBlur={e => e.target.value && setIndustry(e.target.value)} />
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-black uppercase opacity-60 mb-2 block">配息模式</label>
                        <select className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold outline-none" value={divMode} onChange={e => setDivMode(e.target.value)}>
                            {divModeOptions.map(o => <option key={o.label} value={o.label}>{o.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase opacity-60 mb-2 block">預設殖利率 (%)</label>
                        <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-black text-success outline-none focus:ring-4 focus:ring-success/20" type="number" step="0.1" value={defaultYield} onChange={e => setDefaultYield(e.target.value)} required />
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase opacity-60 mb-3 block">除息月份 (可複選)</label>
                        <div className="grid grid-cols-6 gap-2">
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                <button key={m} type="button" onClick={() => toggleMonth(m, exDivMonths, setExDivMonths)} className={`py-2 rounded-xl text-xs font-black transition-all border ${exDivMonths.includes(m) ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' : 'bg-transparent border-light-border opacity-40 hover:opacity-100'}`}>{m}</button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black uppercase opacity-60 mb-3 block">領息月份 (可複選)</label>
                        <div className="grid grid-cols-6 gap-2">
                            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                                <button key={m} type="button" onClick={() => toggleMonth(m, payMonths, setPayMonths)} className={`py-2 rounded-xl text-xs font-black transition-all border ${payMonths.includes(m) ? 'bg-success text-white border-success shadow-lg shadow-success/20' : 'bg-transparent border-light-border opacity-40 hover:opacity-100'}`}>{m}</button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-6 border-t border-light-border dark:border-dark-border">
                <button type="button" onClick={onCancel} className="px-8 py-4 rounded-2xl font-black opacity-60 hover:opacity-100 transition-all">取消</button>
                <button type="submit" className="px-12 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">儲存資料項目</button>
            </div>
        </form>
    );
};

const StockTransactionForm: React.FC<{ stocks: Stock[]; settings: Settings; stockMetadata: StockMetadataMap; onSave: (formData: any, mode: any, originalTransactionId?: string) => void; onCancel: () => void; mode: 'add' | 'edit' | 'buy' | 'sell'; stock?: Stock; transaction?: Transaction; historicalPrices: HistoricalPrice[]; }> = ({ stocks, settings, stockMetadata, onSave, onCancel, mode, stock, transaction, historicalPrices }) => {
    const isAddMode = mode === 'add';
    const isSellMode = mode === 'sell' || (mode === 'edit' && transaction?.type === 'SELL');
    const [symbol, setSymbol] = useState(stock?.symbol || '');
    const [name, setName] = useState(stock?.name || '');
    const [shares, setShares] = useState(transaction?.shares?.toString() || '');
    const [price, setPrice] = useState(transaction?.price?.toString() || '');
    const [fees, setFees] = useState(transaction?.fees?.toString() || '');
    const [date, setDate] = useState(transaction?.date || new Date().toISOString().split('T')[0]);
    const [currentPrice, setCurrentPrice] = useState(stock?.currentPrice?.toString() || '');
    const [isFeeManuallyEdited, setIsFeeManuallyEdited] = useState(mode === 'edit');
    
    // 自動帶入資料庫名稱
    useEffect(() => {
        if (isAddMode && symbol) {
            const meta = stockMetadata[symbol.toUpperCase()];
            if (meta) setName(meta.name);
        }
    }, [symbol, isAddMode, stockMetadata]);

    useEffect(() => {
        const numShares = parseFloat(shares);
        const numPrice = parseFloat(price);
        if (!isFeeManuallyEdited && numShares > 0 && numPrice > 0) {
            let calculatedFee = numShares * numPrice * settings.transactionFeeRate;
            if (isSellMode) { calculatedFee += numShares * numPrice * settings.taxRate; }
            setFees(Math.floor(calculatedFee).toString());
        }
    }, [shares, price, isFeeManuallyEdited, isSellMode, settings]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ symbol: symbol.toUpperCase(), name, shares: parseFloat(shares), price: parseFloat(price), currentPrice: currentPrice ? parseFloat(currentPrice) : undefined, fees: parseFloat(fees), date, type: (isSellMode ? 'SELL' : 'BUY') as 'BUY' | 'SELL' }, mode, transaction?.id);
    };
    
    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">{isAddMode ? '新增持股' : `交易編輯`}</h2><button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-black outline-none focus:ring-4 focus:ring-primary/20" type="text" placeholder="股票代號" value={symbol} onChange={e => setSymbol(e.target.value)} required disabled={!isAddMode} />
              <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold outline-none focus:ring-4 focus:ring-primary/20" type="text" placeholder="股票名稱" value={name} onChange={e => setName(e.target.value)} disabled={mode === 'buy' || mode === 'sell'} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold outline-none focus:ring-4 focus:ring-primary/20" type="number" step="any" placeholder={`${isSellMode ? '賣出' : '買入'}股數`} value={shares} onChange={e => setShares(e.target.value)} required />
              <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold outline-none focus:ring-4 focus:ring-primary/20" type="number" step="any" placeholder={`${isSellMode ? '賣出' : '買入'}單價`} value={price} onChange={e => setPrice(e.target.value)} required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><label className="text-xs font-black uppercase opacity-60 ml-1">交易日期</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold mt-1 outline-none" type="date" value={date} onChange={e => setDate(e.target.value)} required /></div>
                <div><label className="text-xs font-black uppercase opacity-60 ml-1">手續費/稅額</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold mt-1 outline-none" type="number" step="any" value={fees} onChange={e => { setFees(e.target.value); setIsFeeManuallyEdited(true); }} required /></div>
            </div>
            <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={onCancel} className="px-6 py-3 rounded-xl font-black opacity-60">取消</button><button type="submit" className="px-10 py-3 bg-primary text-white rounded-xl font-black shadow-lg shadow-primary/20">儲存交易紀錄</button></div>
        </form>
    );
};

// ... 其他 Form (StrategyForm, DividendForm 等) 同樣需要傳入 stockMetadata 來進行自動補完，限於篇幅此處僅展示核心修改 ...
const StrategyForm: React.FC<{ onSave: (s: Omit<Strategy, 'id'>, id?: string) => void; onCancel: () => void; mode: 'add' | 'edit'; strategy?: Strategy; stockMetadata: StockMetadataMap; }> = ({ onSave, onCancel, mode, strategy, stockMetadata }) => {
    const [name, setName] = useState(strategy?.name || '');
    const [targetSymbol, setTargetSymbol] = useState(strategy?.targetSymbol || '');
    const [initialAmount, setInitialAmount] = useState(strategy?.initialAmount?.toString() || '0');
    const [monthlyAmount, setMonthlyAmount] = useState(strategy?.monthlyAmount?.toString() || '10000');
    const [exDivExtraAmount, setExDivExtraAmount] = useState(strategy?.exDivExtraAmount?.toString() || '5000');
    const [reinvest, setReinvest] = useState(strategy?.reinvest ?? true);
    const [expectedAnnualReturn, setExpectedAnnualReturn] = useState(strategy?.expectedAnnualReturn?.toString() || '8');
    const [expectedDividendYield, setExpectedDividendYield] = useState(strategy?.expectedDividendYield?.toString() || '5');

    // 關聯資料庫
    const meta = stockMetadata[targetSymbol];

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            name: name || `${targetSymbol} 複利計畫`,
            targetSymbol,
            initialAmount: parseFloat(initialAmount),
            monthlyAmount: parseFloat(monthlyAmount),
            exDivExtraAmount: parseFloat(exDivExtraAmount),
            reinvest,
            expectedAnnualReturn: parseFloat(expectedAnnualReturn),
            expectedDividendYield: parseFloat(expectedDividendYield),
        }, strategy?.id);
    };

    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">複利加碼實驗</h2><button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <div><label className="text-xs font-black uppercase opacity-60 mb-2 block">目標標的</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-black outline-none" type="text" value={targetSymbol} onChange={e => setTargetSymbol(e.target.value.toUpperCase())} required />{meta && <p className="text-[10px] text-success font-black mt-1">✓ 資料庫已關聯: {meta.name} ({meta.mode})</p>}</div>
                    <div><label className="text-xs font-black uppercase opacity-60 mb-2 block">策略名稱</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="text" value={name} onChange={e => setName(e.target.value)} /></div>
                </div>
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="text-xs font-black uppercase opacity-60 mb-2 block">預期殖利率 (%)</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-black text-success" type="number" step="0.1" value={expectedDividendYield} onChange={e => setExpectedDividendYield(e.target.value)} /></div>
                        <div><label className="text-xs font-black uppercase opacity-60 mb-2 block">預期年化 (%)</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-black text-primary" type="number" step="0.1" value={expectedAnnualReturn} onChange={e => setExpectedAnnualReturn(e.target.value)} /></div>
                    </div>
                    <div className="flex items-center gap-3 pt-4"><input type="checkbox" checked={reinvest} onChange={e => setReinvest(e.target.checked)} className="w-6 h-6 accent-primary" /><label className="font-black text-sm">領息後自動滾入複利</label></div>
                </div>
            </div>
            <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={onCancel} className="px-6 py-3 font-black opacity-60">取消</button><button type="submit" className="px-10 py-3 bg-primary text-white rounded-xl font-black shadow-lg">開始實驗</button></div>
        </form>
    );
};

const DeleteConfirmation: React.FC<{title: string, message?: string, onConfirm: () => void; onCancel: () => void}> = ({ title, message, onConfirm, onCancel }) => (
    <div className="p-8 text-center">
        <h2 className="text-2xl font-black mb-4">{title}</h2>
        <p className="mb-8 font-medium opacity-70">{message || '您確定要執行此操作嗎？這可能無法復原。'}</p>
        <div className="flex gap-4">
            <button onClick={onCancel} className="flex-1 py-4 rounded-2xl font-black border border-light-border dark:border-dark-border">取消</button>
            <button onClick={onConfirm} className="flex-1 py-4 bg-danger text-white rounded-2xl font-black shadow-lg shadow-danger/20">確認執行</button>
        </div>
    </div>
);

const BudgetEntryForm: React.FC<{onSave: (d: Omit<BudgetEntry, 'id'>) => void; onCancel: () => void; mode: 'add' | 'edit'; entry?: BudgetEntry;}> = ({ onSave, onCancel, mode, entry }) => {
    const [type, setType] = useState<BudgetEntry['type']>(entry?.type || 'DEPOSIT');
    const [amount, setAmount] = useState(entry?.amount.toString() || '');
    const [date, setDate] = useState(entry?.date || new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(entry?.description || '');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ type, amount: parseFloat(amount), date, description }); };
    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">{mode === 'edit' ? '編輯' : '新增'}預算項目</h2><button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <select value={type} onChange={(e) => setType(e.target.value as BudgetEntry['type'])} className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-black"><option value="DEPOSIT">資金存入 (+)</option><option value="WITHDRAWAL">資金提出 (-)</option></select>
            <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="number" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} required />
            <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="text" placeholder="說明" value={description} onChange={e => setDescription(e.target.value)} required />
            <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end pt-2"><button type="submit" className="px-10 py-3 bg-primary text-white rounded-xl font-black shadow-lg">儲存預算項目</button></div>
        </form>
    );
};

const DividendForm: React.FC<{ stocks: Stock[]; onSave: (d: Omit<Dividend, 'id'>) => void; onCancel: () => void; mode: 'add' | 'edit'; dividend?: Dividend; }> = ({ stocks, onSave, onCancel, mode, dividend }) => {
    const isEditMode = mode === 'edit';
    const [stockSymbol, setStockSymbol] = useState(dividend?.stockSymbol || ''); const [sharesHeld, setSharesHeld] = useState(dividend?.sharesHeld?.toString() || ''); const [dividendPerShare, setDividendPerShare] = useState(dividend?.dividendPerShare?.toString() || ''); const [amount, setAmount] = useState(dividend?.amount || 0); const [date, setDate] = useState(dividend?.date || new Date().toISOString().split('T')[0]);
    useEffect(() => { if (!isEditMode) { const stockData = stocks.find(s => s.symbol.toUpperCase() === stockSymbol.toUpperCase()); if (stockData) { const { currentShares } = calculateStockFinancials(stockData); setSharesHeld(currentShares.toString()); } else { setSharesHeld('0'); } } }, [stockSymbol, stocks, isEditMode]);
    useEffect(() => { const numShares = parseFloat(sharesHeld); const numDivPerShare = parseFloat(dividendPerShare); if (numShares > 0 && !isNaN(numDivPerShare) && numDivPerShare >= 0) { const netIncome = Math.floor(numShares * numDivPerShare - 10); setAmount(netIncome > 0 ? netIncome : 0); } }, [sharesHeld, dividendPerShare]);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ stockSymbol: stockSymbol.toUpperCase(), amount, date, sharesHeld: parseFloat(sharesHeld), dividendPerShare: parseFloat(dividendPerShare) }); };
    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">{isEditMode ? '編輯' : '新增'}股利</h2><button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-black" type="text" placeholder="股票代號" value={stockSymbol} onChange={e => setStockSymbol(e.target.value)} required />
            <div className="grid grid-cols-2 gap-4"><div><label className="text-xs font-black uppercase opacity-60 mb-1 block">參與股數</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="number" value={sharesHeld} onChange={e => setSharesHeld(e.target.value)} required /></div><div><label className="text-xs font-black uppercase opacity-60 mb-1 block">每股股利</label><input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="number" step="any" value={dividendPerShare} onChange={e => setDividendPerShare(e.target.value)} required /></div></div>
            <div className="p-4 bg-success/10 rounded-2xl"><div className="text-xs font-black text-success uppercase mb-1">預估淨收入 (扣除10元郵資)</div><div className="text-xl font-black text-success">${amount.toLocaleString()}</div></div>
            <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end pt-2"><button type="submit" className="px-10 py-3 bg-primary text-white rounded-xl font-black shadow-lg">儲存股利紀錄</button></div>
        </form>
    );
};

const DonationForm: React.FC<{onSave: (d: Omit<Donation, 'id'>) => void; onCancel: () => void; mode: 'add' | 'edit'; donation?: Donation;}> = ({ onSave, onCancel, mode, donation }) => {
    const [amount, setAmount] = useState(donation?.amount.toString() || ''); const [date, setDate] = useState(donation?.date || new Date().toISOString().split('T')[0]); const [description, setDescription] = useState(donation?.description || '');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ amount: parseFloat(amount), date, description }); };
    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-5">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">{mode === 'edit' ? '編輯' : '新增'}奉獻</h2><button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="number" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} required />
            <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="text" placeholder="說明" value={description} onChange={e => setDescription(e.target.value)} required />
            <input className="w-full p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border font-bold" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end pt-2"><button type="submit" className="px-10 py-3 bg-primary text-white rounded-xl font-black shadow-lg">儲存奉獻紀錄</button></div>
        </form>
    );
};

const UpdateAllPricesForm: React.FC<{
    stocks: Stock[];
    onSave: (prices: { [symbol: string]: number }) => void;
    onCancel: () => void;
}> = ({ stocks, onSave, onCancel }) => {
    const [prices, setPrices] = useState<{ [symbol: string]: string }>({});
    const sortedStocks = useMemo(() => { return [...stocks].sort((a, b) => a.symbol.localeCompare(b.symbol, undefined, { numeric: true })); }, [stocks]);
    useEffect(() => { const initialPrices = stocks.reduce((acc, stock) => { acc[stock.symbol] = stock.currentPrice?.toString() || ''; return acc; }, {} as any); setPrices(initialPrices); }, [stocks]);
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); const numericPrices: any = {}; Object.entries(prices).forEach(([s, p]) => { if(p.trim() !== '') numericPrices[s] = parseFloat(p); }); onSave(numericPrices); };
    return (
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
            <div className="flex justify-between items-center"><h2 className="text-2xl font-black">一鍵更新股價</h2><button type="button" onClick={onCancel} className="p-2 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {sortedStocks.map(stock => (
                    <div key={stock.symbol} className="flex items-center justify-between gap-4 p-4 bg-light-bg dark:bg-dark-bg rounded-2xl border border-light-border dark:border-dark-border">
                        <span className="font-black">{stock.symbol} <span className="text-xs opacity-50">{stock.name}</span></span>
                        <input type="number" step="any" value={prices[stock.symbol] || ''} onChange={e => setPrices({...prices, [stock.symbol]: e.target.value})} className="w-32 p-2 rounded-lg border bg-light-card dark:bg-dark-card font-black text-right" placeholder="0.00" />
                    </div>
                ))}
            </div>
            <div className="flex justify-end pt-4"><button type="submit" className="w-full py-4 bg-primary text-white rounded-2xl font-black shadow-lg">儲存並寫入歷史</button></div>
        </form>
    );
};
