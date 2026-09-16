import { useEffect, useMemo, useState } from 'react';
import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import {
  AlertCircle, FileSpreadsheet, IndianRupee, Loader2, Search, TrendingUp, UserCheck, Users,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { useStudents } from '@/hooks/useStudents';
import { downloadStudentWorkbook } from '@/lib/downloadExport';
import { useToast } from '@/hooks/use-toast';
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

const Admin = () => {
  const { user, getToken } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [exporting, setExporting] = useState(false);

  const isAdmin = Boolean(user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase()));
  const { students, loading: studentsLoading, error: studentsError } = useStudents(isAdmin);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (!db || !isAdmin) {
      setLoading(false);
      return;
    }
    const q = query(collection(db, 'enrollments'), orderBy('paidAt', 'desc'), limit(1000));
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

  const matches = (term: string, fields: (string | number | null | undefined)[]) =>
    fields.filter(Boolean).some((f) => String(f).toLowerCase().includes(term));

  const term = search.trim().toLowerCase();

  const filteredEnrolments = useMemo(
    () => (!term ? rows : rows.filter((r) =>
      matches(term, [r.studentName, r.email, r.phone, r.receiptNo, r.razorpayPaymentId]))),
    [rows, term],
  );

  const filteredStudents = useMemo(
    () => (!term ? students : students.filter((s) =>
      matches(term, [s.displayName, s.email, s.phone]))),
    [students, term],
  );

  const paid = useMemo(() => rows.filter((r) => r.status === 'paid'), [rows]);
  const revenue = useMemo(() => paid.reduce((sum, r) => sum + (Number(r.amount) || 0), 0), [paid]);
  const enrolledUids = useMemo(() => new Set(paid.map((r) => r.uid)), [paid]);
  const conversion = students.length
    ? `${((enrolledUids.size / students.length) * 100).toFixed(0)}%`
    : '—';

  const handleExport = async () => {
    setExporting(true);
    try {
      const token = await getToken();
      const filename = await downloadStudentWorkbook(token);
      toast({
        title: 'Excel file downloaded',
        description: filename,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Could not download the Excel file',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setExporting(false);
    }
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

  const stats = [
    { icon: Users, label: 'Registered', value: String(students.length), hint: 'signed in at least once' },
    { icon: UserCheck, label: 'Enrolled', value: String(enrolledUids.size), hint: 'completed payment' },
    { icon: TrendingUp, label: 'Conversion', value: conversion, hint: 'signup to paid' },
    { icon: IndianRupee, label: 'Collected', value: formatINR(revenue), hint: 'total received' },
  ];

  const anyError = error || studentsError;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-1">
                Students
              </h1>
              <p className="text-muted-foreground">Live view of every signup and payment.</p>
            </div>
            <Button
              variant="hero"
              onClick={handleExport}
              disabled={exporting || (loading && studentsLoading)}
              className="w-full sm:w-auto shrink-0"
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
              {exporting ? 'Building…' : 'Download Excel'}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
            {stats.map(({ icon: Icon, label, value, hint }) => (
              <div key={label} className="rounded-3xl border border-primary/10 bg-gradient-golden p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
                </div>
                <div className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-none mb-1">
                  {value}
                </div>
                <div className="text-xs text-muted-foreground">{hint}</div>
              </div>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search name, email, phone or receipt no."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 pl-10"
            />
          </div>

          {anyError && (
            <div className="flex items-start gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground mb-6">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              {anyError}
            </div>
          )}

          <Tabs defaultValue="enrolments">
            <TabsList className="mb-5">
              <TabsTrigger value="enrolments">Enrolments ({filteredEnrolments.length})</TabsTrigger>
              <TabsTrigger value="students">All students ({filteredStudents.length})</TabsTrigger>
            </TabsList>

            {/* Paid enrolments */}
            <TabsContent value="enrolments">
              {loading ? (
                <div className="flex items-center gap-3 rounded-3xl border border-primary/10 bg-card p-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading enrolments…
                </div>
              ) : filteredEnrolments.length === 0 ? (
                <div className="rounded-3xl border border-primary/10 bg-card p-10 text-center text-muted-foreground">
                  No enrolments yet.
                </div>
              ) : (
                <div className="rounded-3xl border border-primary/10 bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                      <thead>
                        <tr className="bg-secondary/60 text-left">
                          {['Receipt', 'Student', 'Contact', 'Course', 'Amount', 'Paid'].map((h) => (
                            <th key={h} className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEnrolments.map((row) => (
                          <tr key={row.enrollmentId} className="border-t border-primary/10">
                            <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{row.receiptNo}</td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{row.studentName || '—'}</div>
                              <div className="text-xs text-muted-foreground break-all">{row.email}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">{row.phone || '—'}</td>
                            <td className="px-4 py-3">{row.courseTitle}</td>
                            <td className="px-4 py-3 font-semibold whitespace-nowrap">{formatINR(row.amount)}</td>
                            <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(row.paidAt)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Everyone who signed in */}
            <TabsContent value="students">
              {studentsLoading ? (
                <div className="flex items-center gap-3 rounded-3xl border border-primary/10 bg-card p-8 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" /> Loading students…
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="rounded-3xl border border-primary/10 bg-card p-10 text-center text-muted-foreground">
                  No students have signed in yet.
                </div>
              ) : (
                <div className="rounded-3xl border border-primary/10 bg-card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                      <thead>
                        <tr className="bg-secondary/60 text-left">
                          {['Student', 'Phone', 'Status', 'Signed up', 'Last login', 'Logins'].map((h) => (
                            <th key={h} className="px-4 py-3 font-semibold text-foreground whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((s) => {
                          const enrolled = enrolledUids.has(s.uid);
                          return (
                            <tr key={s.uid} className="border-t border-primary/10">
                              <td className="px-4 py-3">
                                <div className="font-medium text-foreground">{s.displayName || '—'}</div>
                                <div className="text-xs text-muted-foreground break-all">{s.email}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">{s.phone || '—'}</td>
                              <td className="px-4 py-3">
                                <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                                  enrolled ? 'bg-green-100 text-green-700' : 'bg-secondary text-muted-foreground'
                                }`}>
                                  {enrolled ? 'Enrolled' : 'Signed up'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(s.signupAt)}</td>
                              <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(s.lastLoginAt)}</td>
                              <td className="px-4 py-3 whitespace-nowrap">{s.loginCount ?? '—'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Admin;
