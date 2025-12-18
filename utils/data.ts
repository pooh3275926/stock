import { StockMetadataMap } from '../types';

export const initialStockMetadataMap: StockMetadataMap = {
    // --- 原有資料 ---
    '0050': { symbol: '0050', name: '元大台灣50', market: '台股', type: '市值型', industry: '台灣50', mode: '半年配', frequency: 2, exDivMonths: [1, 7], payMonths: [2, 8], defaultYield: 3.5 },
    '0056': { symbol: '0056', name: '元大高股息', market: '台股', type: '高股息', industry: '傳統產業', mode: '季配', frequency: 4, exDivMonths: [1, 4, 7, 10], payMonths: [2, 5, 8, 11], defaultYield: 8 },
    '00646': { symbol: '00646', name: '元大S&P500', market: '美股', type: '市值型', industry: 'S&P500', mode: '不配息', frequency: 0, exDivMonths: [], payMonths: [], defaultYield: 0 },
    '00878': { symbol: '00878', name: '國泰永續高股息', market: '台股', type: '高股息', industry: 'ESG', mode: '季配', frequency: 4, exDivMonths: [2, 5, 8, 11], payMonths: [3, 6, 9, 12], defaultYield: 6.5 },
    '00919': { symbol: '00919', name: '群益台灣精選高息', market: '台股', type: '高股息', industry: '金融', mode: '季配', frequency: 4, exDivMonths: [3, 6, 9, 12], payMonths: [1, 4, 7, 10], defaultYield: 10 },
    '00713': { symbol: '00713', name: '元大台灣高息低波', market: '台股', type: '高股息', industry: '金融', mode: '季配', frequency: 4, exDivMonths: [3, 6, 9, 12], payMonths: [1, 4, 7, 10], defaultYield: 7 },
    '00929': { symbol: '00929', name: '復華台灣科技優息', market: '台股', type: '高股息', industry: '科技', mode: '月配', frequency: 12, exDivMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 9 },

    // --- 新增資料 (台股 ETF) ---
    '0052': { symbol: '0052', name: '富邦科技', market: '台股', type: '成長型', industry: '科技', mode: '年配', frequency: 1, exDivMonths: [4], payMonths: [5], defaultYield: 3.0 },
    '006208': { symbol: '006208', name: '富邦台50', market: '台股', type: '市值型', industry: '台灣50', mode: '半年配', frequency: 2, exDivMonths: [7, 11], payMonths: [8, 12], defaultYield: 3.5 },
    '00701': { symbol: '00701', name: '國泰股利精選30', market: '台股', type: '高股息', industry: '金融', mode: '半年配', frequency: 2, exDivMonths: [1, 8], payMonths: [2, 9], defaultYield: 5.5 },
    '00915': { symbol: '00915', name: '凱基優選高股息30', market: '台股', type: '高股息', industry: '金融', mode: '季配', frequency: 4, exDivMonths: [3, 6, 9, 12], payMonths: [4, 7, 10, 1], defaultYield: 9.0 },
    '00918': { symbol: '00918', name: '大華優利高填息30', market: '台股', type: '高股息', industry: '金融', mode: '季配', frequency: 4, exDivMonths: [3, 6, 9, 12], payMonths: [4, 7, 10, 1], defaultYield: 9.5 },
    '00921': { symbol: '00921', name: '兆豐龍頭等權重', market: '台股', type: '市值型', industry: '台灣50', mode: '季配', frequency: 4, exDivMonths: [3, 6, 9, 12], payMonths: [4, 7, 10, 1], defaultYield: 5.0 },
    '00922': { symbol: '00922', name: '國泰台灣領袖50', market: '台股', type: '高股息', industry: '台灣50', mode: '半年配', frequency: 2, exDivMonths: [3, 10], payMonths: [4, 11], defaultYield: 6.0 },
    '00927': { symbol: '00927', name: '群益半導體收益', market: '台股', type: '成長型', industry: '半導體', mode: '季配', frequency: 4, exDivMonths: [1, 4, 7, 10], payMonths: [2, 5, 8, 11], defaultYield: 6.0 },
    '00932': { symbol: '00932', name: '兆豐永續高息等權', market: '台股', type: '高股息', industry: 'ESG', mode: '季配', frequency: 4, exDivMonths: [2, 5, 8, 11], payMonths: [3, 6, 9, 12], defaultYield: 7.0 },
    '00934': { symbol: '00934', name: '中信成長高股息', market: '台股', type: '高股息', industry: '科技', mode: '月配', frequency: 12, exDivMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 8.0 },
    '00935': { symbol: '00935', name: '野村臺灣新科技50', market: '台股', type: '成長型', industry: '科技', mode: '半年配', frequency: 2, exDivMonths: [3, 9], payMonths: [4, 10], defaultYield: 4.5 },
    '00936': { symbol: '00936', name: '台新永續高息中小', market: '台股', type: '高股息', industry: 'ESG', mode: '月配', frequency: 12, exDivMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 7.5 },
    '00940': { symbol: '00940', name: '元大台灣價值高息', market: '台股', type: '高股息', industry: '傳統產業', mode: '月配', frequency: 12, exDivMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 8.0 },
    '00946': { symbol: '00946', name: '群益科技高息成長', market: '台股', type: '成長型', industry: '科技', mode: '月配', frequency: 12, exDivMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 7.5 },
    '00947': { symbol: '00947', name: '台新臺灣IC設計', market: '台股', type: '成長型', industry: 'IC設計', mode: '季配', frequency: 4, exDivMonths: [1, 4, 7, 10], payMonths: [2, 5, 8, 11], defaultYield: 4.0 },
    '00881': { symbol: '00881', name: '國泰台灣科技龍頭', market: '台股', type: '成長型', industry: '科技', mode: '半年配', frequency: 2, exDivMonths: [1, 8], payMonths: [2, 9], defaultYield: 4.0 },

    // --- 新增資料 (債券型 ETF) ---
    '00679B': { symbol: '00679B', name: '元大美債20年', market: '美股', type: '債券', industry: '美國國債', mode: '季配', frequency: 4, exDivMonths: [2, 5, 8, 11], payMonths: [3, 6, 9, 12], defaultYield: 4.2 },
    '00712': { symbol: '00712', name: '復華富時不動產', market: '美股', type: '債券', industry: '不動產', mode: '季配', frequency: 4, exDivMonths: [3, 6, 9, 12], payMonths: [4, 7, 10, 1], defaultYield: 8.0 },
    '00933B': { symbol: '00933B', name: '國泰10Y+金融債', market: '美股', type: '債券', industry: '金融', mode: '月配', frequency: 12, exDivMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 5.5 },
    '00937B': { symbol: '00937B', name: '群益ESG投等債20+', market: '美股', type: '債券', industry: 'ESG', mode: '月配', frequency: 12, exDivMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 6.0 },
    '00981B': { symbol: '00981B', name: '第一金優選非投債', market: '美股', type: '債券', industry: '公司債', mode: '月配', frequency: 12, exDivMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], payMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], defaultYield: 6.5 },

    // --- 新增資料 (海外/美股 ETF) ---
    '00830': { symbol: '00830', name: '國泰費城半導體', market: '美股', type: '成長型', industry: '費城半導體', mode: '年配', frequency: 1, exDivMonths: [1], payMonths: [2], defaultYield: 3.5 },
    '00858': { symbol: '00858', name: '永豐美國500大', market: '美股', type: '高股息', industry: 'S&P500', mode: '半年配', frequency: 2, exDivMonths: [1, 7], payMonths: [2, 8], defaultYield: 5 },
    '00924': { symbol: '00924', name: '復華S&P500成長', market: '美股', type: '成長型', industry: 'S&P500', mode: '不配息', frequency: 0, exDivMonths: [], payMonths: [], defaultYield: 0 },
    '00895': { symbol: '00895', name: '富邦未來車', market: '美股', type: '成長型', industry: 'NASDAQ', mode: '不配息', frequency: 0, exDivMonths: [], payMonths: [], defaultYield: 0 },

    // --- 新增資料 (主動型基金 ETF) ---
    '00980A': { symbol: '00980A', name: '主動野村臺灣優選', market: '台股', type: '主動型', industry: '科技', mode: '季配', frequency: 4, exDivMonths: [2, 5, 8, 11], payMonths: [3, 6, 9, 12], defaultYield: 6 },
    '00981A': { symbol: '00981A', name: '主動統一台股增長', market: '台股', type: '主動型', industry: '科技', mode: '年配', frequency: 1, exDivMonths: [9], payMonths: [10], defaultYield: 6 },
    '00982A': { symbol: '00982A', name: '主動群益台灣強棒', market: '台股', type: '主動型', industry: '科技', mode: '季配', frequency: 4, exDivMonths: [2, 5, 8, 11], payMonths: [3, 6, 9, 12], defaultYield: 6 },
    '00983A': { symbol: '00983A', name: '主動中信ARK創新', market: '美股', type: '主動型', industry: 'NASDAQ', mode: '年配', frequency: 1, exDivMonths: [1], payMonths: [2], defaultYield: 6 },
    '00984A': { symbol: '00984A', name: '主動安聯台灣高息', market: '台股', type: '主動型', industry: '金融', mode: '季配', frequency: 4, exDivMonths: [1, 4, 7, 10], payMonths: [2, 5, 8, 11], defaultYield: 6 },
    '00985A': { symbol: '00985A', name: '主動野村台灣50', market: '台股', type: '主動型', industry: '台灣50', mode: '年配', frequency: 1, exDivMonths: [1], payMonths: [2], defaultYield: 6 },
    '00986A': { symbol: '00986A', name: '主動台新龍頭成長', market: '美股', type: '主動型', industry: 'NASDAQ', mode: '年配', frequency: 1, exDivMonths: [11], payMonths: [12], defaultYield: 6 },
    '00991A': { symbol: '00991A', name: '主動復華未來50', market: '台股', type: '主動型', industry: '半導體', mode: '半年配', frequency: 2, exDivMonths: [6, 12], payMonths: [7, 1], defaultYield: 6 },

    // --- 新增資料 (個股) ---
    '2330': { symbol: '2330', name: '台積電', market: '台股', type: '成長型', industry: '半導體', mode: '季配', frequency: 4, exDivMonths: [3, 6, 9, 12], payMonths: [4, 7, 10, 1], defaultYield: 1.5 },
    '2646': { symbol: '2646', name: '星宇航空', market: '台股', type: '成長型', industry: '航空', mode: '不配息', frequency: 0, exDivMonths: [], payMonths: [], defaultYield: 0 },
    '5483': { symbol: '5483', name: '中美晶', market: '台股', type: '成長型', industry: '半導體', mode: '半年配', frequency: 2, exDivMonths: [1, 7], payMonths: [2, 8], defaultYield: 5.0 },
};