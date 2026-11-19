import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  GradeLevel,
  Student,
  StudentFormInput,
  StudentGender,
  StudentStatus,
} from '../types/student';
import { GRADE_LEVEL_ORDER, validateStudentInput } from '../utils/studentAnalytics';

interface StudentFormModalProps {
  open: boolean;
  editingStudent: Student | null;
  existingStudents: Student[];
  submitting?: boolean;
  errorMessage?: string | null;
  onSubmit: (formData: StudentFormInput) => void;
  onClose: () => void;
}

const EMPTY_FORM: StudentFormInput = {
  studentId: '',
  fullName: '',
  gradeLevel: 'ม.4',
  classroom: '1',
  gender: 'ชาย',
  gpa: '',
  attendanceRate: '',
  status: 'ปกติ',
  guardianPhone: '',
  note: '',
};

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  open,
  editingStudent,
  existingStudents,
  submitting = false,
  errorMessage = null,
  onSubmit,
  onClose,
}) => {
  const [form, setForm] = useState<StudentFormInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (editingStudent) {
      setForm({
        studentId: editingStudent.studentId,
        fullName: editingStudent.fullName,
        gradeLevel: editingStudent.gradeLevel,
        classroom: editingStudent.classroom,
        gender: editingStudent.gender,
        gpa: editingStudent.gpa.toFixed(2),
        attendanceRate: String(editingStudent.attendanceRate),
        status: editingStudent.status,
        guardianPhone: editingStudent.guardianPhone,
        note: editingStudent.note,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, editingStudent]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleChange = <K extends keyof StudentFormInput>(
    field: K,
    value: StudentFormInput[K]
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateStudentInput(
      form,
      existingStudents,
      editingStudent?.id
    );
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    onSubmit(form);
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/45 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-form-title"
    >
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 id="student-form-title" className="text-lg font-semibold text-slate-900">
              {editingStudent ? 'แก้ไขข้อมูลนักเรียน' : 'เพิ่มข้อมูลนักเรียนใหม่'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              กรอกรายละเอียดให้ครบถ้วน ระบบจะตรวจสอบความถูกต้องก่อนบันทึก
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="ปิดแบบฟอร์มนักเรียน"
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="mt-5 space-y-4">
          {errorMessage && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800"
            >
              {errorMessage}
            </div>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="field-studentId"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                รหัสนักเรียน <span className="text-red-600">*</span>
              </label>
              <input
                id="field-studentId"
                type="text"
                value={form.studentId}
                onChange={(e) => handleChange('studentId', e.target.value)}
                placeholder="เช่น 67013"
                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.studentId
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.studentId && (
                <p className="mt-1 text-xs text-red-600">{errors.studentId}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-fullName"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                ชื่อ-นามสกุล <span className="text-red-600">*</span>
              </label>
              <input
                id="field-fullName"
                type="text"
                value={form.fullName}
                onChange={(e) => handleChange('fullName', e.target.value)}
                placeholder="เช่น ณัฐชา ใจดี"
                className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.fullName
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="field-gradeLevel"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                ระดับชั้น
              </label>
              <select
                id="field-gradeLevel"
                value={form.gradeLevel}
                onChange={(e) => handleChange('gradeLevel', e.target.value as GradeLevel)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                {GRADE_LEVEL_ORDER.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="field-classroom"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                ห้องเรียน <span className="text-red-600">*</span>
              </label>
              <input
                id="field-classroom"
                type="text"
                value={form.classroom}
                onChange={(e) => handleChange('classroom', e.target.value)}
                placeholder="เช่น 1"
                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.classroom
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.classroom && (
                <p className="mt-1 text-xs text-red-600">{errors.classroom}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-gender"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                เพศ
              </label>
              <select
                id="field-gender"
                value={form.gender}
                onChange={(e) => handleChange('gender', e.target.value as StudentGender)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="ชาย">ชาย</option>
                <option value="หญิง">หญิง</option>
                <option value="อื่นๆ">อื่นๆ</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="field-gpa"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                เกรดเฉลี่ย (0.00–4.00) <span className="text-red-600">*</span>
              </label>
              <input
                id="field-gpa"
                type="number"
                step="0.01"
                min="0"
                max="4"
                value={form.gpa}
                onChange={(e) => handleChange('gpa', e.target.value)}
                placeholder="เช่น 3.50"
                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 ${
                  errors.gpa
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.gpa && (
                <p className="mt-1 text-xs text-red-600">{errors.gpa}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-attendanceRate"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                การเข้าเรียน (%) <span className="text-red-600">*</span>
              </label>
              <input
                id="field-attendanceRate"
                type="number"
                step="1"
                min="0"
                max="100"
                value={form.attendanceRate}
                onChange={(e) => handleChange('attendanceRate', e.target.value)}
                placeholder="เช่น 95"
                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 tabular-nums focus:outline-none focus:ring-2 ${
                  errors.attendanceRate
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.attendanceRate && (
                <p className="mt-1 text-xs text-red-600">{errors.attendanceRate}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-status"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                สถานะนักเรียน
              </label>
              <select
                id="field-status"
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value as StudentStatus)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="ปกติ">ปกติ</option>
                <option value="เฝ้าระวัง">เฝ้าระวัง</option>
                <option value="ลาออก/ย้าย">ลาออก/ย้าย</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="field-guardianPhone"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                เบอร์ติดต่อผู้ปกครอง <span className="text-red-600">*</span>
              </label>
              <input
                id="field-guardianPhone"
                type="text"
                value={form.guardianPhone}
                onChange={(e) => handleChange('guardianPhone', e.target.value)}
                placeholder="เช่น 081-234-5678"
                className={`w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none focus:ring-2 ${
                  errors.guardianPhone
                    ? 'border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-blue-600 focus:ring-blue-100'
                }`}
              />
              {errors.guardianPhone && (
                <p className="mt-1 text-xs text-red-600">{errors.guardianPhone}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="field-note"
                className="mb-1.5 block text-xs font-medium text-slate-700"
              >
                หมายเหตุเพิ่มเติม
              </label>
              <input
                id="field-note"
                type="text"
                value={form.note}
                onChange={(e) => handleChange('note', e.target.value)}
                placeholder="เช่น ชมรม, ทุนการศึกษา"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-100"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="whitespace-nowrap rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800 disabled:opacity-60"
            >
              {submitting
                ? 'กำลังบันทึก...'
                : editingStudent
                ? 'บันทึกการแก้ไข'
                : 'เพิ่มข้อมูลนักเรียน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
