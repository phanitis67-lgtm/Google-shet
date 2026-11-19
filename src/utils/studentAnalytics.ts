import {
  AttentionStudent,
  ClassroomSummary,
  DashboardSummary,
  FilterOptions,
  GpaBucket,
  GradeBreakdown,
  GradeLevel,
  Student,
  StudentFormInput,
} from '../types/student';

export const GRADE_LEVEL_ORDER: GradeLevel[] = ['ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6'];

export function computeDashboardSummary(students: Student[]): DashboardSummary {
  const totalStudents = students.length;

  if (totalStudents === 0) {
    return {
      totalStudents: 0,
      activeStudents: 0,
      maleCount: 0,
      femaleCount: 0,
      otherCount: 0,
      avgGpa: 0,
      avgAttendance: 0,
      honorCount: 0,
      lowAttendanceCount: 0,
      gradeBreakdown: GRADE_LEVEL_ORDER.map((gradeLevel) => ({
        gradeLevel,
        count: 0,
        avgGpa: 0,
        avgAttendance: 0,
      })),
      gpaBuckets: [
        { key: 'excellent', label: 'ดีเยี่ยม', rangeLabel: '3.50 – 4.00', count: 0, percentage: 0 },
        { key: 'good', label: 'ดี', rangeLabel: '3.00 – 3.49', count: 0, percentage: 0 },
        { key: 'fair', label: 'ปานกลาง', rangeLabel: '2.00 – 2.99', count: 0, percentage: 0 },
        { key: 'needs_support', label: 'ต้องพัฒนา', rangeLabel: 'ต่ำกว่า 2.00', count: 0, percentage: 0 },
      ],
      classroomSummaries: [],
      attentionStudents: [],
    };
  }

  let activeStudents = 0;
  let maleCount = 0;
  let femaleCount = 0;
  let otherCount = 0;
  let gpaSum = 0;
  let attendanceSum = 0;
  let honorCount = 0;
  let lowAttendanceCount = 0;

  let excellent = 0;
  let good = 0;
  let fair = 0;
  let needsSupport = 0;

  const gradeMap = new Map<GradeLevel, { count: number; gpaSum: number; attSum: number }>();
  for (const g of GRADE_LEVEL_ORDER) {
    gradeMap.set(g, { count: 0, gpaSum: 0, attSum: 0 });
  }

  const classMap = new Map<
    string,
    { gradeLevel: GradeLevel; classroom: string; count: number; gpaSum: number; attSum: number; attentionCount: number }
  >();

  const attentionStudents: AttentionStudent[] = [];

  for (const s of students) {
    if (s.status !== 'ลาออก/ย้าย') activeStudents += 1;
    if (s.gender === 'ชาย') maleCount += 1;
    else if (s.gender === 'หญิง') femaleCount += 1;
    else otherCount += 1;

    gpaSum += s.gpa;
    attendanceSum += s.attendanceRate;

    if (s.gpa >= 3.5) honorCount += 1;
    if (s.attendanceRate < 80) lowAttendanceCount += 1;

    if (s.gpa >= 3.5) excellent += 1;
    else if (s.gpa >= 3.0) good += 1;
    else if (s.gpa >= 2.0) fair += 1;
    else needsSupport += 1;

    const gEntry = gradeMap.get(s.gradeLevel);
    if (gEntry) {
      gEntry.count += 1;
      gEntry.gpaSum += s.gpa;
      gEntry.attSum += s.attendanceRate;
    }

    const reasons: string[] = [];
    if (s.status === 'เฝ้าระวัง') reasons.push('สถานะเฝ้าระวัง');
    if (s.gpa < 2.0) reasons.push(`เกรดเฉลี่ย ${s.gpa.toFixed(2)}`);
    if (s.attendanceRate < 80) reasons.push(`เข้าเรียน ${s.attendanceRate}%`);

    if (reasons.length > 0 && s.status !== 'ลาออก/ย้าย') {
      attentionStudents.push({ student: s, reasons });
    }

    const classKey = `${s.gradeLevel}/${s.classroom}`;
    const existingClass = classMap.get(classKey);
    const needsAtt = reasons.length > 0 && s.status !== 'ลาออก/ย้าย' ? 1 : 0;
    if (existingClass) {
      existingClass.count += 1;
      existingClass.gpaSum += s.gpa;
      existingClass.attSum += s.attendanceRate;
      existingClass.attentionCount += needsAtt;
    } else {
      classMap.set(classKey, {
        gradeLevel: s.gradeLevel,
        classroom: s.classroom,
        count: 1,
        gpaSum: s.gpa,
        attSum: s.attendanceRate,
        attentionCount: needsAtt,
      });
    }
  }

  const gradeBreakdown: GradeBreakdown[] = GRADE_LEVEL_ORDER.map((gradeLevel) => {
    const entry = gradeMap.get(gradeLevel)!;
    return {
      gradeLevel,
      count: entry.count,
      avgGpa: entry.count > 0 ? Number((entry.gpaSum / entry.count).toFixed(2)) : 0,
      avgAttendance: entry.count > 0 ? Math.round(entry.attSum / entry.count) : 0,
    };
  });

  const gpaBuckets: GpaBucket[] = [
    {
      key: 'excellent',
      label: 'ดีเยี่ยม',
      rangeLabel: '3.50 – 4.00',
      count: excellent,
      percentage: Math.round((excellent / totalStudents) * 100),
    },
    {
      key: 'good',
      label: 'ดี',
      rangeLabel: '3.00 – 3.49',
      count: good,
      percentage: Math.round((good / totalStudents) * 100),
    },
    {
      key: 'fair',
      label: 'ปานกลาง',
      rangeLabel: '2.00 – 2.99',
      count: fair,
      percentage: Math.round((fair / totalStudents) * 100),
    },
    {
      key: 'needs_support',
      label: 'ต้องพัฒนา',
      rangeLabel: 'ต่ำกว่า 2.00',
      count: needsSupport,
      percentage: Math.round((needsSupport / totalStudents) * 100),
    },
  ];

  const classroomSummaries: ClassroomSummary[] = Array.from(classMap.entries())
    .map(([key, c]) => ({
      key,
      gradeLevel: c.gradeLevel,
      classroom: c.classroom,
      count: c.count,
      avgGpa: Number((c.gpaSum / c.count).toFixed(2)),
      avgAttendance: Math.round(c.attSum / c.count),
      attentionCount: c.attentionCount,
    }))
    .sort((a, b) => {
      const gradeDiff = GRADE_LEVEL_ORDER.indexOf(a.gradeLevel) - GRADE_LEVEL_ORDER.indexOf(b.gradeLevel);
      if (gradeDiff !== 0) return gradeDiff;
      return a.classroom.localeCompare(b.classroom, 'th', { numeric: true });
    });

  attentionStudents.sort((a, b) => a.student.gpa - b.student.gpa);

  return {
    totalStudents,
    activeStudents,
    maleCount,
    femaleCount,
    otherCount,
    avgGpa: Number((gpaSum / totalStudents).toFixed(2)),
    avgAttendance: Math.round(attendanceSum / totalStudents),
    honorCount,
    lowAttendanceCount,
    gradeBreakdown,
    gpaBuckets,
    classroomSummaries,
    attentionStudents,
  };
}

