
import React, { useState, useMemo, useEffect } from 'react';
import { CloseIcon } from './Icons';
import type { Stock, Transaction, Dividend, Donation, Settings, HistoricalPrice, BudgetEntry } from '../types';
import { calculateStockFinancials, getLatestHistoricalPrice } from '../utils/calculations';
import { stockMaster } from '../utils/data';
import { ParsedResult } from '../utils/parser';

export type ModalType = 'STOCK_TRANSACTION' | 'DIVIDEND' | 'DONATION_FORM' | 'DELETE_CONFIRMATION' | 'IMPORT_CONFIRMATION' | 'IMPORT_PREVIEW' | 'BUDGET_ENTRY' | 'UPDATE_ALL_PRICES';
export interface ModalState {
  type: ModalType;
  data?: any;
}

// --- Modal and Forms ---
export const ModalContainer: React.FC<{modal: ModalState; closeModal: () => void; onSaveTransaction: any; onSaveDividend: any; onSaveDonation: any; onSaveBudgetEntry: any; onUpdateAllPrices: (prices: { [symbol: string]: number }) => void; onBulkImport: (type: string, data: any[]) => void; stocks: Stock[]; settings: Settings; historicalPrices: HistoricalPrice[];}> = ({ modal, closeModal, onSaveTransaction, onSaveDividend, onSaveDonation, onSaveBudgetEntry, onUpdateAllPrices, onBulkImport, stocks, settings, historicalPrices }) => {
    const renderContent = () => {
        if (!modal.type) return null;
        switch(modal.type) {
            case 'STOCK_TRANSACTION': return <StockTransactionForm stocks={stocks} settings={settings} onSave={onSaveTransaction} onCancel={closeModal} mode={modal.data.mode} stock={modal.data.stock} transaction={modal.data.transaction} historicalPrices={historicalPrices} />;
            case 'DIVIDEND': return <DividendForm stocks={stocks} onSave={handleSaveDividend} onCancel={closeModal} mode={modal.data.mode} dividend={modal.data.dividend} />;
            case 'DONATION_FORM': return <DonationForm onSave={handleSaveDonation} onCancel={closeModal} mode={modal.data.mode} donation={modal.data.donation} />;
            case 'DELETE_CONFIRMATION': return <DeleteConfirmation title={modal.data.title} message={modal.data.message} onConfirm={modal.data.onConfirm} onCancel={modal.data.onCancel || closeModal} />;
            case 'IMPORT_PREVIEW': return <ImportPreviewModal parsedData={modal.data.parsedData} importType={modal.data.importType} onConfirm={onBulkImport} onCancel={closeModal} />;
            case 'BUDGET_ENTRY': return <BudgetEntryForm onSave={handleSaveBudgetEntry} onCancel={closeModal} mode={modal.data.mode} entry={modal.data.entry} />;
            case 'UPDATE_ALL_PRICES': return <UpdateAllPricesForm stocks={modal.data.stocks} onSave={onUpdateAllPrices} onCancel={closeModal} />;
            default: return null;
        }
    };
    
    const handleSaveDividend = (data: Omit<Dividend, 'id'>) => onSaveDividend(data, modal.data?.dividend?.id);
    const handleSaveDonation = (data: Omit<Donation, 'id'>) => onSaveDonation(data, modal.data?.donation?.id);
    const handleSaveBudgetEntry = (data: Omit<BudgetEntry, 'id'>) => onSaveBudgetEntry(data, modal.data?.entry?.id);

    if (!modal) return null;
    
    const isLargeModal = modal.type === 'IMPORT_PREVIEW' || modal.type === 'UPDATE_ALL_PRICES';

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <div className={`bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full ${isLargeModal ? 'max-w-2xl' : 'max-w-md'}`} onClick={e => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>
    );
};

