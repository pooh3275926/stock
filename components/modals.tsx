import React, { useState, useMemo, useEffect } from 'react';
import { CloseIcon } from './Icons';
import type { Stock, Transaction, Dividend, Donation, Settings } from '../types';
import { calculateStockFinancials } from '../utils/calculations';
import { stockMaster } from '../utils/data';

export type ModalType = 'STOCK_TRANSACTION' | 'DIVIDEND' | 'DONATION_FORM' | 'DELETE_CONFIRMATION' | 'IMPORT_CONFIRMATION';
export interface ModalState {
  type: ModalType;
  data?: any;
}

// --- Modal and Forms ---
export const ModalContainer: React.FC<{modal: ModalState; closeModal: () => void; onSaveTransaction: any; onSaveDividend: any; onSaveDonation: any; stocks: Stock[]; settings: Settings}> = ({ modal, closeModal, onSaveTransaction, onSaveDividend, onSaveDonation, stocks, settings }) => {
    const renderContent = () => {
        switch(modal.type) {
            case 'STOCK_TRANSACTION': return <StockTransactionForm stocks={stocks} settings={settings} onSave={onSaveTransaction} onCancel={closeModal} mode={modal.data.mode} stock={modal.data.stock} transaction={modal.data.transaction} />;
            case 'DIVIDEND': return <DividendForm stocks={stocks} onSave={handleSaveDividend} onCancel={closeModal} mode={modal.data.mode} dividend={modal.data.dividend} />;
            case 'DONATION_FORM': return <DonationForm onSave={handleSaveDonation} onCancel={closeModal} mode={modal.data.mode} donation={modal.data.donation} />;
            case 'DELETE_CONFIRMATION': return <DeleteConfirmation title={modal.data.title} message={modal.data.message} onConfirm={modal.data.onConfirm} onCancel={modal.data.onCancel || closeModal} />;
            default: return null;
        }
    };
    
    const handleSaveDividend = (data: Omit<Dividend, 'id'>) => onSaveDividend(data, modal.data?.dividend?.id);
    const handleSaveDonation = (data: Omit<Donation, 'id'>) => onSaveDonation(data, modal.data?.donation?.id);

    if (!modal) return null;
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={closeModal}>
            <div className="bg-light-card dark:bg-dark-card rounded-lg shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                {renderContent()}
            </div>
        </div>
    );
};

const StockTransactionForm: React.FC<{ stocks: Stock[]; settings: Settings; onSave: (formData: Omit<Transaction, 'id'> & { symbol: string; name?: string; currentPrice?: number }, mode: 'add' | 'edit' | 'buy' | 'sell', originalTransactionId?: string) => void; onCancel: () => void; mode: 'add' | 'edit' | 'buy' | 'sell'; stock?: Stock; transaction?: Transaction; }> = ({ stocks, settings, onSave, onCancel, mode, stock, transaction }) => {
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
            <div><label className="text-sm text-light-text/70 dark:text-dark-text/70">更新目前股價 (選填)</label><input className="w-full p-3 mt-1 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border" type="number" step="any" placeholder="手動更新股價" value={currentPrice} onChange={e => setCurrentPrice(e.target.value)} /></div>
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