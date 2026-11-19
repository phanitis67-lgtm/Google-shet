import React, { useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  ExternalLink,
  FileSpreadsheet,
  FolderOpen,
  Link2,
  LogOut,
  Plus,
  RefreshCw,
  Unlink,
} from 'lucide-react';
import { DriveSpreadsheetFile } from '../services/googleSheetsApi';
import { SheetConnection } from '../types/student';
import { extractSpreadsheetId, STUDENT_SHEET_HEADERS } from '../utils/sheetsCodec';
import { GoogleSignInButton } from './GoogleSignInButton';

interface GoogleSheetsPanelProps {
  user: User | null;
  needsAuth: boolean;
  isLoggingIn: boolean;
  connection: SheetConnection | null;
  driveFiles: DriveSpreadsheetFile[];
  loadingFiles: boolean;
  busyAction: boolean;
  errorMessage: string | null;
  onLogin: () => void;
  onLogout: () => void;
  onCreateSheet: (title: string, includeSeed: boolean) => void;
  onConnectSpreadsheetId: (spreadsheetId: string) => void;
  onChangeTab: (sheetTitle: string) => void;
  onRefreshData: () => void;
  onDisconnectSheet: () => void;
  onRefreshDriveFiles: () => void;
}

export const GoogleSheetsPanel: React.FC<GoogleSheetsPanelProps> = ({
  user,
  needsAuth,
  isLoggingIn,
  connection,
  driveFiles,
  loadingFiles,
  busyAction,
  errorMessage,
  onLogin,
  onLogout,
  onCreateSheet,
  onConnectSpreadsheetId,
  onChangeTab,
  onRefreshData,
  onDisconnectSheet,
  onRefreshDriveFiles,
}) => {
  const [newSheetTitle, setNewSheetTitle] = useState('ทะเบียนข้อมูลนักเรียน ปีการศึกษา 2569');
  const [includeSeed, setIncludeSeed] = useState(true);
  const [sheetUrlInput, setSheetUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateSheet(newSheetTitle, includeSeed);
  };

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedId = extractSpreadsheetId(sheetUrlInput);
    if (!parsedId) {
      setUrlError(
        'รูปแบบ URL หรือ Spreadsheet ID ไม่ถูกต้อง กรุณาวางลิงก์ Google Sheets เต็ม หรือรหัส ID'
      );
      return;
    }
    setUrlError(null);
    onConnectSpreadsheetId(parsedId);
  };

  return (
    <div className="space-y-6" data-testid="google-sheets-panel">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      )}

      {/* Account Authentication Status */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              1. บัญชี Google สำหรับจัดเก็บสเปรดชีต
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {needsAuth
                ? 'เข้าสู่ระบบด้วยบัญชี Google เพื่อสร้างหรือเชื่อมต่อไฟล์ Google Sheets ของคุณโดยตรง'
                : `เชื่อมต่อบัญชี ${user?.displayName || user?.email || 'Google Account'} เรียบร้อยแล้ว`}
            </p>
          </div>

          {needsAuth ? (
            <GoogleSignInButton onClick={onLogin} loading={isLoggingIn} />
          ) : (
            <div className="flex items-center gap-3">
              <div className="text-right text-xs">
                <div className="font-medium text-slate-900">
                  {user?.displayName || 'ผู้ใช้งาน Google'}
                </div>
                <div className="text-slate-500">{user?.email}</div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>ออกจากระบบ</span>
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Active Connection Summary */}
      {!needsAuth && connection && (
        <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                <span>กำลังเชื่อมต่อกับ Google Sheets</span>
              </div>
              <h3 className="text-lg font-semibold text-slate-900">
                {connection.spreadsheetTitle}
              </h3>
              <p className="text-xs text-slate-600 font-mono">
                ID: {connection.spreadsheetId}
                {connection.lastSyncedAt && (
                  <>
                    {' '}
                    · ซิงค์ล่าสุด{' '}
                    {new Date(connection.lastSyncedAt).toLocaleTimeString('th-TH', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </>
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-2">
                <label htmlFor="sheet-tab-select" className="text-xs font-medium text-slate-600">
                  แท็บชีต:
                </label>
                <select
                  id="sheet-tab-select"
                  value={connection.sheetTitle}
                  onChange={(e) => onChangeTab(e.target.value)}
                  disabled={busyAction}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-800 focus:border-blue-600 focus:outline-none"
                >
                  {connection.availableTabs.map((tab) => (
                    <option key={tab.sheetId} value={tab.title}>
                      {tab.title}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="button"
                onClick={onRefreshData}
                disabled={busyAction}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${busyAction ? 'animate-spin' : ''}`} />
                <span>ดึงข้อมูลล่าสุด</span>
              </button>

              <a
                href={`https://docs.google.com/spreadsheets/d/${connection.spreadsheetId}/edit`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-blue-700 px-3 py-2 text-xs font-medium text-white hover:bg-blue-800"
              >
                <span>เปิดใน Google Sheets</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <button
                type="button"
                onClick={onDisconnectSheet}
                disabled={busyAction}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100"
              >
                <Unlink className="h-3.5 w-3.5" />
                <span>สลับใช้ข้อมูลทดลอง</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Setup / Connect Options */}
      {!needsAuth && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Option A: Create New Spreadsheet */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
                <FileSpreadsheet className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  สร้าง Google Sheet ใหม่ทันที
                </h2>
                <p className="text-xs text-slate-500">
                  สร้างสเปรดชีตพร้อมหัวตารางมาตรฐาน 10 คอลัมน์ให้อัตโนมัติ
                </p>
              </div>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="new-sheet-title"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  ชื่อไฟล์ Google Sheet
                </label>
                <input
                  id="new-sheet-title"
                  type="text"
                  value={newSheetTitle}
                  onChange={(e) => setNewSheetTitle(e.target.value)}
                  placeholder="เช่น ทะเบียนนักเรียน ม.ปลาย 2569"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeSeed}
                  onChange={(e) => setIncludeSeed(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                />
                <span>คัดลอกข้อมูลตัวอย่าง 12 คนลงในไฟล์ใหม่เพื่อเริ่มต้นใช้งาน</span>
              </label>

              <button
                type="submit"
                disabled={busyAction}
                className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
              >
                <Plus className="h-4 w-4" />
                <span>{busyAction ? 'กำลังสร้างสเปรดชีต...' : 'สร้างและเชื่อมต่อ Google Sheet'}</span>
              </button>
            </form>
          </section>

          {/* Option B: Connect Existing Spreadsheet */}
          <section className="rounded-xl border border-slate-200 bg-white p-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <Link2 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  เชื่อมต่อ Google Sheet ที่มีอยู่แล้ว
                </h2>
                <p className="text-xs text-slate-500">
                  วางลิงก์ URL ของสเปรดชีต หรือเลือกจากไฟล์ที่สร้างผ่านแอปนี้
                </p>
              </div>
            </div>

            <form onSubmit={handleConnectSubmit} className="mt-5 space-y-3">
              <div>
                <label
                  htmlFor="existing-sheet-url"
                  className="mb-1.5 block text-xs font-medium text-slate-700"
                >
                  ลิงก์ Google Sheets หรือ Spreadsheet ID
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    id="existing-sheet-url"
                    type="text"
                    value={sheetUrlInput}
                    onChange={(e) => {
                      setSheetUrlInput(e.target.value);
                      setUrlError(null);
                    }}
                    placeholder="https://docs.google.com/spreadsheets/d/..."
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  />
                  <button
                    type="submit"
                    disabled={busyAction}
                    className="whitespace-nowrap rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    เชื่อมต่อ
                  </button>
                </div>
                {urlError && <p className="mt-1.5 text-xs text-red-600">{urlError}</p>}
              </div>
            </form>

            {/* Recent Spreadsheets created/used by this app */}
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">
                  สเปรดชีตในบัญชีของคุณ (ที่ใช้งานร่วมกับแอป)
                </span>
                <button
                  type="button"
                  onClick={onRefreshDriveFiles}
                  disabled={loadingFiles}
                  className="text-xs font-medium text-blue-700 hover:underline disabled:opacity-50"
                >
                  {loadingFiles ? 'กำลังโหลด...' : 'รีเฟรชรายการ'}
                </button>
              </div>

              {driveFiles.length === 0 ? (
                <p className="mt-2.5 text-xs text-slate-400">
                  ยังไม่มีไฟล์สเปรดชีตที่สร้างผ่านแอปนี้ สามารถกด "สร้าง Google Sheet ใหม่" ด้านซ้ายได้เลย
                </p>
              ) : (
                <ul className="mt-2.5 divide-y divide-slate-100">
                  {driveFiles.slice(0, 5).map((file) => (
                    <li
                      key={file.id}
                      className="flex items-center justify-between gap-3 py-2"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <FolderOpen className="h-4 w-4 shrink-0 text-slate-400" />
                        <span className="truncate text-sm text-slate-800">{file.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onConnectSpreadsheetId(file.id)}
                        disabled={busyAction}
                        className="whitespace-nowrap shrink-0 rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                      >
                        เลือกไฟล์นี้
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Sheet Column Schema Guide */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="text-base font-semibold text-slate-900">
          โครงสร้างคอลัมน์มาตรฐานใน Google Sheet (A – J)
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          หากคุณเชื่อมต่อกับไฟล์ Google Sheet ที่มีอยู่แล้ว แนะนำให้จัดลำดับคอลัมน์ตามตารางนี้เพื่อให้แดชบอร์ดสรุปผลได้อย่างครบถ้วน
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-slate-600">
                {STUDENT_SHEET_HEADERS.map((header, idx) => (
                  <th key={header} className="whitespace-nowrap px-3 py-2.5 font-semibold">
                    {String.fromCharCode(65 + idx)}: {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="text-slate-600 font-mono">
                <td className="whitespace-nowrap px-3 py-2.5">67001</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-sans">กิตติพงศ์ วัฒนากูล</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-sans">ม.4</td>
                <td className="whitespace-nowrap px-3 py-2.5">1</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-sans">ชาย</td>
                <td className="whitespace-nowrap px-3 py-2.5">3.82</td>
                <td className="whitespace-nowrap px-3 py-2.5">98</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-sans">ปกติ</td>
                <td className="whitespace-nowrap px-3 py-2.5">081-452-8891</td>
                <td className="whitespace-nowrap px-3 py-2.5 font-sans">หัวหน้าห้อง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
