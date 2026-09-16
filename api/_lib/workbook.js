import ExcelJS from 'exceljs';
import { adminDb } from './firebaseAdmin.js';

const GOLD = 'FFF5B700';
const INK = 'FF1A1714';

const IST = (value) => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
};

/**
 * One sheet, one row per student, newest signup first. Students who have paid
 * carry their payment details on the same row, so the admin never has to
 * cross-reference two tabs.
 *
 * Built on the server so the copy attached to the admin email and the copy
 * downloaded from /admin are always byte-for-byte the same report.
 */
export async function buildEnrolmentWorkbook() {
  const db = adminDb();

  const [studentsSnap, enrolmentsSnap] = await Promise.all([
    // No orderBy: Firestore silently DROPS documents that lack the ordered
    // field, which would hide every student created before signupAt existed.
    // Sorted in memory below instead.
    db.collection('users').limit(5000).get(),
    db.collection('enrollments').where('status', '==', 'paid').limit(5000).get(),
  ]);

  const students = studentsSnap.docs
    .map((d) => d.data())
    .sort((a, b) => String(b.signupAt || '').localeCompare(String(a.signupAt || '')));
  const enrolments = enrolmentsSnap.docs.map((d) => d.data());

  // Latest paid enrolment per student.
  const byUid = new Map();
  for (const e of enrolments) {
    const current = byUid.get(e.uid);
    if (!current || new Date(e.paidAt) > new Date(current.paidAt)) byUid.set(e.uid, e);
  }

  // A student may have paid before their profile row existed; never drop them.
  const seen = new Set(students.map((s) => s.uid));
  const orphans = enrolments
    .filter((e) => !seen.has(e.uid))
    .map((e) => ({
      uid: e.uid,
      displayName: e.studentName,
      email: e.email,
      phone: e.phone,
      signupAt: e.paidAt,
      lastLoginAt: '',
      loginCount: '',
    }));

  const rows = [...students, ...orphans];

  const wb = new ExcelJS.Workbook();
  wb.creator = 'BrightMinds';
  wb.created = new Date();

  const sheet = wb.addWorksheet('Students');
  sheet.columns = [
    { header: 'Student Name', key: 'name', width: 24 },
    { header: 'Email (Gmail)', key: 'email', width: 30 },
    { header: 'Phone', key: 'phone', width: 16 },
    { header: 'Status', key: 'status', width: 12 },
    { header: 'Course', key: 'course', width: 20 },
    { header: 'Amount (INR)', key: 'amount', width: 13 },
    { header: 'Receipt No', key: 'receipt', width: 15 },
    { header: 'Paid On (IST)', key: 'paidAt', width: 21 },
    { header: 'Payment ID', key: 'paymentId', width: 22 },
    { header: 'Signed Up (IST)', key: 'signupAt', width: 21 },
    { header: 'Last Login (IST)', key: 'lastLoginAt', width: 21 },
    { header: 'Logins', key: 'logins', width: 8 },
  ];

  for (const s of rows) {
    const e = byUid.get(s.uid);
    sheet.addRow({
      name: s.fullName || s.displayName || e?.studentName || '',
      email: s.email || e?.email || '',
      phone: s.phone || e?.phone || '',
      status: e ? 'Enrolled' : 'Signed up',
      course: e?.courseTitle || '',
      amount: e ? Number(e.amount) || 0 : '',
      receipt: e?.receiptNo || '',
      paidAt: IST(e?.paidAt),
      paymentId: e?.razorpayPaymentId || '',
      signupAt: IST(s.signupAt),
      lastLoginAt: IST(s.lastLoginAt),
      logins: s.loginCount ?? '',
    });
  }

  // Header styling, frozen top row, filters.
  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: INK } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
  header.height = 22;
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columnCount } };
  sheet.getColumn('amount').numFmt = '₹#,##0';

  // Green fill on every enrolled row so paying students stand out.
  sheet.eachRow((row, i) => {
    if (i === 1) return;
    if (row.getCell('status').value === 'Enrolled') {
      row.getCell('status').font = { bold: true, color: { argb: 'FF22803C' } };
    }
  });

  // Totals, two rows under the data.
  const paidCount = byUid.size;
  const revenue = [...byUid.values()].reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
  sheet.addRow({});
  const totals = sheet.addRow({
    name: 'TOTAL',
    email: `${rows.length} registered`,
    phone: `${paidCount} enrolled`,
    status: '',
    course: '',
    amount: revenue,
  });
  totals.font = { bold: true };

  const buffer = await wb.xlsx.writeBuffer();
  return {
    buffer: Buffer.from(buffer),
    filename: `brightminds-students-${new Date().toISOString().slice(0, 10)}.xlsx`,
    registered: rows.length,
    enrolled: paidCount,
    revenue,
  };
}
