import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeDashboardSummary,
  filterAndSortStudents,
  validateStudentInput,
} from './studentAnalytics';
import { Student, StudentFormInput } from '../types/student';

const SAMPLE: Student[] = [
  {
    id: '1',
    studentId: '67001',
    fullName: 'กิตติพงศ์ ใจดี',
    gradeLevel: 'ม.4',
    classroom: '1',
    gender: 'ชาย',
    gpa: 3.8,
    attendanceRate: 98,
    status: 'ปกติ',
    guardianPhone: '081-111-1111',
    note: '',
  },
  {
    id: '2',
    studentId: '67002',
    fullName: 'ธนากร สายชล',
    gradeLevel: 'ม.4',
    classroom: '2',
    gender: 'ชาย',
    gpa: 1.8,
    attendanceRate: 72,
    status: 'เฝ้าระวัง',
    guardianPhone: '082-222-2222',
    note: 'ขาดเรียนบ่อย',
  },
  {
    id: '3',
    studentId: '67003',
    fullName: 'ปวีณา แก้วใส',
    gradeLevel: 'ม.5',
    classroom: '1',
    gender: 'หญิง',
    gpa: 3.2,
    attendanceRate: 90,
    status: 'ปกติ',
    guardianPhone: '083-333-3333',
    note: '',
  },
];

test('computeDashboardSummary computes totals, averages, buckets, and attention list', () => {
  const summary = computeDashboardSummary(SAMPLE);
  assert.equal(summary.totalStudents, 3);
  assert.equal(summary.maleCount, 2);
  assert.equal(summary.femaleCount, 1);
  assert.equal(summary.honorCount, 1);
  assert.equal(summary.lowAttendanceCount, 1);
  assert.equal(summary.avgGpa, 2.93);
  assert.equal(summary.avgAttendance, 87);
  assert.equal(summary.attentionStudents.length, 1);
  assert.equal(summary.attentionStudents[0].student.studentId, '67002');
  assert.ok(summary.attentionStudents[0].reasons.includes('สถานะเฝ้าระวัง'));

  const m4 = summary.gradeBreakdown.find((g) => g.gradeLevel === 'ม.4');
  assert.equal(m4?.count, 2);
  assert.equal(m4?.avgGpa, 2.8);
});

test('computeDashboardSummary handles empty student list cleanly', () => {
  const summary = computeDashboardSummary([]);
  assert.equal(summary.totalStudents, 0);
  assert.equal(summary.avgGpa, 0);
  assert.equal(summary.gpaBuckets.length, 4);
  assert.equal(summary.attentionStudents.length, 0);
});

test('filterAndSortStudents filters by search, grade, status and sorts properly', () => {
  const filtered = filterAndSortStudents(SAMPLE, {
    search: 'ปวีณา',
    gradeLevel: 'ALL',
    classroom: 'ALL',
    status: 'ALL',
    sortField: 'studentId',
    sortDirection: 'asc',
  });
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].studentId, '67003');

  const sortedByGpaDesc = filterAndSortStudents(SAMPLE, {
    search: '',
    gradeLevel: 'ALL',
    classroom: 'ALL',
    status: 'ALL',
    sortField: 'gpa',
    sortDirection: 'desc',
  });
  assert.deepEqual(
    sortedByGpaDesc.map((s) => s.studentId),
    ['67001', '67003', '67002']
  );

  const attentionList = filterAndSortStudents(
    [
      ...SAMPLE,
      {
        id: '4',
        studentId: '67004',
        fullName: 'มานะ ทดสอบ',
        gradeLevel: 'ม.4',
        classroom: '1',
        gender: 'ชาย',
        gpa: 1.75,
        attendanceRate: 95,
        status: 'ปกติ',
        guardianPhone: '084-444-4444',
        note: '',
      },
    ],
    {
      search: '',
      gradeLevel: 'ALL',
      classroom: 'ALL',
      status: 'ATTENTION',
      sortField: 'studentId',
      sortDirection: 'asc',
    }
  );
  assert.deepEqual(
    attentionList.map((s) => s.studentId),
    ['67002', '67004']
  );
});

test('validateStudentInput catches missing fields, duplicate IDs, and out-of-range metrics', () => {
  const badInput: StudentFormInput = {
    studentId: '67001',
    fullName: '',
    gradeLevel: 'ม.4',
    classroom: '',
    gender: 'ชาย',
    gpa: '4.5',
    attendanceRate: '120',
    status: 'ปกติ',
    guardianPhone: '',
    note: '',
  };

  const errors = validateStudentInput(badInput, SAMPLE);
  assert.ok(errors.studentId);
  assert.ok(errors.fullName);
  assert.ok(errors.classroom);
  assert.ok(errors.gpa);
  assert.ok(errors.attendanceRate);
  assert.ok(errors.guardianPhone);

  // Editing the same student should allow keeping its own studentId
  const validEdit: StudentFormInput = {
    studentId: '67001',
    fullName: 'กิตติพงศ์ ใจดี',
    gradeLevel: 'ม.4',
    classroom: '1',
    gender: 'ชาย',
    gpa: '3.85',
    attendanceRate: '99',
    status: 'ปกติ',
    guardianPhone: '081-111-1111',
    note: '',
  };
  const editErrors = validateStudentInput(validEdit, SAMPLE, '1');
  assert.deepEqual(editErrors, {});
});
