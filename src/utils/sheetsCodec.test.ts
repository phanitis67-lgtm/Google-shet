import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractSpreadsheetId,
  sheetRowsToStudents,
  studentToSheetRow,
  STUDENT_SHEET_HEADERS,
} from './sheetsCodec';
import { Student } from '../types/student';

test('extractSpreadsheetId parses full Google Sheets URLs and raw IDs', () => {
  assert.equal(
    extractSpreadsheetId('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(
    extractSpreadsheetId('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'),
    '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms'
  );
  assert.equal(extractSpreadsheetId('short'), null);
  assert.equal(extractSpreadsheetId(''), null);
});

test('studentToSheetRow and sheetRowsToStudents round-trip accurately with rowIndex', () => {
  const student: Student = {
    id: 'test-1',
    studentId: '67101',
    fullName: 'สมชาย ใจดี',
    gradeLevel: 'ม.5',
    classroom: '2',
    gender: 'ชาย',
    gpa: 3.45,
    attendanceRate: 92,
    status: 'ปกติ',
    guardianPhone: '089-999-8888',
    note: 'ทดลอง',
  };

  const row = studentToSheetRow(student);
  const parsed = sheetRowsToStudents([STUDENT_SHEET_HEADERS, row]);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].rowIndex, 2);
  assert.equal(parsed[0].studentId, '67101');
  assert.equal(parsed[0].fullName, 'สมชาย ใจดี');
  assert.equal(parsed[0].gradeLevel, 'ม.5');
  assert.equal(parsed[0].classroom, '2');
  assert.equal(parsed[0].gpa, 3.45);
  assert.equal(parsed[0].attendanceRate, 92);
  assert.equal(parsed[0].status, 'ปกติ');
  assert.equal(parsed[0].guardianPhone, '089-999-8888');
  assert.equal(parsed[0].note, 'ทดลอง');
});

test('sheetRowsToStudents skips blank rows and clamps invalid numbers safely', () => {
  const rows = [
    STUDENT_SHEET_HEADERS,
    ['', '', '', ''],
    ['67200', 'สายฝน รักเรียน', 'ม.6', '1', 'หญิง', '5.5', '110%', 'ปกติ', '081-000-0000', ''],
  ];

  const parsed = sheetRowsToStudents(rows);
  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].rowIndex, 3);
  assert.equal(parsed[0].gpa, 4.0);
  assert.equal(parsed[0].attendanceRate, 100);
});
