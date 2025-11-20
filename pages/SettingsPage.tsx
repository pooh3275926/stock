
import React, { useRef, useState, useEffect } from 'react';
import { DownloadIcon, UploadIcon } from '../components/Icons';
import { ModalState } from '../components/modals';
import { parseTransactions, parseDividends, parseDonations, parseHistoricalPrices } from '../utils/parser';
import type { Settings } from '../types';

interface SettingsPageProps {
    settings: Settings;
    onUpdateSettings: (settings: Settings) => void;
    onExport: () => void;
    onImport: (data: any) => void;
    openModal: (modal: ModalState) => void;
    onBulkImport: (type: 'transactions' | 'dividends' | 'donations' | 'prices', data: any[]) => void;
}

type QuickAddTab = 'transactions' | 'dividends' | 'donations' | 'prices';

export const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onUpdateSettings, onExport, onImport, openModal, onBulkImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<QuickAddTab>('transactions');
  const [textInputs, setTextInputs] = useState({
    transactions: '',
    dividends: '',
    donations: '',
    prices: ''
  });
  
  const [localApiKey, setLocalApiKey] = useState(settings.tejApiKey || '');

  useEffect(() => {
      setLocalApiKey(settings.tejApiKey || '');
  }, [settings.tejApiKey]);

  const handleApiKeyBlur = () => {
      if (localApiKey !== settings.tejApiKey) {
          onUpdateSettings({ ...settings, tejApiKey: localApiKey });
      }
  };

  const handleInputChange = (tab: QuickAddTab, value: string) => {
    setTextInputs(prev => ({ ...prev, [tab]: value }));
  };
  
  const handleImportClick = () => fileInputRef.current?.click();
  
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') throw new Error("File content is not a string");
        const data = JSON.parse(text);
        if (!data.stocks || !data.dividends || !data.donations || !Array.isArray(data.stocks) || !Array.isArray(data.dividends) || !Array.isArray(data.donations)) {
          throw new Error("Invalid file format");
        }
        const confirmImport = () => { onImport(data); if (fileInputRef.current) fileInputRef.current.value = ""; };
        openModal({ type: 'DELETE_CONFIRMATION', data: { onConfirm: confirmImport, title: '匯入資料', message: '這將會覆蓋所有現有資料，確定要繼續嗎？', onCancel: () => { if (fileInputRef.current) fileInputRef.current.value = ""; openModal(null as any); } } });
      } catch (error) {
        alert('匯入失敗: ' + (error as Error).message);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsText(file);
  };
  
  const handleParseAndPreview = () => {
    const text = textInputs[activeTab];
    let parsedData;
    switch (activeTab) {
        case 'transactions':
            parsedData = parseTransactions(text);
            break;
        case 'dividends':
            parsedData = parseDividends(text);
            break;
        case 'donations':
            parsedData = parseDonations(text);
            break;
        case 'prices':
            parsedData = parseHistoricalPrices(text);
            break;
        default:
            return;
    }
    openModal({ type: 'IMPORT_PREVIEW', data: { parsedData, importType: activeTab, onConfirm: onBulkImport } });
  };

  const getPlaceholderText = (tab: QuickAddTab) => {
    switch (tab) {
        case 'transactions':
            return `請依此格式貼上資料，一行一筆：\n股票代號,BUY/SELL,股數,價格,日期,手續費\n例如:\n5483,BUY,1000,150.5,2024-05-20,64\n0050,SELL,500,130,2024-05-21,110`;
        case 'dividends':
            return `請依此格式貼上資料，一行一筆：\n股票代號,參與股數,每股股利,日期\n例如:\n00878,15000,0.51,2024-05-17\n00919,5000,0.55,2024-03-18`;
        case 'donations':
            return `請依此格式貼上資料，一行一筆：\n金額,日期,說明\n例如:\n1000,2024-05-01,十一奉獻\n500,2024-04-20,教會建堂`;
        case 'prices':
            return `請依此格式貼上資料，一行一筆：\n股票代號,區間(YYYY/MM-YYYY/MM),第一個月價格,第二個月價格...\n例如:\n5483,2024/01-2024/05,155,158,160.5,162,165\n00878,2023/11-2024/02,21.5,21.8,22.1,22.4`;
    }
  };

  const tabs: { key: QuickAddTab; label: string }[] = [
    { key: 'transactions', label: '交易紀錄' },
    { key: 'dividends', label: '股利' },
    { key: 'donations', label: '奉獻' },
    { key: 'prices', label: '歷史股價' },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold hidden md:block">設定</h1>
      <div className="space-y-8 max-w-4xl">
        
        {/* API Settings */}
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">TEJ API 設定</h2>
             <p className="mb-4 text-light-text/80 dark:text-dark-text/80 text-sm">
                輸入您的 TEJ API 金鑰以啟用自動更新股價與股票資訊功能。
            </p>
            <div className="flex flex-col space-y-2">
                <label htmlFor="tejApiKey" className="font-medium">API Key</label>
                <input 
                    id="tejApiKey"
                    type="password" 
                    value={localApiKey}
                    onChange={(e) => setLocalApiKey(e.target.value)}
                    onBlur={handleApiKeyBlur}
                    placeholder="請輸入 TEJ API Key"
                    className="w-full p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border focus:ring-primary focus:border-primary"
                />
                 <p className="text-xs text-light-text/60 dark:text-dark-text/60">
                    注意：API 金鑰將儲存在您的瀏覽器 LocalStorage 中。
                </p>
            </div>
        </div>

        {/* Quick Add Section */}
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">快速輸入 / 批次匯入</h2>
          <p className="mb-6 text-light-text/80 dark:text-dark-text/80">
            在此處貼上純文字資料來快速新增多筆紀錄。請確保您的資料格式符合範例，以逗號分隔。
          </p>

          <div className="flex border-b border-light-border dark:border-dark-border mb-4">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 font-semibold transition-colors ${
                  activeTab === tab.key
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-light-text/60 dark:text-dark-text/60 hover:text-primary'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <textarea
              value={textInputs[activeTab]}
              onChange={(e) => handleInputChange(activeTab, e.target.value)}
              placeholder={getPlaceholderText(activeTab)}
              className="w-full h-48 p-3 bg-light-bg dark:bg-dark-bg rounded-lg border border-light-border dark:border-dark-border focus:ring-primary focus:border-primary font-mono text-sm"
              aria-label={`${tabs.find(t => t.key === activeTab)?.label} data input`}
            />
            <div className="flex justify-end">
              <button 
                onClick={handleParseAndPreview} 
                className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-2 px-5 rounded-lg flex items-center"
                disabled={!textInputs[activeTab].trim()}
              >
                匯入資料
              </button>
            </div>
          </div>
        </div>

        {/* JSON Import/Export Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">資料匯出 (JSON)</h2>
            <p className="mb-6 text-light-text/80 dark:text-dark-text/80">將您所有的投資組合、交易、股利、奉獻和歷史股價紀錄匯出為一個 JSON 檔案作為備份。</p>
            <button onClick={onExport} className="bg-primary/80 hover:bg-primary text-primary-foreground font-bold py-3 px-5 rounded-lg flex items-center"><DownloadIcon className="h-5 w-5 mr-2" />匯出完整備份</button>
          </div>
          <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">資料匯入 (JSON)</h2>
            <p className="mb-6 text-danger">警告：匯入 JSON 備份檔將會覆蓋您目前所有的紀錄。請先匯出現有資料作為備份。</p>
            <button onClick={handleImportClick} className="border border-primary text-primary hover:bg-primary/10 font-bold py-3 px-5 rounded-lg flex items-center"><UploadIcon className="h-5 w-5 mr-2" />匯入完整備份</button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
          </div>
        </div>

      </div>
    </div>
  );
};
