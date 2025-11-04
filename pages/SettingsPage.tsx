import React, { useRef } from 'react';
import { DownloadIcon, UploadIcon } from '../components/Icons';
import { ModalState } from '../components/modals';

interface SettingsPageProps {
    onExport: () => void;
    onImport: (data: any) => void;
    openModal: (modal: ModalState) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ onExport, onImport, openModal }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
  
  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold hidden md:block">設定</h1>
      <div className="space-y-8 max-w-2xl">
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">資料匯出</h2>
          <p className="mb-6 text-light-text/80 dark:text-dark-text/80">將您所有的投資組合、股利和奉獻紀錄匯出為一個 JSON 檔案作為備份。</p>
          <button onClick={onExport} className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold py-3 px-5 rounded-lg flex items-center"><DownloadIcon className="h-5 w-5 mr-2" />匯出資料</button>
        </div>
        <div className="bg-light-card dark:bg-dark-card p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">資料匯入</h2>
          <p className="mb-6 text-danger">警告：匯入資料將會覆蓋您目前所有的紀錄。請先匯出現有資料作為備份。</p>
          <button onClick={handleImportClick} className="border border-primary text-primary hover:bg-primary/10 font-bold py-3 px-5 rounded-lg flex items-center"><UploadIcon className="h-5 w-5 mr-2" />匯入資料</button>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
        </div>
      </div>
    </div>
  );
};
