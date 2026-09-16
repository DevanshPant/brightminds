import { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, GraduationCap, Loader2, MessageCircle, Receipt, ShieldCheck } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { useAuth } from '@/contexts/auth-context';
import { getErrorMessage } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';

const PERKS = [
  { icon: GraduationCap, title: 'Your courses in one place', text: 'Everything you have enrolled in, always available.' },
  { icon: Receipt, title: 'Receipts on demand', text: 'View and re-send any payment receipt any time.' },
  { icon: MessageCircle, title: 'Community access', text: 'Your private WhatsApp community link, saved for you.' },
];

const Login = () => {
  const { user, loading, configured, signInWithGoogle } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const redirectTo = (location.state as { from?: string } | null)?.from || '/dashboard';

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!loading && user) return <Navigate to={redirectTo} replace />;

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not sign you in',
        description: getErrorMessage(error, 'Please try again in a moment.'),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 pt-28 sm:pt-32 pb-16 sm:pb-24 bg-gradient-hero">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>

          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Sign-in card */}
            <div className="order-1 rounded-3xl border border-primary/15 bg-card p-6 sm:p-9 shadow-golden-lg">
              <div className="w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-golden mb-6">
                <GraduationCap className="w-7 h-7 text-foreground" />
              </div>

              <h1 className="font-display text-2xl sm:text-3xl font-bold text-foreground mb-3">
                Student login
              </h1>
              <p className="text-muted-foreground leading-relaxed mb-8">
                Sign in with Google to enrol in a course, view your receipts and reach your student
                community.
              </p>

              {loading ? (
                <div className="flex items-center gap-3 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking your session…
                </div>
              ) : configured ? (
                <>
                  <GoogleSignInButton onClick={handleSignIn} loading={busy} />
                  <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed mt-5">
                    <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>
                      We only ever read your name, email and profile picture. By continuing you agree
                      to our{' '}
                      <Link to="/terms-of-use" className="underline hover:text-foreground">
                        Terms of Use
                      </Link>{' '}
                      and{' '}
                      <Link to="/privacy-policy" className="underline hover:text-foreground">
                        Privacy Policy
                      </Link>
                      .
                    </span>
                  </p>
                </>
              ) : (
                <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-secondary/60 p-4 text-sm text-muted-foreground">
                  <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Student login is being set up and goes live shortly. Until then, reach us on
                    WhatsApp or through the{' '}
                    <Link to="/#contact" className="underline hover:text-foreground">
                      enquiry form
                    </Link>{' '}
                    and we will enrol you manually.
                  </span>
                </div>
              )}
            </div>

            {/* Perks */}
            <div className="order-2 space-y-4">
              <h2 className="font-display text-xl sm:text-2xl font-bold text-foreground mb-2">
                Why sign in?
              </h2>
              {PERKS.map(({ icon: Icon, title, text }) => (
                <div
                  key={title}
                  className="flex items-start gap-4 rounded-2xl border border-primary/10 bg-gradient-golden p-5"
                >
                  <div className="w-11 h-11 rounded-2xl bg-background flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground mb-1">{title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Login;
