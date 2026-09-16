import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  ExternalLink,
  Loader2,
  LogOut,
  MessageCircle,
  Receipt,
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/auth-context';
import { useEnrollments } from '@/hooks/useEnrollments';
import { COURSES, formatINR, WHATSAPP_COMMUNITY_LINK } from '@/config/course';

const formatDate = (value?: string) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const { enrollments, loading, error } = useEnrollments();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const availableCourses = COURSES.filter(
    (course) => course.active && !enrollments.some((e) => e.courseId === course.id),
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Greeting */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5 mb-10">
            <div className="flex items-center gap-4 min-w-0">
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt=""
                  referrerPolicy="no-referrer"
                  className="w-14 h-14 rounded-2xl object-cover border border-primary/20 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-golden shrink-0">
                  <span className="font-display text-xl font-bold text-foreground">
                    {(user?.displayName || user?.email || '?').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="min-w-0">
                <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground truncate">
                  Hi, {user?.displayName?.split(' ')[0] || 'there'}
                </h1>
                <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              </div>
            </div>

            <Button variant="heroOutline" onClick={() => signOut()} className="w-full sm:w-auto shrink-0">
              <LogOut className="w-4 h-4" />
              Sign out
            </Button>
          </div>

          {/* Enrolments */}
          <section className="mb-14">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
              My courses
            </h2>

            {loading ? (
              <div className="flex items-center gap-3 rounded-3xl border border-primary/10 bg-card p-8 text-muted-foreground">
                <Loader2 className="w-5 h-5 animate-spin" />
                Loading your courses…
              </div>
            ) : error ? (
              <div className="flex items-start gap-3 rounded-3xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-muted-foreground">
                <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                {error}
              </div>
            ) : enrollments.length === 0 ? (
              <div className="rounded-3xl border border-primary/10 bg-gradient-golden p-8 sm:p-10 text-center">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-background flex items-center justify-center mb-5">
                  <BookOpen className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-display text-xl font-bold text-foreground mb-2">
                  You have not enrolled yet
                </h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
                  Browse our courses and join a batch - enrolment takes under two minutes.
                </p>
                <Button variant="hero" size="lg" asChild>
                  <Link to="/#courses">
                    See courses
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                {enrollments.map((enrollment) => {
                  const whatsappLink = enrollment.whatsappLink || WHATSAPP_COMMUNITY_LINK;
                  return (
                    <article
                      key={enrollment.enrollmentId}
                      className="rounded-3xl border border-primary/15 bg-card p-6 sm:p-8 shadow-golden"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
                        <div className="min-w-0">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold mb-3">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Enrolled
                          </span>
                          <h3 className="font-display text-xl sm:text-2xl font-bold text-foreground">
                            {enrollment.courseTitle}
                          </h3>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-display text-2xl font-bold text-foreground">
                            {formatINR(enrollment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">paid</div>
                        </div>
                      </div>

                      {/* Receipt */}
                      <div className="rounded-2xl bg-secondary/50 p-4 sm:p-5 mb-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Receipt className="w-4 h-4 text-primary" />
                          <span className="text-xs font-bold uppercase tracking-wide text-foreground">
                            Payment receipt
                          </span>
                        </div>
                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 text-sm">
                          {[
                            ['Receipt no.', enrollment.receiptNo],
                            ['Payment ID', enrollment.razorpayPaymentId],
                            ['Order ID', enrollment.razorpayOrderId],
                            ['Paid on', formatDate(enrollment.paidAt)],
                          ].map(([label, value]) => (
                            <div key={label} className="flex justify-between gap-3">
                              <dt className="text-muted-foreground shrink-0">{label}</dt>
                              <dd className="font-medium text-foreground text-right break-all">
                                {value || '-'}
                              </dd>
                            </div>
                          ))}
                        </dl>
                        <p className="text-xs text-muted-foreground mt-4">
                          {enrollment.receiptEmailSent === false
                            ? 'We could not email this receipt. Please contact us and we will resend it.'
                            : `A copy was emailed to ${enrollment.email}.`}
                        </p>
                      </div>

                      {/* WhatsApp */}
                      {whatsappLink ? (
                        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 sm:p-5">
                          <p className="text-sm text-green-900 leading-relaxed mb-4">
                            <strong>Join the student community.</strong> Batch timings, live session
                            links and study material are shared only there.
                          </p>
                          <Button
                            size="lg"
                            className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white shadow-none"
                            asChild
                          >
                            <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                              <MessageCircle className="w-4 h-4" />
                              Open WhatsApp community
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          </Button>
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-primary/15 bg-secondary/50 p-4 text-sm text-muted-foreground">
                          Your WhatsApp community link will appear here as soon as it is published.
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Upsell */}
          {availableCourses.length > 0 && !loading && (
            <section>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-5">
                Available courses
              </h2>
              <div className="grid sm:grid-cols-2 gap-5">
                {availableCourses.map((course) => (
                  <Link
                    key={course.id}
                    to={`/courses/${course.slug}`}
                    className="group rounded-3xl border border-primary/10 bg-gradient-golden p-6 hover:shadow-golden-lg transition-all duration-500 hover:-translate-y-1"
                  >
                    <h3 className="font-display text-lg font-bold text-foreground mb-2">
                      {course.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-3">
                      {course.subtitle}
                    </p>
                    <span className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                      {formatINR(course.price)}
                      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
