
export interface StockMetadata {
    name: string;
    market: '台股' | '美股';
    type: string;
    industry: string;
}

export const stockDefinitions: { [key: string]: StockMetadata } = {
    '0050': { name: '元大台灣50', market: '台股', type: '市值型', industry: '台灣50' },
    '0056': { name: '元大高股息', market: '台股', type: '高股息', industry: '傳統產業' },
    '00646': { name: '元大S&P500', market: '美股', type: '市值型', industry: 'S&P500' },
    '00830': { name: '國泰費城半導體', market: '美股', type: '成長型', industry: '費城半導體' },
    '00858': { name: '永豐美國500大', market: '美股', type: '高股息', industry: 'S&P500' },
    '00881': { name: '國泰台灣科技龍頭', market: '台股', type: '成長型', industry: '科技' },
    '00918': { name: '大華優利高填息30', market: '台股', type: '高股息', industry: '金融' },
    '00919': { name: '群益台灣精選高息', market: '台股', type: '高股息', industry: '金融' },
    '00922': { name: '國泰台灣領袖50', market: '台股', type: '高股息', industry: '台灣50' },
    '00924': { name: '復華S&P500成長', market: '美股', type: '成長型', industry: 'S&P500' },
    '009813': { name: '貝萊德標普卓越50', market: '美股', type: '成長型', industry: 'S&P500' },
    '00981A': { name: '主動統一台股增長', market: '台股', type: '主動型', industry: '科技' },
    '00985A': { name: '主動野村台灣50', market: '台股', type: '主動型', industry: '台灣50' },
    '2646': { name: '星宇航空', market: '台股', type: '成長型', industry: '航空' },
    '0052': { name: '富邦科技', market: '台股', type: '成長型', industry: '科技' },
    '006208': { name: '富邦台50', market: '台股', type: '市值型', industry: '台灣50' },
    '00679B': { name: '元大美債20年', market: '美股', type: '債券', industry: '美國國債' },
    '00701': { name: '國泰股利精選30', market: '台股', type: '高股息', industry: '金融' },
    '00712': { name: '復華富時不動產', market: '美股', type: '債券', industry: '不動產' },    
    '00713': { name: '元大台灣高息低波', market: '台股', type: '高股息', industry: '金融' },
    '00878': { name: '國泰永續高股息', market: '台股', type: '高股息', industry: 'ESG' },
    '00895': { name: '富邦未來車', market: '美股', type: '成長型', industry: 'NASDAQ' },
    '00915': { name: '凱基優選高股息30', market: '台股', type: '高股息', industry: '金融' },
    '00921': { name: '兆豐龍頭等權重', market: '台股', type: '市值型', industry: '台灣50' },
    '00927': { name: '群益半導體收益', market: '台股', type: '成長型', industry: '半導體' },
    '00929': { name: '復華台灣科技優息', market: '台股', type: '高股息', industry: '科技' },
    '00932': { name: '兆豐永續高息等權', market: '台股', type: '高股息', industry: 'ESG' },
    '00933B': { name: '國泰10Y+金融債', market: '美股', type: '債券', industry: '金融' },
    '00934': { name: '中信成長高股息', market: '台股', type: '高股息', industry: '科技' },
    '00935': { name: '野村臺灣新科技50', market: '台股', type: '成長型', industry: '科技' },
    '00936': { name: '台新永續高息中小', market: '台股', type: '高股息', industry: 'ESG' },
    '00937B': { name: '群益ESG投等債20+', market: '美股', type: '債券', industry: 'ESG' },
    '00940': { name: '元大台灣價值高息', market: '台股', type: '高股息', industry: '傳統產業' },
    '00946': { name: '群益科技高息成長', market: '台股', type: '成長型', industry: '科技' },
    '00947': { name: '台新臺灣IC設計', market: '台股', type: '成長型', industry: 'IC設計' },
    '00980A': { name: '主動野村臺灣優選', market: '台股', type: '主動型', industry: '科技' },
    '00981B': { name: '第一金優選非投債', market: '美股', type: '債券', industry: '公司債' },    
    '00982A': { name: '主動群益台灣強棒', market: '台股', type: '主動型', industry: '科技' },
    '00983A': { name: '主動中信ARK創新', market: '美股', type: '主動型', industry: 'NASDAQ' },
    '00984A': { name: '主動安聯台灣高息', market: '台股', type: '主動型', industry: '金融' },
    '00986A': { name: '主動台新龍頭成長', market: '美股', type: '主動型', industry: 'NASDAQ' },
    '00991A': { name: '主動復華未來50', market: '台股', type: '主動型', industry: '半導體' },        
    '2330': { name: '台積電', market: '台股', type: '成長型', industry: '半導體' },    
    '5483': { name: '中美晶', market: '台股', type: '成長型', industry: '半導體' },
};

// 複利加碼策略資料庫 (1-indexed months)
export const stockDividendCalendar: { [key: string]: { exDivMonths: number[], payMonths: number[] } } = {
    '0050': { exDivMonths: [1, 7], payMonths: [2, 8] },
    '0056': { exDivMonths: [1, 4, 7, 10], payMonths: [2, 5, 8, 11] },
    '00881': { exDivMonths: [1, 8], payMonths: [2, 9] },
    '00918': { exDivMonths: [3, 6, 9, 12], payMonths: [1, 4, 7, 10] },
    '00919': { exDivMonths: [3, 6, 9, 12], payMonths: [1, 4, 7, 10] },
    '00922': { exDivMonths: [3, 10], payMonths: [4, 11] },
};

// 預設殖利率資料庫
export const stockDefaultYields: { [key: string]: number } = {
    '0056': 8,
    '00918': 10,
    '00919': 10,
    '00922': 5,
    '00881': 5,
};

export const stockMaster: { [key: string]: string } = Object.entries(stockDefinitions).reduce((acc, [key, val]) => {
    acc[key] = val.name;
    return acc;
}, {} as { [key: string]: string });

export const stockDividendFrequency: { [key: string]: number } = {
    '0050': 2,
    '0056': 4,
    '00646': 1,
    '00830': 1,    
    '00858': 2,
    '00881': 2,
    '00918': 4,
    '00919': 4,
    '00922': 2,
    '00924': 1,    
    '009813': 2,
    '00981A': 1,
    '00985A': 1,
    '2646': 1,    
    '0052': 1,
    '006208': 2,
    '00679B': 4,    
    '00701': 2,
    '00712': 4,    
    '00713': 4,
    '00878': 4,
    '00895': 1,         
    '00915': 4,
    '00921': 4,
    '00927': 4,
    '00929': 12,
    '00932': 4,
    '00933B': 12,
    '00934': 12,
    '00935': 2,
    '00936': 12,
    '00937B': 12,
    '00940': 12,
    '00946': 12,
    '00947': 4,
    '00980A': 4, 
    '00981B': 12,     
    '00982A': 4,
    '00983A': 1, 
    '00984A': 4,  
    '00986A': 1,   
    '00991A': 2,      
    '2330': 4,       
    '5483': 2,    
};