const StockTransactionForm: React.FC<{ stocks: Stock[]; settings: Settings; onSave: (formData: Omit<Transaction, 'id'> & { symbol: string; name?: string; currentPrice?: number }, mode: 'add' | 'edit' | 'buy' | 'sell', originalTransactionId?: string) => void; onCancel: () => void; mode: 'add' | 'edit' | 'buy' | 'sell'; stock?: Stock; transaction?: Transaction; historicalPrices: HistoricalPrice[]; }> = ({ stocks, settings, onSave, onCancel, mode, stock, transaction, historicalPrices }) => {
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
    
    const { currentShares } = useMemo(() => {
        if (!stock) return { currentShares: 0 };
        return calculateStockFinancials(stock);
    }, [stock]);
    
    useEffect(() => {
        if (isAddMode) {
            const masterName = stockMaster[symbol.toUpperCase()];
            if (masterName) {
                setName(masterName);
            }
        }
    }, [symbol, isAddMode]);

    useEffect(() => {
        const numShares = parseFloat(shares);
        const numPrice = parseFloat(price);
        if (!isFeeManuallyEdited && numShares > 0 && numPrice > 0) {
            let calculatedFee = numShares * numPrice * settings.transactionFeeRate;
            if (isSellMode) {
                calculatedFee += numShares * numPrice * settings.taxRate;
            }
            setFees(Math.floor(calculatedFee).toString());
        }
    }, [shares, price, isFeeManuallyEdited, isSellMode, settings]);
    
    const calculatedAvgCost = useMemo(() => { const numShares = parseFloat(shares); const numPrice = parseFloat(price); const numFees = parseFloat(fees); if (numShares > 0 && numPrice >= 0 && numFees >= 0) { return ((numPrice * numShares + numFees) / numShares).toFixed(4); } return '0.00'; }, [shares, price, fees]);
    
    const handleUseLatestPrice = () => {
        const latestPrice = getLatestHistoricalPrice(symbol, historicalPrices);
        if (latestPrice !== null) {
            setCurrentPrice(latestPrice.toString());
        } else {
            alert(`股票 ${symbol} 尚無歷史股價紀錄。`);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numShares = parseFloat(shares);
        if (isSellMode && numShares > currentShares) {
             if (!transaction || transaction.shares < numShares) {
                alert(`賣出股數 (${numShares.toLocaleString()}) 不可超過目前持有股數 (${currentShares.toLocaleString()})。`);
                return;
            }
        }
        const formData = { symbol: symbol.toUpperCase(), name, shares: numShares, price: parseFloat(price), currentPrice: currentPrice ? parseFloat(currentPrice) : undefined, fees: parseFloat(fees), date, type: (isSellMode ? 'SELL' : 'BUY') as 'BUY' | 'SELL' };
        onSave(formData, mode, transaction?.id);
    };
    
    const title = { add: '新增持股', edit: `編輯交易 (${stock?.symbol})`, buy: `買入 (${stock?.symbol})`, sell: `賣出 (${stock?.symbol})` }[mode];
    const actionText = isSellMode ? '賣出' : '買入';

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{title}</h2><button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            { (mode === 'buy' || mode === 'sell') && <div className="p-3 bg-light-bg dark:bg-dark-bg rounded-lg text-center">目前持有股數: <span className="font-bold">{currentShares.toLocaleString()}</span></div> }
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="text" placeholder="股票代號" value={symbol} onChange={e => setSymbol(e.target.value)} required disabled={!isAddMode} />
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="text" placeholder="股票名稱 (選填)" value={name} onChange={e => setName(e.target.value)} disabled={mode === 'buy' || mode === 'sell'} />
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" step="any" placeholder={`${actionText}股數`} value={shares} onChange={e => setShares(e.target.value)} required />
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" step="any" placeholder={`${actionText}單價`} value={price} onChange={e => setPrice(e.target.value)} required />
            <div>
                <label className="text-sm text-light-text/70 dark:text-dark-text/70">更新目前股價 (選填)</label>
                <div className="relative mt-1">
                    <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" step="any" placeholder="手動更新股價" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} />
                    <button type="button" onClick={handleUseLatestPrice} className="absolute right-2 top-1/2 -translate-y-1/2 text-xs bg-primary/20 text-primary px-2 py-1 rounded hover:bg-primary/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" disabled={!symbol} title="使用最新的歷史價格">套用最新</button>
                </div>
            </div>
            <div><label className="text-sm text-light-text/70 dark:text-dark-text/70">{`${actionText}手續費`}{isSellMode && ' + 證交稅'}</label><input className="w-full p-3 mt-1 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" step="any" value={fees} onChange={e => { setFees(e.target.value); setIsFeeManuallyEdited(true); }} required /></div>
            {!isSellMode && <div><label className="text-sm text-light-text/70 dark:text-dark-text/70">成本均價 (參考)</label><input className="w-full p-3 mt-1 bg-light-bg/70 dark:bg-dark-bg/70 rounded-lg border border-light-border dark:border-dark-border" type="text" value={calculatedAvgCost} readOnly disabled /></div>}
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg">取消</button><button type="submit" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover">儲存</button></div>
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{isEditMode ? '編輯' : '新增'}股利</h2><button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="text" placeholder="股票代號" value={stockSymbol} onChange={e => setStockSymbol(e.target.value)} required />
            <div><label className="text-sm text-light-text/70 dark:text-dark-text/70">持有股數 (除息日)</label><input className="w-full p-3 mt-1 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" value={sharesHeld} onChange={e => setSharesHeld(e.target.value)} required /></div>
            <div><label className="text-sm text-light-text/70 dark:text-dark-text/70">每股股利</label><input className="w-full p-3 mt-1 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" step="any" placeholder="請輸入每股現金股利" value={dividendPerShare} onChange={e => setDividendPerShare(e.target.value)} required /></div>
            <div><label className="text-sm text-light-text/70 dark:text-dark-text/70">股利淨收入 (自動計算: 股數*每股股利-10元郵費)</label><input className="w-full p-3 mt-1 bg-light-bg/70 dark:bg-dark-bg/70 rounded-lg border border-light-border dark:border-dark-border" type="number" value={amount} readOnly disabled /></div>
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg">取消</button><button type="submit" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover">儲存</button></div>
        </form>
    );
};

