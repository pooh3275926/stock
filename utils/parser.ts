import type { Transaction, Dividend, Donation } from '../types';

export interface ParseError {
    line: number;
    error: string;
}

export interface ParsedResult<T> {
    success: T[];
    errors: ParseError[];
}

const isValidDate = (dateString: string): boolean => {
    const d = new Date(dateString);
    return d instanceof Date && !isNaN(d.getTime());
};

export const parseTransactions = (text: string): ParsedResult<Omit<Transaction, 'id'> & { symbol: string }> => {
    const success: (Omit<Transaction, 'id'> & { symbol: string })[] = [];
    const errors: ParseError[] = [];

    const lines = text.split('\n');
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmedLine = line.trim();
        if (trimmedLine === '') return;

        const parts = trimmedLine.split(',').map(p => p.trim());
        if (parts.length !== 6) {
            errors.push({ line: lineNumber, error: '格式錯誤，應有 6 個欄位' });
            return;
        }

        const [symbol, type, sharesStr, priceStr, date, feesStr] = parts;

        const upperType = type.toUpperCase();
        if (upperType !== 'BUY' && upperType !== 'SELL') {
            errors.push({ line: lineNumber, error: `無效的交易類型: "${type}"` });
            return;
        }

        const shares = parseFloat(sharesStr);
        if (isNaN(shares) || shares <= 0) {
            errors.push({ line: lineNumber, error: `無效的股數: "${sharesStr}"` });
            return;
        }

        const price = parseFloat(priceStr);
        if (isNaN(price) || price < 0) {
            errors.push({ line: lineNumber, error: `無效的價格: "${priceStr}"` });
            return;
        }
        
        if (!isValidDate(date)) {
            errors.push({ line: lineNumber, error: `無效的日期格式: "${date}"` });
            return;
        }

        const fees = parseFloat(feesStr);
        if (isNaN(fees) || fees < 0) {
            errors.push({ line: lineNumber, error: `無效的手續費: "${feesStr}"` });
            return;
        }

        success.push({
            symbol: symbol.toUpperCase(),
            type: upperType as 'BUY' | 'SELL',
            shares,
            price,
            date,
            fees
        });
    });

    return { success, errors };
};


export const parseDividends = (text: string): ParsedResult<Omit<Dividend, 'id'>> => {
    const success: Omit<Dividend, 'id'>[] = [];
    const errors: ParseError[] = [];

    const lines = text.split('\n');
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmedLine = line.trim();
        if (trimmedLine === '') return;

        const parts = trimmedLine.split(',').map(p => p.trim());
        if (parts.length !== 4) {
            errors.push({ line: lineNumber, error: '格式錯誤，應有 4 個欄位 (代號,股數,每股股利,日期)' });
            return;
        }

        const [stockSymbol, sharesHeldStr, dividendPerShareStr, date] = parts;

        const sharesHeld = parseFloat(sharesHeldStr);
        if (isNaN(sharesHeld) || sharesHeld <= 0) {
            errors.push({ line: lineNumber, error: `無效的股數: "${sharesHeldStr}"` });
            return;
        }

        const dividendPerShare = parseFloat(dividendPerShareStr);
        if (isNaN(dividendPerShare) || dividendPerShare < 0) {
            errors.push({ line: lineNumber, error: `無效的每股股利: "${dividendPerShareStr}"` });
            return;
        }
        
        if (!isValidDate(date)) {
            errors.push({ line: lineNumber, error: `無效的日期格式: "${date}"` });
            return;
        }

        const amount = Math.max(0, Math.floor(sharesHeld * dividendPerShare - 10));

        success.push({
            stockSymbol: stockSymbol.toUpperCase(),
            amount,
            date,
            sharesHeld,
            dividendPerShare,
        });
    });

    return { success, errors };
};


export const parseDonations = (text: string): ParsedResult<Omit<Donation, 'id'>> => {
    const success: Omit<Donation, 'id'>[] = [];
    const errors: ParseError[] = [];

    const lines = text.split('\n');
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmedLine = line.trim();
        if (trimmedLine === '') return;

        const parts = trimmedLine.split(',').map(p => p.trim());
        if (parts.length !== 3) {
            errors.push({ line: lineNumber, error: '格式錯誤，應有 3 個欄位' });
            return;
        }

        const [amountStr, date, description] = parts;
        
        const amount = parseFloat(amountStr);
        if (isNaN(amount) || amount <= 0) {
            errors.push({ line: lineNumber, error: `無效的金額: "${amountStr}"` });
            return;
        }
        
        if (!isValidDate(date)) {
            errors.push({ line: lineNumber, error: `無效的日期格式: "${date}"` });
            return;
        }

        if (!description) {
            errors.push({ line: lineNumber, error: '說明不可為空' });
            return;
        }

        success.push({ amount, date, description });
    });

    return { success, errors };
};

export const parseHistoricalPrices = (text: string): ParsedResult<{ symbol: string, yearMonth: string, price: number }> => {
    const success: { symbol: string, yearMonth: string, price: number }[] = [];
    const errors: ParseError[] = [];

    const lines = text.split('\n');
    lines.forEach((line, index) => {
        const lineNumber = index + 1;
        const trimmedLine = line.trim();
        if (trimmedLine === '') return;

        const parts = trimmedLine.split(',').map(p => p.trim());
        if (parts.length < 3) {
            errors.push({ line: lineNumber, error: '格式錯誤，至少應有 3 個欄位 (代號, 區間, 價格)' });
            return;
        }

        const [symbol, rangeStr, ...priceStrs] = parts;

        const rangeParts = rangeStr.split('-');
        if (rangeParts.length !== 2) {
            errors.push({ line: lineNumber, error: `無效的區間格式: "${rangeStr}"，應為 YYYY/MM-YYYY/MM` });
            return;
        }
        
        const dateRegex = /^(\d{4})\/(\d{2})$/;
        const startMatch = rangeParts[0].match(dateRegex);
        const endMatch = rangeParts[1].match(dateRegex);

        if (!startMatch || !endMatch) {
            errors.push({ line: lineNumber, error: `無效的日期格式: "${rangeStr}"，應為 YYYY/MM` });
            return;
        }

        const startYear = parseInt(startMatch[1], 10), startMonth = parseInt(startMatch[2], 10);
        const endYear = parseInt(endMatch[1], 10), endMonth = parseInt(endMatch[2], 10);

        const startDate = new Date(startYear, startMonth - 1, 1);
        const endDate = new Date(endYear, endMonth - 1, 1);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || startDate > endDate) {
            errors.push({ line: lineNumber, error: `無效的日期區間: "${rangeStr}"` });
            return;
        }
        
        const months: string[] = [];
        let currentDate = new Date(startDate);
        while (currentDate <= endDate) {
            months.push(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`);
            currentDate.setMonth(currentDate.getMonth() + 1);
        }

        if (months.length !== priceStrs.length) {
            errors.push({ line: lineNumber, error: `價格數量 (${priceStrs.length}) 與月份數量 (${months.length}) 不符` });
            return;
        }

        for (let i = 0; i < months.length; i++) {
            const price = parseFloat(priceStrs[i]);
            if (isNaN(price) || price < 0) {
                errors.push({ line: lineNumber, error: `第 ${i+1} 個價格無效: "${priceStrs[i]}"` });
                // Stop processing this line on the first bad price
                return;
            }
            success.push({
                symbol: symbol.toUpperCase(),
                yearMonth: months[i],
                price
            });
        }
    });

    return { success, errors };
};