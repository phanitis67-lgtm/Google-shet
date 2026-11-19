import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { User } from 'firebase/auth';
import {
  BarChart3,
  CheckCircle2,
  FileSpreadsheet,
  Menu,
  Plus,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DashboardSummaryView } from './components/DashboardSummaryView';
import { GoogleSheetsPanel } from './components/GoogleSheetsPanel';
import { GoogleSignInButton } from './components/GoogleSignInButton';
import { StudentDirectoryView } from './components/StudentDirectoryView';
import { StudentFormModal } from './components/StudentFormModal';
import { SEED_STUDENTS } from './data/seedStudents';
import {
  clearCachedToken,
  getAccessToken,
  googleSignIn,
  initAuth,
  logout,
} from './services/googleAuth';
import {
  appendStudentToSheet,
  createStudentSpreadsheet,
  deleteStudentFromSheet,
  DriveSpreadsheetFile,
  fetchStudentsFromSheet,
  getSpreadsheetMetadata,
  listAppSpreadsheets,
  updateStudentInSheet,
  WorkspaceApiError,
} from './services/googleSheetsApi';
import {
  AppView,
  FilterOptions,
  GradeLevel,
  SheetConnection,
  Student,
  StudentFormInput,
} from './types/student';
import {
  computeDashboardSummary,
  filterAndSortStudents,
} from './utils/studentAnalytics';

const DEFAULT_FILTERS: FilterOptions = {
  search: '',
  gradeLevel: 'ALL',
  classroom: 'ALL',
  status: 'ALL',
  sortField: 'studentId',
  sortDirection: 'asc',
};

const STORAGE_SPREADSHEET_ID_KEY = 'scholarsheet_last_spreadsheet_id';

