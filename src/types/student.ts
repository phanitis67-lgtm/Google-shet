export type StudentGender = 'ชาย' | 'หญิง' | 'อื่นๆ';
export type StudentStatus = 'ปกติ' | 'เฝ้าระวัง' | 'ลาออก/ย้าย';
export type GradeLevel = 'ม.1' | 'ม.2' | 'ม.3' | 'ม.4' | 'ม.5' | 'ม.6';

export interface Student {
  id: string; // Internal unique ID or row key
  rowIndex?: number; // 1-based row number in Google Sheets (row 1 is header, data starts at row 2)
  studentId: string;
  fullName: string;
  gradeLevel: GradeLevel;
  classroom: string;
  gender: StudentGender;
  gpa: number;
  attendanceRate: number;
  status: StudentStatus;
  guardianPhone: string;
  note: string;
}

export interface StudentFormInput {
  studentId: string;
  fullName: string;
  gradeLevel: GradeLevel;
  classroom: string;
  gender: StudentGender;
  gpa: string;
  attendanceRate: string;
  status: StudentStatus;
  guardianPhone: string;
  note: string;
}

export interface GradeBreakdown {
  gradeLevel: GradeLevel;
  count: number;
  avgGpa: number;
  avgAttendance: number;
}

export interface GpaBucket {
  key: 'excellent' | 'good' | 'fair' | 'needs_support';
  label: string;
  rangeLabel: string;
  count: number;
  percentage: number;
}

export interface ClassroomSummary {
  key: string; // e.g. "ม.4/1"
  gradeLevel: GradeLevel;
  classroom: string;
  count: number;
  avgGpa: number;
  avgAttendance: number;
  attentionCount: number;
}

export interface AttentionStudent {
  student: Student;
  reasons: string[];
}

export interface DashboardSummary {
  totalStudents: number;
  activeStudents: number;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  avgGpa: number;
  avgAttendance: number;
  honorCount: number; // GPA >= 3.50
  lowAttendanceCount: number; // < 80%
  gradeBreakdown: GradeBreakdown[];
  gpaBuckets: GpaBucket[];
  classroomSummaries: ClassroomSummary[];
  attentionStudents: AttentionStudent[];
}

export type SortField = 'studentId' | 'fullName' | 'gpa' | 'attendanceRate' | 'gradeLevel';
export type SortDirection = 'asc' | 'desc';

export interface FilterOptions {
  search: string;
  gradeLevel: GradeLevel | 'ALL';
  classroom: string | 'ALL';
  status: StudentStatus | 'ALL' | 'ATTENTION';
  sortField: SortField;
  sortDirection: SortDirection;
}

export interface SheetTabInfo {
  sheetId: number;
  title: string;
  index: number;
}

export interface SheetConnection {
  spreadsheetId: string;
  spreadsheetTitle: string;
  sheetTitle: string;
  sheetId: number;
  availableTabs: SheetTabInfo[];
  lastSyncedAt: string | null;
}

export type AppView = 'dashboard' | 'students' | 'sheets';
