import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  MinusCircle,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import {
  FilterOptions,
  GradeLevel,
  SortField,
  Student,
  StudentStatus,
} from '../types/student';
import { GRADE_LEVEL_ORDER } from '../utils/studentAnalytics';

interface StudentDirectoryViewProps {
  students: Student[];
  availableClassrooms: string[];
  totalCount: number;
  filters: FilterOptions;
  isSheetConnected: boolean;
  syncing?: boolean;
  onFiltersChange: (next: FilterOptions) => void;
  onResetFilters: () => void;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onSyncSheet: () => void;
  onExportCsv: () => void;
}

export const StudentDirectoryView: React.FC<StudentDirectoryViewProps> = ({
  students,
  availableClassrooms,
  totalCount,
  filters,
  isSheetConnected,
  syncing = false,
  onFiltersChange,
  onResetFilters,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onSyncSheet,
  onExportCsv,
}) => {

  const hasActiveFilter =
    filters.search.trim() !== '' ||
    filters.gradeLevel !== 'ALL' ||
    filters.classroom !== 'ALL' ||
    filters.status !== 'ALL';

  const renderStatus = (status: StudentStatus) => {
    if (status === 'ปกติ') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 whitespace-nowrap">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>ปกติ</span>
        </span>
      );
    }
    if (status === 'เฝ้าระวัง') {
      return (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 whitespace-nowrap">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>เฝ้าระวัง</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 whitespace-nowrap">
        <MinusCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>ลาออก/ย้าย</span>
      </span>
    );
  };

  return (
    <div className="space-y-4" data-testid="student-directory-view">
      {/* Filter & Actions Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              />
              <input
                type="search"
                value={filters.search}
                onChange={(e) =>
                  onFiltersChange({ ...filters, search: e.target.value })
                }
                placeholder="ค้นหารหัส ชื่อ-นามสกุล หรือเบอร์โทร..."
                aria-label="ค้นหานักเรียน"
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <select
              aria-label="กรองตามระดับชั้น"
              value={filters.gradeLevel}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  gradeLevel: e.target.value as GradeLevel | 'ALL',
                  classroom: 'ALL',
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">ทุกระดับชั้น</option>
              {GRADE_LEVEL_ORDER.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>

            <select
              aria-label="กรองตามห้องเรียน"
              value={filters.classroom}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  classroom: e.target.value,
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">ทุกห้อง</option>
              {availableClassrooms.map((room) => (
                <option key={room} value={room}>
                  ห้อง {room}
                </option>
              ))}
            </select>

            <select
              aria-label="กรองตามสถานะ"
              value={filters.status}
              onChange={(e) =>
                onFiltersChange({
                  ...filters,
                  status: e.target.value as StudentStatus | 'ALL' | 'ATTENTION',
                })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="ATTENTION">ต้องติดตามดูแล</option>
              <option value="ปกติ">ปกติ</option>
              <option value="เฝ้าระวัง">เฝ้าระวัง</option>
              <option value="ลาออก/ย้าย">ลาออก/ย้าย</option>
            </select>

            <select
              aria-label="เรียงลำดับข้อมูล"
              value={`${filters.sortField}:${filters.sortDirection}`}
              onChange={(e) => {
                const [sortField, sortDirection] = e.target.value.split(':') as [
                  SortField,
                  'asc' | 'desc'
                ];
                onFiltersChange({ ...filters, sortField, sortDirection });
              }}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
            >
              <option value="studentId:asc">รหัสนักเรียน (น้อย → มาก)</option>
              <option value="studentId:desc">รหัสนักเรียน (มาก → น้อย)</option>
              <option value="gpa:desc">เกรดเฉลี่ย (สูง → ต่ำ)</option>
              <option value="gpa:asc">เกรดเฉลี่ย (ต่ำ → สูง)</option>
              <option value="attendanceRate:asc">การเข้าเรียน (ต่ำ → สูง)</option>
              <option value="fullName:asc">ชื่อ (ก → ฮ)</option>
            </select>

            {hasActiveFilter && (
              <button
                type="button"
                onClick={onResetFilters}
                className="whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-medium text-blue-700 hover:bg-blue-50"
              >
                ล้างตัวกรอง
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {isSheetConnected && (
              <button
                type="button"
                onClick={onSyncSheet}
                disabled={syncing}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`}
                />
                <span>ซิงค์จาก Sheet</span>
              </button>
            )}
            <button
              type="button"
              onClick={onExportCsv}
              disabled={students.length === 0}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <Download className="h-3.5 w-3.5" />
              <span>ส่งออก CSV</span>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs text-slate-500">
          <span className="tabular-nums">
            แสดง {students.length} จากทั้งหมด {totalCount} คน
          </span>
          <span>
            {isSheetConnected
              ? 'ซิงค์ข้อมูลโดยตรงกับ Google Sheets'
              : 'โหมดข้อมูลตัวอย่างในเครื่อง'}
          </span>
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        {students.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <p className="text-sm font-medium text-slate-900">
              {hasActiveFilter
                ? 'ไม่พบข้อมูลนักเรียนที่ตรงกับเงื่อนไขการค้นหา'
                : 'ยังไม่มีรายชื่อนักเรียน'}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {hasActiveFilter
                ? 'ลองเปลี่ยนคำค้นหาหรือล้างตัวกรองเพื่อดูรายชื่อทั้งหมด'
                : 'คลิก "เพิ่มนักเรียน" เพื่อเริ่มต้นบันทึกข้อมูล'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              {hasActiveFilter ? (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onAddStudent}
                  className="whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 text-xs font-medium text-white hover:bg-blue-800"
                >
                  เพิ่มนักเรียนคนแรก
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="students-table">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="whitespace-nowrap px-4 py-3">รหัส</th>
                  <th className="whitespace-nowrap px-4 py-3">ชื่อ-นามสกุล</th>
                  <th className="whitespace-nowrap px-4 py-3">ชั้น/ห้อง</th>
                  <th className="whitespace-nowrap px-4 py-3">เพศ</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">เกรดเฉลี่ย</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">เข้าเรียน</th>
                  <th className="whitespace-nowrap px-4 py-3">สถานะ</th>
                  <th className="whitespace-nowrap px-4 py-3">เบอร์ผู้ปกครอง</th>
                  <th className="whitespace-nowrap px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {students.map((student) => (
                  <tr
                    key={student.id}
                    className="transition-colors hover:bg-slate-50/80"
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-medium text-slate-700 tabular-nums">
                      {student.studentId}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">
                        {student.fullName}
                      </div>
                      {student.note && (
                        <div className="mt-0.5 max-w-xs truncate text-xs text-slate-500">
                          {student.note}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 tabular-nums">
                      {student.gradeLevel}/{student.classroom}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">
                      {student.gender}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-mono font-semibold tabular-nums ${
                        student.gpa < 2.0
                          ? 'text-red-600'
                          : student.gpa >= 3.5
                          ? 'text-blue-700'
                          : 'text-slate-900'
                      }`}
                    >
                      {student.gpa.toFixed(2)}
                    </td>
                    <td
                      className={`whitespace-nowrap px-4 py-3 text-right font-mono tabular-nums ${
                        student.attendanceRate < 80
                          ? 'font-semibold text-amber-700'
                          : 'text-slate-700'
                      }`}
                    >
                      {student.attendanceRate}%
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {renderStatus(student.status)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600 tabular-nums">
                      {student.guardianPhone || '–'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => onEditStudent(student)}
                          aria-label={`แก้ไข ${student.fullName}`}
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-blue-700"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteStudent(student)}
                          aria-label={`ลบ ${student.fullName}`}
                          className="rounded-md p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