interface PendingConfirmAction {
  type: 'update' | 'delete';
  title: string;
  description: string;
  details: string[];
  confirmLabel: string;
  variant: 'primary' | 'danger';
  student: Student;
}

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Auth & Workspace State
  const [user, setUser] = useState<User | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [connection, setConnection] = useState<SheetConnection | null>(null);
  const [driveFiles, setDriveFiles] = useState<DriveSpreadsheetFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [busyMutation, setBusyMutation] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Student Data & UI State
  const [students, setStudents] = useState<Student[]>(SEED_STUDENTS);
  const [filters, setFilters] = useState<FilterOptions>(DEFAULT_FILTERS);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirmAction | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleApiError = useCallback((err: unknown, fallback: string) => {
    if (err instanceof WorkspaceApiError && err.status === 401) {
      clearCachedToken();
      setNeedsAuth(true);
    }
    const msg = err instanceof Error ? err.message : fallback;
    setWorkspaceError(msg);
  }, []);

  const loadDriveFiles = useCallback(
    async (token: string) => {
      setLoadingFiles(true);
      try {
        const files = await listAppSpreadsheets(token);
        setDriveFiles(files);
      } catch (err) {
        handleApiError(err, 'ไม่สามารถดึงรายการสเปรดชีตจาก Google Drive ได้');
      } finally {
        setLoadingFiles(false);
      }
    },
    [handleApiError]
  );

  const connectToSpreadsheet = useCallback(
    async (token: string, spreadsheetId: string, preferredTabTitle?: string) => {
      setLoadingSheet(true);
      setWorkspaceError(null);
      try {
        const meta = await getSpreadsheetMetadata(token, spreadsheetId);
        if (meta.sheets.length === 0) {
          throw new Error('ไม่พบแผ่นงาน (Tab) ภายในสเปรดชีตนี้');
        }
        const targetTab =
          (preferredTabTitle &&
            meta.sheets.find((t) => t.title === preferredTabTitle)) ||
          meta.sheets[0];

        const sheetStudents = await fetchStudentsFromSheet(
          token,
          spreadsheetId,
          targetTab.title
        );

        setConnection({
          spreadsheetId,
          spreadsheetTitle: meta.title,
          sheetTitle: targetTab.title,
          sheetId: targetTab.sheetId,
          availableTabs: meta.sheets,
          lastSyncedAt: new Date().toISOString(),
        });
        setStudents(sheetStudents);
        try {
          window.localStorage.setItem(STORAGE_SPREADSHEET_ID_KEY, spreadsheetId);
        } catch {
          // ignore storage errors
        }
        showToast(`เชื่อมต่อ "${meta.title}" (${targetTab.title}) สำเร็จ`);
        return true;
      } catch (err) {
        handleApiError(err, 'ไม่สามารถเชื่อมต่อ Google Sheet ได้');
        return false;
      } finally {
        setLoadingSheet(false);
      }
    },
    [handleApiError, showToast]
  );

  useEffect(() => {
    const unsubscribe = initAuth(
      (authedUser, token) => {
        setUser(authedUser);
        setNeedsAuth(false);
        loadDriveFiles(token);
      },
      () => {
        setNeedsAuth(true);
      }
    );
    return () => unsubscribe();
  }, [loadDriveFiles]);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    setWorkspaceError(null);
    try {
      const result = await googleSignIn();
      setUser(result.user);
      setNeedsAuth(false);
      await loadDriveFiles(result.accessToken);

      let savedId: string | null = null;
      try {
        savedId = window.localStorage.getItem(STORAGE_SPREADSHEET_ID_KEY);
      } catch {
        savedId = null;
      }

      if (savedId) {
        const connected = await connectToSpreadsheet(result.accessToken, savedId);
        if (!connected) {
          try {
            window.localStorage.removeItem(STORAGE_SPREADSHEET_ID_KEY);
          } catch {
            // ignore
          }
        }
      } else {
        showToast('เข้าสู่ระบบ Google สำเร็จ สามารถสร้างหรือเลือก Google Sheet ได้เลย');
      }
    } catch (err) {
      handleApiError(err, 'เข้าสู่ระบบ Google ไม่สำเร็จ');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setUser(null);
    setNeedsAuth(true);
    setConnection(null);
    setDriveFiles([]);
    setStudents(SEED_STUDENTS);
    try {
      window.localStorage.removeItem(STORAGE_SPREADSHEET_ID_KEY);
    } catch {
      // ignore
    }
    showToast('ออกจากระบบแล้ว กำลังแสดงข้อมูลตัวอย่าง');
  };

  const handleCreateSheet = async (title: string, includeSeed: boolean) => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setBusyMutation(true);
    setWorkspaceError(null);
    try {
      const initialRows = includeSeed ? SEED_STUDENTS : [];
      const createdConn = await createStudentSpreadsheet(token, title, initialRows);
      setConnection(createdConn);
      const loaded = await fetchStudentsFromSheet(
        token,
        createdConn.spreadsheetId,
        createdConn.sheetTitle
      );
      setStudents(loaded);
      try {
        window.localStorage.setItem(
          STORAGE_SPREADSHEET_ID_KEY,
          createdConn.spreadsheetId
        );
      } catch {
        // ignore
      }
      await loadDriveFiles(token);
      showToast(`สร้างไฟล์ "${createdConn.spreadsheetTitle}" บน Google Sheets แล้ว`);
    } catch (err) {
      handleApiError(err, 'สร้าง Google Sheet ไม่สำเร็จ');
    } finally {
      setBusyMutation(false);
    }
  };

  const handleConnectSpreadsheetId = async (spreadsheetId: string) => {
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    await connectToSpreadsheet(token, spreadsheetId);
  };

  const handleChangeTab = async (sheetTitle: string) => {
    if (!connection) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    await connectToSpreadsheet(token, connection.spreadsheetId, sheetTitle);
  };

  const handleSyncSheet = async () => {
    if (!connection) return;
    const token = getAccessToken();
    if (!token) {
      setNeedsAuth(true);
      return;
    }
    setLoadingSheet(true);
    setWorkspaceError(null);
    try {
      const refreshed = await fetchStudentsFromSheet(
        token,
        connection.spreadsheetId,
        connection.sheetTitle
      );
      setStudents(refreshed);
      setConnection((prev) =>
        prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null
      );
      showToast('อัปเดตข้อมูลล่าสุดจาก Google Sheet แล้ว');
    } catch (err) {
      handleApiError(err, 'ซิงค์ข้อมูลจาก Google Sheet ไม่สำเร็จ');
    } finally {
      setLoadingSheet(false);
    }
  };

  const handleDisconnectSheet = () => {
    setConnection(null);
    setStudents(SEED_STUDENTS);
    try {
      window.localStorage.removeItem(STORAGE_SPREADSHEET_ID_KEY);
    } catch {
      // ignore
    }
    showToast('สลับกลับมาแสดงข้อมูลตัวอย่างในเครื่อง');
  };

  // Analytics & Filtered list
  const summary = useMemo(() => computeDashboardSummary(students), [students]);
  const availableClassrooms = useMemo(() => {
    const source =
      filters.gradeLevel === 'ALL'
        ? students
        : students.filter((s) => s.gradeLevel === filters.gradeLevel);
    return Array.from(new Set(source.map((s) => s.classroom))).sort((a, b) =>
      a.localeCompare(b, 'th', { numeric: true })
    );
  }, [students, filters.gradeLevel]);

  const filteredStudents = useMemo(
    () => filterAndSortStudents(students, filters),
    [students, filters]
  );

  // Form Submission (Add vs Edit)
  const openAddModal = () => {
    setEditingStudent(null);
    setModalError(null);
    setFormModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setModalError(null);
    setFormModalOpen(true);
  };

  const handleStudentFormSubmit = async (formData: StudentFormInput) => {
    const preparedStudent: Student = {
      id: editingStudent?.id ?? `local-${Date.now()}`,
      rowIndex: editingStudent?.rowIndex,
      studentId: formData.studentId.trim(),
      fullName: formData.fullName.trim(),
      gradeLevel: formData.gradeLevel,
      classroom: formData.classroom.trim(),
      gender: formData.gender,
      gpa: Number(Number(formData.gpa).toFixed(2)),
      attendanceRate: Math.round(Number(formData.attendanceRate)),
      status: formData.status,
      guardianPhone: formData.guardianPhone.trim(),
      note: formData.note.trim(),
    };

    if (editingStudent) {
      // Explicit confirmation required before modifying existing record
      setFormModalOpen(false);
      setPendingConfirm({
        type: 'update',
        title: 'ยืนยันการบันทึกแก้ไขข้อมูลนักเรียน',
        description: connection
          ? `ระบบจะเขียนทับข้อมูลของ "${preparedStudent.fullName}" ลงใน Google Sheet (${connection.spreadsheetTitle} · แท็บ ${connection.sheetTitle})`
          : `ยืนยันการอัปเดตข้อมูลของ "${preparedStudent.fullName}" ในรายการปัจจุบัน`,
        details: [
          `รหัส: ${preparedStudent.studentId} · ชั้น ${preparedStudent.gradeLevel}/${preparedStudent.classroom}`,
          `เกรดเฉลี่ย: ${preparedStudent.gpa.toFixed(2)} · เข้าเรียน: ${preparedStudent.attendanceRate}% · สถานะ: ${preparedStudent.status}`,
        ],
        confirmLabel: 'ยืนยันบันทึกการแก้ไข',
        variant: 'primary',
        student: preparedStudent,
      });
      return;
    }

      // Adding a new student
    if (connection) {
      const token = getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        const msg = 'กรุณาเข้าสู่ระบบ Google อีกครั้งก่อนบันทึกข้อมูล';
        setModalError(msg);
        setWorkspaceError(msg);
        return;
      }
      setBusyMutation(true);
      setModalError(null);
      setWorkspaceError(null);
      try {
        await appendStudentToSheet(
          token,
          connection.spreadsheetId,
          connection.sheetTitle,
          preparedStudent
        );
        const refreshed = await fetchStudentsFromSheet(
          token,
          connection.spreadsheetId,
          connection.sheetTitle
        );
        setStudents(refreshed);
        setConnection((prev) =>
          prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null
        );
        setFormModalOpen(false);
        showToast(`เพิ่ม "${preparedStudent.fullName}" ลง Google Sheet เรียบร้อย`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'ไม่สามารถเพิ่มข้อมูลลง Google Sheet ได้';
        setModalError(msg);
        handleApiError(err, msg);
      } finally {
        setBusyMutation(false);
      }
    } else {
      setStudents((prev) => [...prev, preparedStudent]);
      setFormModalOpen(false);
      showToast(`เพิ่ม "${preparedStudent.fullName}" เรียบร้อยแล้ว`);
    }
  };

  const requestDeleteStudent = (student: Student) => {
    setModalError(null);
    setPendingConfirm({
      type: 'delete',
      title: 'ยืนยันการลบข้อมูลนักเรียน',
      description: connection
        ? `ต้องการลบ "${student.fullName}" (${student.studentId}) ออกจาก Google Sheet (${connection.spreadsheetTitle}) ใช่หรือไม่?`
        : `ต้องการลบ "${student.fullName}" (${student.studentId}) ออกจากรายการใช่หรือไม่?`,
      details: [
        `ชั้นเรียน: ${student.gradeLevel}/${student.classroom} · เกรดเฉลี่ย: ${student.gpa.toFixed(2)}`,
        'การลบข้อมูลแถวนี้ไม่สามารถย้อนกลับได้',
      ],
      confirmLabel: 'ยืนยันลบข้อมูล',
      variant: 'danger',
      student,
    });
  };

  const executeConfirmedAction = async () => {
    if (!pendingConfirm) return;
    const { type, student } = pendingConfirm;

    if (connection) {
      const token = getAccessToken();
      if (!token) {
        setNeedsAuth(true);
        setPendingConfirm(null);
        return;
      }
      if (!student.rowIndex) {
        setWorkspaceError('ไม่พบเลขแถวอ้างอิงใน Google Sheet กรุณากดซิงค์ข้อมูลก่อนดำเนินการ');
        setPendingConfirm(null);
        return;
      }

      setBusyMutation(true);
      setModalError(null);
      setWorkspaceError(null);
      try {
        if (type === 'update') {
          await updateStudentInSheet(
            token,
            connection.spreadsheetId,
            connection.sheetTitle,
            student.rowIndex,
            student
          );
          showToast(`อัปเดตข้อมูล "${student.fullName}" ใน Google Sheet แล้ว`);
        } else {
          await deleteStudentFromSheet(
            token,
            connection.spreadsheetId,
            connection.sheetId,
            student.rowIndex
          );
          showToast(`ลบข้อมูล "${student.fullName}" ออกจาก Google Sheet แล้ว`);
        }

        const refreshed = await fetchStudentsFromSheet(
          token,
          connection.spreadsheetId,
          connection.sheetTitle
        );
        setStudents(refreshed);
        setConnection((prev) =>
          prev ? { ...prev, lastSyncedAt: new Date().toISOString() } : null
        );
        setPendingConfirm(null);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'ดำเนินการบน Google Sheet ไม่สำเร็จ';
        setModalError(msg);
        handleApiError(err, msg);
      } finally {
        setBusyMutation(false);
      }
    } else {
      if (type === 'update') {
        setStudents((prev) =>
          prev.map((item) => (item.id === student.id ? student : item))
        );
        showToast(`บันทึกการแก้ไข "${student.fullName}" แล้ว`);
      } else {
        setStudents((prev) => prev.filter((item) => item.id !== student.id));
        showToast(`ลบข้อมูล "${student.fullName}" แล้ว`);
      }
      setPendingConfirm(null);
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'รหัสนักเรียน',
      'ชื่อ-นามสกุล',
      'ระดับชั้น',
      'ห้อง',
      'เพศ',
      'เกรดเฉลี่ย',
      'การเข้าเรียน (%)',
      'สถานะ',
      'เบอร์ผู้ปกครอง',
      'หมายเหตุ',
    ];
    const escapeCell = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };
    const rows = [
      headers.map(escapeCell).join(','),
      ...filteredStudents.map((s) =>
        [
          s.studentId,
          s.fullName,
          s.gradeLevel,
          s.classroom,
          s.gender,
          s.gpa.toFixed(2),
          s.attendanceRate,
          s.status,
          s.guardianPhone,
          s.note,
        ]
          .map(escapeCell)
          .join(',')
      ),
    ];
    const csvContent = `\uFEFF${rows.join('\n')}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `student-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ CSV เรียบร้อยแล้ว');
  };

  const handleSelectGradeFromDashboard = (grade: GradeLevel, classroom?: string) => {
    setFilters({
      ...DEFAULT_FILTERS,
      gradeLevel: grade,
      classroom: classroom ?? 'ALL',
    });
    setActiveView('students');
  };

  const handleOpenAttentionList = () => {
    setFilters({ ...DEFAULT_FILTERS, status: 'ATTENTION' });
    setActiveView('students');
  };

  const viewTitles: Record<AppView, string> = {
    dashboard: 'ภาพรวมแดชบอร์ด',
    students: 'รายชื่อนักเรียน',
    sheets: 'ตั้งค่า Google Sheet',
  };

  const navItems: Array<{
    id: AppView;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      id: 'dashboard',
      label: 'ภาพรวมแดชบอร์ด',
      icon: <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'students',
      label: 'รายชื่อนักเรียน',
      icon: <Users className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
    {
      id: 'sheets',
      label: 'ตั้งค่า Google Sheet',
      icon: <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />,
    },
  ];

  const renderSidebarContent = () => (
    <div className="flex h-full flex-col justify-between bg-white px-4 py-5">
      <div>
        <div className="px-2 pb-6">
          <span className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">
            ScholarSheet
          </span>
        </div>

        <nav aria-label="เมนูหลัก" className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-blue-50 text-blue-800'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="border-t border-slate-100 pt-4">
        <div className="px-2">
          <div className="text-xs font-medium text-slate-500">แหล่งจัดเก็บข้อมูล</div>
          {connection ? (
            <div className="mt-1.5 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{connection.spreadsheetTitle}</span>
              </div>
              <div className="text-xs text-slate-500 truncate">
                แท็บ: {connection.sheetTitle}
              </div>
            </div>
          ) : (
            <div className="mt-1.5 space-y-2.5">
              <p className="text-xs text-slate-600">
                ข้อมูลตัวอย่างในเครื่อง ({students.length} คน)
              </p>
              <button
                type="button"
                onClick={() => {
                  setActiveView('sheets');
                  setMobileMenuOpen(false);
                }}
                className="w-full whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                เชื่อมต่อ Google Sheet
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-slate-200 bg-white lg:block">
        <div className="sticky top-0 h-screen">{renderSidebarContent()}</div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="เมนูนำทาง">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 w-64 border-r border-slate-200 bg-white shadow-xl">
            <div className="flex justify-end p-2">
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="ปิดเมนู"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-3rem)]">{renderSidebarContent()}</div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar Contract: Breadcrumb on left + Primary Action(s) on right */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="เปิดเมนูนำทาง"
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">หน้าหลัก</span>
              <span className="hidden text-slate-300 sm:inline" aria-hidden="true">
                /
              </span>
              <h1 className="truncate font-semibold text-slate-900">
                {viewTitles[activeView]}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {needsAuth && activeView !== 'sheets' ? (
              <div className="hidden sm:block">
                <GoogleSignInButton onClick={handleLogin} loading={isLoggingIn} />
              </div>
            ) : connection ? (
              <button
                type="button"
                onClick={handleSyncSheet}
                disabled={loadingSheet}
                className="hidden items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loadingSheet ? 'animate-spin' : ''}`}
                />
                <span>ซิงค์ข้อมูล</span>
              </button>
            ) : null}

            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 rounded-lg bg-blue-700 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800"
            >
              <Plus className="h-4 w-4" />
              <span>เพิ่มนักเรียน</span>
            </button>
          </div>
        </header>

        {/* Main Viewport */}
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
          {/* Connection Banner when in Local Sample Mode */}
          {!connection && activeView !== 'sheets' && (
            <div className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-sm text-slate-600">
                <span className="font-medium text-slate-900">
                  โหมดข้อมูลตัวอย่าง ({students.length} คน)
                </span>
                <span className="mx-2 text-slate-300" aria-hidden="true">
                  ·
                </span>
                <span>
                  ทดลองเพิ่ม แก้ไข และดูสรุปผลได้ทันที หรือเชื่อมต่อบัญชี Google เพื่อบันทึกลง Google Sheet จริง
                </span>
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setActiveView('sheets')}
                  className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                >
                  ตั้งค่า Google Sheet
                </button>
              </div>
            </div>
          )}

          {workspaceError && activeView !== 'sheets' && (
            <div
              role="alert"
              className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
            >
              <span>{workspaceError}</span>
              <button
                type="button"
                onClick={() => setWorkspaceError(null)}
                aria-label="ปิดข้อความแจ้งเตือน"
                className="text-red-600 hover:text-red-900"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {activeView === 'dashboard' && (
            <DashboardSummaryView
              summary={summary}
              loading={loadingSheet}
              onSelectGrade={handleSelectGradeFromDashboard}
              onOpenAttentionList={handleOpenAttentionList}
              onEditStudent={openEditModal}
              onAddStudent={openAddModal}
            />
          )}

          {activeView === 'students' && (
            <StudentDirectoryView
              students={filteredStudents}
              availableClassrooms={availableClassrooms}
              totalCount={students.length}
              filters={filters}
              isSheetConnected={Boolean(connection)}
              syncing={loadingSheet}
              onFiltersChange={setFilters}
              onResetFilters={() => setFilters(DEFAULT_FILTERS)}
              onAddStudent={openAddModal}
              onEditStudent={openEditModal}
              onDeleteStudent={requestDeleteStudent}
              onSyncSheet={handleSyncSheet}
              onExportCsv={handleExportCsv}
            />
          )}

          {activeView === 'sheets' && (
            <GoogleSheetsPanel
              user={user}
              needsAuth={needsAuth}
              isLoggingIn={isLoggingIn}
              connection={connection}
              driveFiles={driveFiles}
              loadingFiles={loadingFiles}
              busyAction={busyMutation || loadingSheet}
              errorMessage={workspaceError}
              onLogin={handleLogin}
              onLogout={handleLogout}
              onCreateSheet={handleCreateSheet}
              onConnectSpreadsheetId={handleConnectSpreadsheetId}
              onChangeTab={handleChangeTab}
              onRefreshData={handleSyncSheet}
              onDisconnectSheet={handleDisconnectSheet}
              onRefreshDriveFiles={() => {
                const token = getAccessToken();
                if (token) loadDriveFiles(token);
              }}
            />
          )}
        </main>
      </div>

      {/* Add / Edit Student Modal */}
      <StudentFormModal
        open={formModalOpen}
        editingStudent={editingStudent}
        existingStudents={students}
        submitting={busyMutation}
        errorMessage={modalError}
        onSubmit={handleStudentFormSubmit}
        onClose={() => {
          setFormModalOpen(false);
          setModalError(null);
        }}
      />

      {/* Mandatory Confirmation Dialog for Updates & Deletions */}
      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm?.title ?? ''}
        description={pendingConfirm?.description ?? ''}
        details={pendingConfirm?.details}
        confirmLabel={pendingConfirm?.confirmLabel ?? 'ยืนยัน'}
        variant={pendingConfirm?.variant ?? 'primary'}
        loading={busyMutation}
        errorMessage={modalError}
        onConfirm={executeConfirmedAction}
        onCancel={() => {
          if (!busyMutation) {
            setPendingConfirm(null);
            setModalError(null);
          }
        }}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" aria-hidden="true" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