const DonationForm: React.FC<{onSave: (d: Omit<Donation, 'id'>) => void; onCancel: () => void; mode: 'add' | 'edit'; donation?: Donation;}> = ({ onSave, onCancel, mode, donation }) => {
    const [amount, setAmount] = useState(donation?.amount.toString() || '');
    const [date, setDate] = useState(donation?.date || new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(donation?.description || '');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ amount: parseFloat(amount), date, description }); };
    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{mode === 'edit' ? '編輯' : '新增'}奉獻紀錄</h2><button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" step="any" placeholder="奉獻金額" value={amount} onChange={e => setAmount(e.target.value)} required />
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="text" placeholder="說明" value={description} onChange={e => setDescription(e.target.value)} required />
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg">取消</button><button type="submit" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover">儲存</button></div>
        </form>
    );
};

const BudgetEntryForm: React.FC<{onSave: (d: Omit<BudgetEntry, 'id'>) => void; onCancel: () => void; mode: 'add' | 'edit'; entry?: BudgetEntry;}> = ({ onSave, onCancel, mode, entry }) => {
    const [type, setType] = useState<BudgetEntry['type']>(entry?.type || 'DEPOSIT');
    const [amount, setAmount] = useState(entry?.amount.toString() || '');
    const [date, setDate] = useState(entry?.date || new Date().toISOString().split('T')[0]);
    const [description, setDescription] = useState(entry?.description || '');
    const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSave({ type, amount: parseFloat(amount), date, description }); };
    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="flex justify-between items-center"><h2 className="text-xl font-bold">{mode === 'edit' ? '編輯' : '新增'}預算項目</h2><button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button></div>
            <select value={type} onChange={(e) => setType(e.target.value as BudgetEntry['type'])} className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border">
                <option value="DEPOSIT">存入 / 資金流入</option>
                <option value="WITHDRAWAL">提出 / 資金流出</option>
            </select>
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" step="any" placeholder="金額" value={amount} onChange={e => setAmount(e.target.value)} required />
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="text" placeholder="說明 (例如: 增加投資本金)" value={description} onChange={e => setDescription(e.target.value)} required />
            <input className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <div className="flex justify-end space-x-3 pt-2"><button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg">取消</button><button type="submit" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover">儲存</button></div>
        </form>
    );
};

const DeleteConfirmation: React.FC<{title: string, message?: string, onConfirm: () => void; onCancel: () => void}> = ({ title, message, onConfirm, onCancel }) => (
    <div className="p-6">
        <h2 className="text-xl font-bold mb-4">{title}</h2>
        <p className="mb-6">{message || '您確定要刪除嗎？此操作無法復原。'}</p>
        <div className="flex justify-end space-x-3">
            <button onClick={onCancel} className="px-5 py-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg">取消</button>
            <button onClick={onConfirm} className="px-5 py-2 bg-danger text-white rounded-lg hover:opacity-90">確認刪除</button>
        </div>
    </div>
);

