import { GradeLevel, Student, StudentGender, StudentStatus } from '../types/student';

export const STUDENT_SHEET_HEADERS = [
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

const VALID_GRADES = new Set<GradeLevel>(['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']);
const VALID_GENDERS = new Set<StudentGender>(['ชาย', 'หญิง', 'อื่นๆ']);
const VALID_STATUSES = new Set<StudentStatus>(['ปกติ', 'เฝ้าระวัง', 'ลาออก/ย้าย']);

export function extractSpreadsheetId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Match full Google Sheets URL: https://docs.google.com/spreadsheets/d/<ID>/...
  const urlMatch = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,})/);
  if (urlMatch && urlMatch[1]) {
    return urlMatch[1];
  }

  // Match raw spreadsheet ID (alphanumeric, dashes, underscores, typically 25-60 chars)
  if (/^[a-zA-Z0-9-_]{15,}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

export function studentToSheetRow(student: Student): (string | number)[] {
  return [
    student.studentId.trim(),
    student.fullName.trim(),
    student.gradeLevel,
    student.classroom.trim(),
    student.gender,
    Number(student.gpa.toFixed(2)),
    Math.round(student.attendanceRate),
    student.status,
    student.guardianPhone.trim(),
    student.note.trim(),
  ];
}

type SheetCell = string | number | undefined | null;

function cellStr(val: SheetCell): string {
  return val === undefined || val === null ? '' : String(val).trim();
}

function clampNumber(val: SheetCell, min: number, max: number, fallback: number): number {
  const str = cellStr(val);
  if (!str) return fallback;
  const cleaned = str.replace('%', '').trim();
  const parsed = Number(cleaned);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function isHeaderRow(row: SheetCell[]): boolean {
  const first = cellStr(row[0]).toLowerCase();
  const second = cellStr(row[1]).toLowerCase();
  return (
    first.includes('รหัส') ||
    first === 'id' ||
    first === 'studentid' ||
    first === 'student_id' ||
    second.includes('ชื่อ')
  );
}

export function sheetRowsToStudents(rows: SheetCell[][]): Student[] {
  if (!rows || rows.length === 0) return [];

  const startIndex = isHeaderRow(rows[0]) ? 1 : 0;
  const students: Student[] = [];

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every((cell) => cellStr(cell) === '')) continue;

    const studentId = cellStr(row[0]);
    const fullName = cellStr(row[1]);
    if (!studentId && !fullName) continue;

    const rawGrade = cellStr(row[2]) as GradeLevel;
    const gradeLevel: GradeLevel = VALID_GRADES.has(rawGrade) ? rawGrade : 'ม.4';

    const classroom = cellStr(row[3]) || '1';

    const rawGender = cellStr(row[4]) as StudentGender;
    const gender: StudentGender = VALID_GENDERS.has(rawGender) ? rawGender : 'ชาย';

    const gpa = Number(clampNumber(row[5], 0, 4, 0).toFixed(2));
    const attendanceRate = Math.round(clampNumber(row[6], 0, 100, 100));

    const rawStatus = cellStr(row[7]) as StudentStatus;
    const status: StudentStatus = VALID_STATUSES.has(rawStatus) ? rawStatus : 'ปกติ';

    const guardianPhone = cellStr(row[8]);
    const note = cellStr(row[9]);

    // Google Sheets rows are 1-indexed
    const rowIndex = i + 1;

    students.push({
      id: `sheet-row-${rowIndex}-${studentId || i}`,
      rowIndex,
      studentId: studentId || `ROW-${rowIndex}`,
      fullName: fullName || 'ไม่ระบุชื่อ',
      gradeLevel,
      classroom,
      gender,
      gpa,
      attendanceRate,
      status,
      guardianPhone,
      note,
    });
  }

  return students;
}
