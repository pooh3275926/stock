
export interface TejStockInfo {
  symbol: string;
  name: string;
  price?: number;
}

const TEJ_BASE_URL = 'https://api.tej.com.tw/api/datatables';
// Use a CORS proxy to allow fetching from the client side
// Note: For production, calls should be routed through a backend server.
const CORS_PROXY = 'https://corsproxy.io/?'; 

/**
 * Fetch stock basic information (Name) from TEJ API
 * Using TWN/AIND table (Company Attribute Information)
 */
export const fetchStockName = async (symbol: string, apiKey: string): Promise<string | null> => {
    if (!apiKey) return null;
    try {
        // Columns: coid (Symbol), stk_name (Name)
        const targetUrl = `${TEJ_BASE_URL}/TWN/AIND.json?api_key=${apiKey}&coid=${symbol}&opts.columns=coid,stk_name`;
        const url = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        // Structure: { datatable: { data: [ [ '2330', '台積電' ] ], ... } }
        if (data.datatable && data.datatable.data && data.datatable.data.length > 0) {
            return data.datatable.data[0][1]; // The second column is stk_name
        }
        return null;
    } catch (error) {
        console.error("Error fetching stock name from TEJ:", error);
        return null;
    }
};

/**
 * Fetch latest stock price from TEJ API
 * Using TWN/APRCD (Adjusted Price)
 */
export const fetchLatestPrice = async (symbol: string, apiKey: string): Promise<number | null> => {
    if (!apiKey) return null;
    try {
        // Using Adjusted Price (TWN/APRCD)
        // Columns: coid, mdate, close_d (Adjusted Close)
        // sort=-mdate to get latest first, per_page=1
        const targetUrl = `${TEJ_BASE_URL}/TWN/APRCD.json?api_key=${apiKey}&coid=${symbol}&opts.columns=coid,mdate,close_d&sort=-mdate&per_page=1`;
        const url = `${CORS_PROXY}${encodeURIComponent(targetUrl)}`;
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Network response was not ok');

        const data = await response.json();
        // Structure: { datatable: { data: [ [ '2330', '2024-01-01', 580.5 ] ], ... } }
        if (data.datatable && data.datatable.data && data.datatable.data.length > 0) {
             return parseFloat(data.datatable.data[0][2]); // The third column is close_d
        }
        return null;
    } catch (error) {
        console.error("Error fetching price from TEJ:", error);
        return null;
    }
};

/**
 * Fetch both Name and Price
 */
export const fetchStockData = async (symbol: string, apiKey: string): Promise<TejStockInfo> => {
    const [name, price] = await Promise.all([
        fetchStockName(symbol, apiKey),
        fetchLatestPrice(symbol, apiKey)
    ]);

    return {
        symbol,
        name: name || '',
        price: price || undefined
    };
};