const ImportPreviewModal: React.FC<{
  parsedData: ParsedResult<any>;
  importType: 'transactions' | 'dividends' | 'donations' | 'prices';
  onConfirm: (type: string, data: any[]) => void;
  onCancel: () => void;
}> = ({ parsedData, importType, onConfirm, onCancel }) => {
    const { success, errors } = parsedData;
    const typeMap = { transactions: '交易', dividends: '股利', donations: '奉獻', prices: '歷史股價' };
    const title = `預覽匯入的${typeMap[importType]}資料`;

    const renderSuccessTable = () => {
        if (success.length === 0) return null;
        const headers = Object.keys(success[0]);
        return (
            <div className="max-h-60 overflow-y-auto border border-light-border dark:border-dark-border rounded-lg">
                <table className="w-full text-sm">
                    <thead className="bg-light-bg dark:bg-dark-bg sticky top-0">
                        <tr>
                            {headers.map(h => <th key={h} className="p-2 font-semibold text-left">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-light-border dark:divide-dark-border">
                        {success.map((item, index) => (
                            <tr key={index} className="hover:bg-light-bg dark:hover:bg-dark-bg">
                                {headers.map(h => <td key={h} className="p-2 whitespace-nowrap">{String(item[h])}</td>)}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="p-6 space-y-4">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">{title}</h2>
                <button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg"><CloseIcon className="h-6 w-6"/></button>
            </div>

            {success.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2 text-success">成功解析 {success.length} 筆資料：</h3>
                    {renderSuccessTable()}
                </div>
            )}

            {errors.length > 0 && (
                <div>
                    <h3 className="font-semibold mb-2 text-danger">發現 {errors.length} 筆格式錯誤：</h3>
                    <ul className="max-h-32 overflow-y-auto bg-light-bg dark:bg-dark-bg p-3 rounded-lg text-sm space-y-1">
                        {errors.map((err, i) => <li key={i}>第 {err.line} 行: {err.error}</li>)}
                    </ul>
                </div>
            )}
            
            <p className="text-sm text-light-text/70 dark:text-dark-text/70">
                {success.length > 0 ? `確認後將匯入 ${success.length} 筆有效資料。錯誤的資料將被忽略。` : '沒有可匯入的有效資料。'}
            </p>

            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg">取消</button>
                <button 
                    type="button" 
                    onClick={() => onConfirm(importType, success)} 
                    className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover disabled:bg-gray-400"
                    disabled={success.length === 0}
                >
                    確認匯入
                </button>
            </div>
        </div>
    );
};

const UpdateAllPricesForm: React.FC<{
    stocks: Stock[];
    onSave: (prices: { [symbol: string]: number }) => void;
    onCancel: () => void;
}> = ({ stocks, onSave, onCancel }) => {
    const [prices, setPrices] = useState<{ [symbol: string]: string }>({});

    // Sort stocks by symbol ascending for display
    const sortedStocks = useMemo(() => {
        return [...stocks].sort((a, b) => a.symbol.localeCompare(b.symbol, undefined, { numeric: true, sensitivity: 'base' }));
    }, [stocks]);

    useEffect(() => {
        const initialPrices = stocks.reduce((acc, stock) => {
            acc[stock.symbol] = stock.currentPrice?.toString() || '';
            return acc;
        }, {} as { [symbol: string]: string });
        setPrices(initialPrices);
    }, [stocks]);

    const handlePriceChange = (symbol: string, value: string) => {
        setPrices(prev => ({ ...prev, [symbol]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericPrices: { [symbol: string]: number } = {};
        let hasError = false;
        
        const stocksWithInputs = stocks.filter(stock => prices[stock.symbol] && prices[stock.symbol].trim() !== '');

        if (stocksWithInputs.length === 0) {
            onCancel(); 
            return;
        }

        for (const stock of stocksWithInputs) {
            const symbol = stock.symbol;
            const priceStr = prices[symbol];
            const priceNum = parseFloat(priceStr);
            if (!isNaN(priceNum) && priceNum >= 0) {
                numericPrices[symbol] = priceNum;
            } else {
                alert(`股票 ${symbol} 的價格無效。`);
                hasError = true;
                break;
            }
        }
        
        if (!hasError) {
            onSave(numericPrices);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">一鍵更新最新股價</h2>
                <button type="button" onClick={onCancel} className="p-1 rounded-full hover:bg-light-bg dark:hover:bg-dark-bg">
                    <CloseIcon className="h-6 w-6"/>
                </button>
            </div>
            <p className="text-sm text-light-text/70 dark:text-dark-text/70">
                輸入您目前持有股票的最新價格。儲存後，此價格將會更新個股的「現價」，並寫入至本月份的歷史價格紀錄中。
            </p>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {sortedStocks.map(stock => (
                    <div key={stock.symbol} className="grid grid-cols-[1fr_auto] items-center gap-4">
                        <label htmlFor={`price-${stock.symbol}`} className="font-medium text-light-text dark:text-dark-text truncate" title={`${stock.symbol} ${stock.name}`}>
                           {stock.symbol} <span className="text-sm text-light-text/70 dark:text-dark-text/70">{stock.name}</span>
                        </label>
                        <input
                            id={`price-${stock.symbol}`}
                            type="number"
                            step="any"
                            placeholder="最新價格"
                            value={prices[stock.symbol] || ''}
                            onChange={e => handlePriceChange(stock.symbol, e.target.value)}
                            className="w-32 p-2 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border focus:ring-primary focus:border-primary"
                        />
                    </div>
                ))}
            </div>
            <div className="flex justify-end space-x-3 pt-2">
                <button type="button" onClick={onCancel} className="px-5 py-2 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg">取消</button>
                <button type="submit" className="px-5 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary-hover">儲存</button>
            </div>
        </form>
    );
};
