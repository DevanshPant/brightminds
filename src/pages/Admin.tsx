import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { AlertCircle, Download, IndianRupee, Loader2, Search, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { formatINR } from '@/config/course';
import type { Enrollment } from '@/hooks/useEnrollments';

/** Comma-separated list in VITE_ADMIN_EMAILS — must match firestore.rules. */
const ADMIN_EMAILS = String(import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

const formatDate = (value?: string) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' });
};

const toCsv = (rows: Enrollment[]) => {
  const headers = [
    'Receipt No', 'Name', 'Email', 'Phone', 'Course', 'Amount', 'Payment ID', 'Order ID', 'Paid At',
  ];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) =>
    [
      row.receiptNo, row.studentName, row.email, row.phone, row.courseTitle,
      row.amount, row.razorpayPaymentId, row.razorpayOrderId, row.paidAt,
    ].map(escape).join(','),
  );
  return [headers.map(escape).join(','), ...lines].join('\n');
};

const Admin = () => {
  const { user } = useAuth();
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const isAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!db || !isAdmin) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'enrollments'), orderBy('paidAt', 'desc'), limit(500));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setRows(snapshot.docs.map((d) => d.data() as Enrollment));
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error(err);
        setError('Could not load enrolments. Check that your account is listed as an admin in the Firestore rules.');
        setLoading(false);
      },
    );
    return unsubscribe;
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((row) =>
      [row.studentName, row.email, row.phone, row.receiptNo, row.razorpayPaymentId]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term)),
    );
  }, [rows, search]);

  const revenue = useMemo(
    () => filtered.reduce((sum, row) => sum + (Number(row.amount) || 0), 0),
    [filtered],
  );

  const downloadCsv = () => {
    const blob = new Blob([toCsv(filtered)], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `brightminds-enrolments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 pt-32 pb-24">
          <div className="max-w-md mx-auto px-4 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center mb-5">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <h1 className="font-display text-2xl font-bold text-foreground mb-3">Admins only</h1>
            <p className="text-muted-foreground leading-relaxed">
              This page is restricted. Sign in with an admin account listed in{' '}
              <code className="text-xs bg-secondary px-1.5 py-0.5 rounded">VITE_ADMIN_EMAILS</code>.
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Enrolments
          </h1>
          <p className="text-muted-foreground mb-8">Live feed of every completed payment.</p>

          {/* Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              { icon: Users, label: 'Students enrolled', value: String(filtered.length) },
              { icon: IndianRupee, label: 'Total collected', value: formatINR(revenue) },
            ].map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center gap-4 rounded-3xl border border-primary/10 bg-gradient-golden p-5"
              >
                <div className="w-12 h-12 rounded-2xl bg-background flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
                  <div className="font-display text-2xl font-bold text-foreground">{value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, phone or receipt no."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-11 pl-10"
              />
            </div>
            <Button variant="heroOutline" onClick={downloadCsv} disabled={filtered.length === 0}>
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center gap-3 rounded-3xl border border-primary/10 bg-card p-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading enrolments…
            </div>
          ) : error ? (
            <div className="flex items-start gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              {error}
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-3xl border border-primary/10 bg-card p-10 text-center text-muted-foreground">
              No enrolments yet.
            </div>
          ) : (
            <div className="rounded-3xl border border-primary/10 bg-card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="bg-secondary/60 text-left">
                      {['Receipt', 'Student', 'Contact', 'Course', 'Amount', 'Paid'].map((header) => (
                        <th
                          key={header}
                          className="px-4 py-3 font-semibold text-foreground whitespace-nowrap"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr key={row.enrollmentId} className="border-t border-primary/10">
                        <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{row.receiptNo}</td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-foreground">{row.studentName || '—'}</div>
                          <div className="text-xs text-muted-foreground break-all">{row.email}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">{row.phone || '—'}</td>
                        <td className="px-4 py-3">{row.courseTitle}</td>
                        <td className="px-4 py-3 font-semibold whitespace-nowrap">
                          {formatINR(row.amount)}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {formatDate(row.paidAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
