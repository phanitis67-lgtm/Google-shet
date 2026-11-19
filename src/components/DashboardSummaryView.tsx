import React from 'react';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  Plus,
  UserCheck,
  Users,
} from 'lucide-react';
import { DashboardSummary, GradeLevel, Student } from '../types/student';

interface DashboardSummaryViewProps {
  summary: DashboardSummary;
  loading?: boolean;
  onSelectGrade: (grade: GradeLevel, classroom?: string) => void;
  onOpenAttentionList: () => void;
  onEditStudent: (student: Student) => void;
  onAddStudent: () => void;
}

export const DashboardSummaryView: React.FC<DashboardSummaryViewProps> = ({
  summary,
  loading = false,
  onSelectGrade,
  onOpenAttentionList,
  onEditStudent,
  onAddStudent,
}) => {
  if (loading) {
    return (
      <div className="space-y-6" aria-busy="true" aria-label="กำลังโหลดข้อมูลแดชบอร์ด">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className="h-28 animate-pulse rounded-xl border border-slate-200 bg-white p-5"
            >
              <div className="h-3.5 w-24 rounded bg-slate-200" />
              <div className="mt-4 h-7 w-16 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-36 rounded bg-slate-100" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-7" />
          <div className="h-72 animate-pulse rounded-xl border border-slate-200 bg-white lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (summary.totalStudents === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600">
          <Users className="h-6 w-6" />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">
          ยังไม่มีข้อมูลนักเรียนในระบบ
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-sm text-slate-500">
          เริ่มต้นเพิ่มรายชื่อนักเรียนคนแรก หรือเชื่อมต่อสเปรดชีตที่มีข้อมูลอยู่แล้วเพื่อสร้างรายงานสรุปผลบนแดชบอร์ด
        </p>
        <div className="mt-6">
          <button
            type="button"
            onClick={onAddStudent}
            className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg bg-blue-700 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-800"
          >
            <Plus className="h-4 w-4" />
            <span>เพิ่มนักเรียนคนแรก</span>
          </button>
        </div>
      </div>
    );
  }

  const maxGradeCount = Math.max(1, ...summary.gradeBreakdown.map((g) => g.count));

  const bucketColors: Record<string, string> = {
    excellent: 'bg-blue-700',
    good: 'bg-emerald-600',
    fair: 'bg-amber-500',
    needs_support: 'bg-red-600',
  };

  return (
    <div className="space-y-6" data-testid="dashboard-summary-view">
      {/* 4-Column KPI Strip */}
      <section aria-label="ตัวชี้วัดภาพรวมนักเรียน" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>นักเรียนทั้งหมด</span>
            <Users className="h-4 w-4 text-slate-400" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {summary.totalStudents}
            </span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            <span>ชาย {summary.maleCount}</span>
            <span aria-hidden="true"> · </span>
            <span>หญิง {summary.femaleCount}</span>
            {summary.otherCount > 0 && (
              <>
                <span aria-hidden="true"> · </span>
                <span>อื่นๆ {summary.otherCount}</span>
              </>
            )}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>เกรดเฉลี่ยรวม (GPA)</span>
            <CheckCircle2 className="h-4 w-4 text-blue-700" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {summary.avgGpa.toFixed(2)}
            </span>
            <span className="text-xs text-slate-500">/ 4.00</span>
          </div>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            <span>เกรดดีเยี่ยม (≥ 3.50) จำนวน {summary.honorCount} คน</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>อัตราการเข้าเรียนเฉลี่ย</span>
            <UserCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {summary.avgAttendance}%
            </span>
            <span className="text-xs text-emerald-700 font-medium">
              {summary.avgAttendance >= 90 ? 'อยู่ในเกณฑ์ดี' : 'ควรติดตาม'}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-500 tabular-nums">
            <span>เข้าเรียนต่ำกว่า 80% จำนวน {summary.lowAttendanceCount} คน</span>
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500">
            <span>ต้องติดตามดูแล</span>
            <AlertTriangle
              className={`h-4 w-4 ${
                summary.attentionStudents.length > 0 ? 'text-amber-600' : 'text-slate-400'
              }`}
              aria-hidden="true"
            />
          </div>
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {summary.attentionStudents.length}
            </span>
            <span className="text-xs text-slate-500">คน</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-slate-500">เกรด &lt; 2.00 หรือเข้าเรียน &lt; 80%</span>
            {summary.attentionStudents.length > 0 && (
              <button
                type="button"
                onClick={onOpenAttentionList}
                className="inline-flex items-center gap-0.5 font-medium text-blue-700 hover:underline whitespace-nowrap shrink-0"
              >
                <span>ดูทั้งหมด</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Analytical Charts Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Grade Level Breakdown Chart */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                จำนวนนักเรียนและเกรดเฉลี่ยตามระดับชั้น
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                คลิกที่แท่งระดับชั้นเพื่อดูรายชื่อนักเรียนในชั้นนั้นทันที
              </p>
            </div>
            <span className="text-xs text-slate-500 tabular-nums">
              รวม 6 ระดับชั้น
            </span>
          </div>

          <div className="mt-6 grid grid-cols-6 items-end gap-3 pt-4" role="list" aria-label="กราฟจำนวนนักเรียนตามระดับชั้น">
            {summary.gradeBreakdown.map((item) => {
              const heightPct =
                item.count === 0 ? 4 : Math.max(14, Math.round((item.count / maxGradeCount) * 100));

              return (
                <button
                  key={item.gradeLevel}
                  type="button"
                  onClick={() => onSelectGrade(item.gradeLevel)}
                  aria-label={`ดูรายชื่อชั้น ${item.gradeLevel} จำนวน ${item.count} คน เกรดเฉลี่ย ${item.avgGpa.toFixed(2)}`}
                  className="group flex flex-col items-center rounded-lg p-2 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-700"
                >
                  <div className="flex h-40 w-full flex-col items-center justify-end">
                    <span className="mb-1.5 font-mono text-xs font-semibold text-slate-900 tabular-nums">
                      {item.count}
                    </span>
                    <div
                      className={`w-full max-w-[44px] rounded-t-md transition-all duration-200 ${
                        item.count > 0
                          ? 'bg-blue-700 group-hover:bg-blue-800'
                          : 'bg-slate-100'
                      }`}
                      style={{ height: `${heightPct}%` }}
                    />
                  </div>
                  <div className="mt-3 border-t border-slate-100 pt-2 text-center w-full">
                    <div className="text-xs font-semibold text-slate-800">
                      {item.gradeLevel}
                    </div>
                    <div className="mt-0.5 font-mono text-[11px] text-slate-500 tabular-nums">
                      {item.count > 0 ? `GPA ${item.avgGpa.toFixed(2)}` : '–'}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* GPA Distribution */}
        <div className="rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              สัดส่วนระดับผลการเรียน (GPA)
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              การกระจายเกรดเฉลี่ยของนักเรียนทั้งหมด {summary.totalStudents} คน
            </p>
          </div>

          <div className="mt-6 space-y-4">
            {summary.gpaBuckets.map((bucket) => (
              <div key={bucket.key}>
                <div className="flex items-baseline justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-slate-800">{bucket.label}</span>
                    <span className="text-slate-400" aria-hidden="true">
                      ·
                    </span>
                    <span className="font-mono text-slate-500 tabular-nums">
                      {bucket.rangeLabel}
                    </span>
                  </div>
                  <div className="font-mono text-slate-700 tabular-nums">
                    <span className="font-semibold text-slate-900">{bucket.count}</span>{' '}
                    <span className="text-slate-400">({bucket.percentage}%)</span>
                  </div>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      bucketColors[bucket.key] ?? 'bg-slate-600'
                    }`}
                    style={{ width: `${bucket.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Classroom Summary & Attention Students */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Classroom Summary Table */}
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-6">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-base font-semibold text-slate-900">
              สรุปรายงานแยกตามห้องเรียน
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              เปรียบเทียบจำนวนนักเรียน เกรดเฉลี่ย และอัตราการเข้าเรียนรายห้อง
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-medium text-slate-500">
                  <th className="px-6 py-3">ห้องเรียน</th>
                  <th className="px-4 py-3 text-right">จำนวน (คน)</th>
                  <th className="px-4 py-3 text-right">เกรดเฉลี่ย</th>
                  <th className="px-6 py-3 text-right">เข้าเรียนเฉลี่ย</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary.classroomSummaries.map((room) => (
                  <tr key={room.key} className="hover:bg-slate-50/70">
                    <td className="px-6 py-3 font-medium text-slate-900">
                      <button
                        type="button"
                        onClick={() => onSelectGrade(room.gradeLevel, room.classroom)}
                        className="hover:text-blue-700 hover:underline"
                      >
                        {room.key}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {room.count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                      {room.avgGpa.toFixed(2)}
                    </td>
                    <td className="px-6 py-3 text-right font-mono text-slate-700 tabular-nums">
                      {room.avgAttendance}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Students Needing Attention */}
        <div className="rounded-xl border border-slate-200 bg-white lg:col-span-6">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                นักเรียนที่ควรติดตามดูแล
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                คัดกรองจากสถานะเฝ้าระวัง เกรดเฉลี่ยต่ำกว่า 2.00 หรือเข้าเรียนน้อยกว่า 80%
              </p>
            </div>
            <span className="font-mono text-xs font-semibold text-slate-600 tabular-nums">
              {summary.attentionStudents.length} คน
            </span>
          </div>

          {summary.attentionStudents.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
              <p className="mt-2.5 text-sm font-medium text-slate-900">
                นักเรียนทุกคนอยู่ในเกณฑ์ปกติ
              </p>
              <p className="mt-1 text-xs text-slate-500">
                ไม่พบนักเรียนที่มีเกรดเฉลี่ยต่ำกว่า 2.00 หรือขาดเรียนเกินเกณฑ์
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {summary.attentionStudents.slice(0, 6).map(({ student, reasons }) => (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 hover:bg-slate-50/70"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-slate-500 tabular-nums">
                        {student.studentId}
                      </span>
                      <span className="truncate text-sm font-medium text-slate-900">
                        {student.fullName}
                      </span>
                      <span className="text-xs text-slate-500 whitespace-nowrap">
                        {student.gradeLevel}/{student.classroom}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-amber-700">
                      {reasons.join(' · ')}
                      {student.note ? ` — ${student.note}` : ''}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => onEditStudent(student)}
                    aria-label={`อัปเดตข้อมูล ${student.fullName}`}
                    className="whitespace-nowrap shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
                  >
                    แก้ไขข้อมูล
                  </button>
                </li>
              ))}
            </ul>
          )}
          {summary.attentionStudents.length > 6 && (
            <div className="border-t border-slate-100 px-6 py-3 text-right">
              <button
                type="button"
                onClick={onOpenAttentionList}
                className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:underline"
              >
                <span>ดูนักเรียนที่ต้องติดตามทั้งหมด {summary.attentionStudents.length} คน</span>
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
