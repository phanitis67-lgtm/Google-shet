import { SheetConnection, SheetTabInfo, Student } from '../types/student';
import {
  sheetRowsToStudents,
  STUDENT_SHEET_HEADERS,
  studentToSheetRow,
} from '../utils/sheetsCodec';

export interface DriveSpreadsheetFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

export class WorkspaceApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function handleApiResponse<T>(res: Response, fallbackMsg: string): Promise<T> {
  if (!res.ok) {
    let detail = fallbackMsg;
    try {
      const errBody = await res.json();
      if (errBody?.error?.message) {
        detail = errBody.error.message;
      }
    } catch {
      // ignore json parse failure
    }
    if (res.status === 401) {
      throw new WorkspaceApiError('เซสชัน Google หมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง', 401);
    }
    if (res.status === 403) {
      throw new WorkspaceApiError('ไม่มีสิทธิ์เข้าถึงสเปรดชีตนี้ กรุณาตรวจสอบสิทธิ์หรือเลือกไฟล์อื่น', 403);
    }
    if (res.status === 404) {
      throw new WorkspaceApiError('ไม่พบสเปรดชีตตามรหัสหรือ URL ที่ระบุ', 404);
    }
    throw new WorkspaceApiError(detail, res.status);
  }
  return res.json() as Promise<T>;
}

function escapeSheetName(sheetTitle: string): string {
  return `'${sheetTitle.replace(/'/g, "''")}'`;
}

export async function listAppSpreadsheets(accessToken: string): Promise<DriveSpreadsheetFile[]> {
  const query = encodeURIComponent(
    "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
  );
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=20`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await handleApiResponse<{ files?: DriveSpreadsheetFile[] }>(
    res,
    'ไม่สามารถดึงรายการสเปรดชีตได้'
  );
  return data.files ?? [];
}

export async function getSpreadsheetMetadata(
  accessToken: string,
  spreadsheetId: string
): Promise<{ title: string; sheets: SheetTabInfo[] }> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}?fields=properties.title,sheets.properties(sheetId,title,index)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await handleApiResponse<{
    properties?: { title?: string };
    sheets?: Array<{ properties?: { sheetId?: number; title?: string; index?: number } }>;
  }>(res, 'ไม่สามารถอ่านข้อมูลสเปรดชีตได้');

  const sheets: SheetTabInfo[] = (data.sheets ?? [])
    .map((s) => ({
      sheetId: s.properties?.sheetId ?? 0,
      title: s.properties?.title ?? 'Sheet1',
      index: s.properties?.index ?? 0,
    }))
    .sort((a, b) => a.index - b.index);

  return {
    title: data.properties?.title ?? 'Google Sheet',
    sheets,
  };
}

export async function createStudentSpreadsheet(
  accessToken: string,
  title: string,
  initialStudents: Student[] = []
): Promise<SheetConnection> {
  const sheetTabTitle = 'ข้อมูลนักเรียน';
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: { title: title.trim() || 'ระบบข้อมูลนักเรียน (ScholarSheet)' },
      sheets: [
        {
          properties: {
            title: sheetTabTitle,
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  const created = await handleApiResponse<{
    spreadsheetId: string;
    properties: { title: string };
    sheets: Array<{ properties: { sheetId: number; title: string; index: number } }>;
  }>(createRes, 'ไม่สามารถสร้างไฟล์ Google Sheet ใหม่ได้');

  const spreadsheetId = created.spreadsheetId;
  const firstSheet = created.sheets[0].properties;

  // Populate header row and optional seed rows
  const values: (string | number)[][] = [
    STUDENT_SHEET_HEADERS,
    ...initialStudents.map((s) => studentToSheetRow(s)),
  ];

  const range = encodeURIComponent(`${escapeSheetName(firstSheet.title)}!A1`);
  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ values }),
    }
  );
  await handleApiResponse(updateRes, 'ไม่สามารถบันทึกหัวตารางลง Google Sheet ได้');

  // Bold header row with subtle fill
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          repeatCell: {
            range: {
              sheetId: firstSheet.sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 0,
              endColumnIndex: STUDENT_SHEET_HEADERS.length,
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.94, green: 0.96, blue: 0.99 },
                textFormat: { bold: true },
              },
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat.bold)',
          },
        },
      ],
    }),
  });

  return {
    spreadsheetId,
    spreadsheetTitle: created.properties.title,
    sheetTitle: firstSheet.title,
    sheetId: firstSheet.sheetId,
    availableTabs: [
      {
        sheetId: firstSheet.sheetId,
        title: firstSheet.title,
        index: firstSheet.index,
      },
    ],
    lastSyncedAt: new Date().toISOString(),
  };
}

export async function fetchStudentsFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<Student[]> {
  const range = encodeURIComponent(`${escapeSheetName(sheetTitle)}!A:J`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${range}`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await handleApiResponse<{ values?: string[][] }>(
    res,
    'ไม่สามารถอ่านรายชื่อนักเรียนจาก Google Sheet ได้'
  );

  return sheetRowsToStudents(data.values ?? []);
}

export async function ensureSheetHeadersIfEmpty(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string
): Promise<void> {
  const range = encodeURIComponent(`${escapeSheetName(sheetTitle)}!A1:J1`);
  const res = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(spreadsheetId)}/values/${range}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const data = await handleApiResponse<{ values?: string[][] }>(res, 'ตรวจสอบหัวตารางไม่สำเร็จ');
  if (!data.values || data.values.length === 0 || data.values[0].length === 0) {
    const putRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
        spreadsheetId
      )}/values/${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values: [STUDENT_SHEET_HEADERS] }),
      }
    );
    await handleApiResponse(putRes, 'สร้างหัวตารางไม่สำเร็จ');
  }
}

export async function appendStudentToSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  student: Student
): Promise<void> {
  await ensureSheetHeadersIfEmpty(accessToken, spreadsheetId, sheetTitle);
  const range = encodeURIComponent(`${escapeSheetName(sheetTitle)}!A:J`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [studentToSheetRow(student)],
    }),
  });

  await handleApiResponse(res, 'ไม่สามารถเพิ่มข้อมูลนักเรียนลง Google Sheet ได้');
}

export async function updateStudentInSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetTitle: string,
  rowIndex: number,
  student: Student
): Promise<void> {
  const range = encodeURIComponent(`${escapeSheetName(sheetTitle)}!A${rowIndex}:J${rowIndex}`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}/values/${range}?valueInputOption=RAW`;

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [studentToSheetRow(student)],
    }),
  });

  await handleApiResponse(res, 'ไม่สามารถอัปเดตข้อมูลนักเรียนใน Google Sheet ได้');
}

export async function deleteStudentFromSheet(
  accessToken: string,
  spreadsheetId: string,
  sheetId: number,
  rowIndex: number
): Promise<void> {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
    spreadsheetId
  )}:batchUpdate`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    }),
  });

  await handleApiResponse(res, 'ไม่สามารถลบแถวข้อมูลใน Google Sheet ได้');
}