export function isAttentionStudent(s: Student): boolean {
  if (s.status === 'ลาออก/ย้าย') return false;
  return s.status === 'เฝ้าระวัง' || s.gpa < 2.0 || s.attendanceRate < 80;
}

export function filterAndSortStudents(students: Student[], filters: FilterOptions): Student[] {
  const query = filters.search.trim().toLowerCase();

  const filtered = students.filter((s) => {
    if (filters.gradeLevel !== 'ALL' && s.gradeLevel !== filters.gradeLevel) return false;
    if (filters.classroom !== 'ALL' && s.classroom !== filters.classroom) return false;
    if (filters.status === 'ATTENTION') {
      if (!isAttentionStudent(s)) return false;
    } else if (filters.status !== 'ALL' && s.status !== filters.status) {
      return false;
    }
    if (query) {
      const haystack = `${s.studentId} ${s.fullName} ${s.gradeLevel}/${s.classroom} ${s.guardianPhone} ${s.note}`.toLowerCase();
      if (!haystack.includes(query)) return false;
    }
    return true;
  });

  const dir = filters.sortDirection === 'asc' ? 1 : -1;

  return [...filtered].sort((a, b) => {
    switch (filters.sortField) {
      case 'studentId':
        return a.studentId.localeCompare(b.studentId, 'th', { numeric: true }) * dir;
      case 'fullName':
        return a.fullName.localeCompare(b.fullName, 'th') * dir;
      case 'gpa':
        return (a.gpa - b.gpa) * dir;
      case 'attendanceRate':
        return (a.attendanceRate - b.attendanceRate) * dir;
      case 'gradeLevel': {
        const gradeDiff = GRADE_LEVEL_ORDER.indexOf(a.gradeLevel) - GRADE_LEVEL_ORDER.indexOf(b.gradeLevel);
        if (gradeDiff !== 0) return gradeDiff * dir;
        return a.classroom.localeCompare(b.classroom, 'th', { numeric: true }) * dir;
      }
      default:
        return 0;
    }
  });
}

export function validateStudentInput(
  input: StudentFormInput,
  existingStudents: Student[],
  editingId?: string
): Record<string, string> {
  const errors: Record<string, string> = {};

  const studentId = input.studentId.trim();
  const fullName = input.fullName.trim();
  const classroom = input.classroom.trim();
  const guardianPhone = input.guardianPhone.trim();

  if (!studentId) {
    errors.studentId = 'กรุณากรอกรหัสนักเรียน';
  } else {
    const duplicate = existingStudents.find(
      (s) => s.studentId.trim().toLowerCase() === studentId.toLowerCase() && s.id !== editingId
    );
    if (duplicate) {
      errors.studentId = `รหัสนักเรียน "${studentId}" มีอยู่ในระบบแล้ว`;
    }
  }

  if (!fullName) {
    errors.fullName = 'กรุณากรอกชื่อ-นามสกุล';
  }

  if (!classroom) {
    errors.classroom = 'กรุณาระบุเลขห้องเรียน';
  }

  const gpaNum = Number(input.gpa);
  if (input.gpa.trim() === '' || Number.isNaN(gpaNum)) {
    errors.gpa = 'กรุณากรอกเกรดเฉลี่ยเป็นตัวเลข';
  } else if (gpaNum < 0 || gpaNum > 4) {
    errors.gpa = 'เกรดเฉลี่ยต้องอยู่ระหว่าง 0.00 ถึง 4.00';
  }

  const attNum = Number(input.attendanceRate);
  if (input.attendanceRate.trim() === '' || Number.isNaN(attNum)) {
    errors.attendanceRate = 'กรุณากรอกเปอร์เซ็นต์การเข้าเรียน';
  } else if (attNum < 0 || attNum > 100) {
    errors.attendanceRate = 'อัตราการเข้าเรียนต้องอยู่ระหว่าง 0 ถึง 100%';
  }

  if (!guardianPhone) {
    errors.guardianPhone = 'กรุณากรอกเบอร์ติดต่อผู้ปกครอง';
  }

  return errors;
}
