import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  MessageCircle,
  ShieldCheck,
  Lock,
  AlertTriangle,
} from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import AuthDialog from '@/components/AuthDialog';
import { useAuth } from '@/contexts/auth-context';
import { useEnrollments } from '@/hooks/useEnrollments';
import { useProfile } from '@/hooks/useProfile';
import { useRazorpay } from '@/hooks/useRazorpay';
import { useToast } from '@/hooks/use-toast';
import { formatINR, type Course } from '@/config/course';
import type { VerifyPaymentResponse } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

type Props = {
  course: Course;
  size?: ButtonProps['size'];
  variant?: ButtonProps['variant'];
  className?: string;
  label?: string;
};

const EnrollButton = ({ course, size = 'lg', variant = 'hero', className, label }: Props) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, loading: authLoading, getToken } = useAuth();
  const { isEnrolledIn, loading: enrollmentsLoading } = useEnrollments();
  const { profile } = useProfile();
  const { startCheckout, isProcessing } = useRazorpay();

  const [authOpen, setAuthOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [phone, setPhone] = useState('');
  const [phoneError, setPhoneError] = useState('');
  const [success, setSuccess] = useState<VerifyPaymentResponse | null>(null);
  const [unconfirmed, setUnconfirmed] = useState<{ paymentId: string; orderId: string; message: string } | null>(null);

  const alreadyEnrolled = Boolean(user) && isEnrolledIn(course.id);
  const busy = isProcessing || authLoading || (Boolean(user) && enrollmentsLoading);

  // Reuse the number captured at sign-in rather than asking for it twice.
  useEffect(() => {
    if (profile?.phone) setPhone((current) => current || String(profile.phone).slice(-10));
  }, [profile]);

  const handleClick = () => {
    if (alreadyEnrolled) {
      navigate('/dashboard');
      return;
    }
    if (!user) {
      setAuthOpen(true);
      return;
    }
    setDetailsOpen(true);
  };

  const handlePay = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number.');
      return;
    }
    setPhoneError('');
    setDetailsOpen(false);

    try {
      const token = await getToken();

      await startCheckout({
        courseId: course.id,
        token,
        name: user?.displayName || '',
        email: user?.email || '',
        phone: digits,
        onSuccess: (result) => {
          setSuccess(result);
          toast({
            title: 'Payment successful',
            description: `Receipt ${result.receiptNo} has been emailed to you.`,
          });
        },
        onFailure: (message) => {
          toast({ variant: 'destructive', title: 'Payment not completed', description: message });
        },
        // Money taken, enrolment unconfirmed. Too serious for a toast.
        onUnconfirmed: (details) => setUnconfirmed(details),
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Could not start the payment',
        description: getErrorMessage(error, 'Please try again.'),
      });
    }
  };

  // Comes back from /api/verify-payment, which only answers a paid enrolment.
  const whatsappLink = success?.whatsappLink || null;

  const buttonLabel = alreadyEnrolled
    ? 'Go to my dashboard'
    : label || `Enrol now · ${formatINR(course.price)}`;

  return (
    <>
      <Button
        variant={alreadyEnrolled ? 'outline' : variant}
        size={size}
        className={className}
        onClick={handleClick}
        disabled={busy}
      >
        {busy ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Please wait…
          </>
        ) : (
          <>
            {alreadyEnrolled ? <CheckCircle2 className="w-4 h-4" /> : null}
            {buttonLabel}
            {!alreadyEnrolled && <ArrowRight className="w-4 h-4" />}
          </>
        )}
      </Button>

      <AuthDialog
        open={authOpen}
        onOpenChange={setAuthOpen}
        title="Sign in to enrol"
        description={`One quick Google sign-in and your seat for ${course.title} is reserved while you pay.`}
      />

      {/* Step 2 - contact number, used for the receipt and batch updates */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl border-primary/15 bg-gradient-golden">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Almost there</DialogTitle>
            <DialogDescription className="text-base">
              We will send your receipt to{' '}
              <span className="font-semibold text-foreground break-all">{user?.email}</span>. Add a
              mobile number so we can reach you about batch timings.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="space-y-2">
              <Label htmlFor="enrol-phone">Mobile number</Label>
              <div className="flex items-center gap-2">
                <span className="h-11 px-3 flex items-center rounded-lg border border-input bg-background text-sm text-muted-foreground shrink-0">
                  +91
                </span>
                <Input
                  id="enrol-phone"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  placeholder="98765 43210"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                    setPhoneError('');
                  }}
                  className="h-11"
                />
              </div>
              {phoneError && <p className="text-sm text-destructive">{phoneError}</p>}
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-background/70 px-4 py-3">
              <span className="text-sm text-muted-foreground">{course.title}</span>
              <span className="font-display text-xl font-bold text-foreground">
                {formatINR(course.price)}
              </span>
            </div>

            <Button variant="hero" size="lg" className="w-full" onClick={handlePay} disabled={isProcessing}>
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Opening payment…
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Pay {formatINR(course.price)} securely
                </>
              )}
            </Button>

            <p className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Payments secured by Razorpay · UPI, cards, net banking
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Paid, but we could not confirm it - the student needs their payment ID */}
      <Dialog open={Boolean(unconfirmed)} onOpenChange={(open) => !open && setUnconfirmed(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border-amber-300 bg-amber-50">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangle className="w-9 h-9 text-amber-600" />
            </div>
            <DialogTitle className="font-display text-2xl">Your payment went through</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              We could not confirm your enrolment automatically. <strong>Your money is safe</strong> and
              we will sort this out - please send us the reference below.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            <div className="rounded-2xl border border-amber-200 bg-background/80 p-4 space-y-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">Payment reference</div>
              <code className="block text-sm font-mono break-all text-foreground">
                {unconfirmed?.paymentId}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard?.writeText(unconfirmed?.paymentId || '');
                  toast({ title: 'Copied', description: 'Payment reference copied.' });
                }}
                className="text-xs underline underline-offset-4 text-muted-foreground hover:text-foreground"
              >
                Copy reference
              </button>
            </div>

            <Button variant="hero" size="lg" className="w-full" asChild>
              <a href={`mailto:hello@brightmindsclasses.in?subject=Payment%20not%20confirmed%20-%20${unconfirmed?.paymentId}&body=My%20payment%20reference%20is%20${unconfirmed?.paymentId}`}>
                Email us about this
              </a>
            </Button>

            <Button
              variant="heroOutline"
              size="lg"
              className="w-full"
              onClick={() => {
                setUnconfirmed(null);
                navigate('/dashboard');
              }}
            >
              Check my dashboard
            </Button>

            <p className="text-xs text-muted-foreground text-center leading-relaxed">
              Enrolments usually appear within a minute. Please do not pay again.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Step 3 - success, receipt and the community link */}
      <Dialog open={Boolean(success)} onOpenChange={(open) => !open && setSuccess(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl border-primary/15 bg-gradient-golden">
          <DialogHeader className="text-center sm:text-center">
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-green-600" />
            </div>
            <DialogTitle className="font-display text-2xl">You are enrolled!</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              Receipt{' '}
              <span className="font-semibold text-foreground">{success?.receiptNo}</span>
              {success?.emailSent ? ' has been emailed to you.' : ' is saved to your dashboard.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-1">
            {whatsappLink ? (
              <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-center">
                <p className="text-sm text-green-900 leading-relaxed mb-3">
                  <strong>One last step.</strong> Batch timings, session links and all study material
                  are shared only in our private WhatsApp community.
                </p>
                <Button
                  size="lg"
                  className="w-full bg-green-500 hover:bg-green-600 text-white shadow-none"
                  asChild
                >
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4" />
                    Join the WhatsApp community
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              </div>
            ) : (
              <div className="rounded-2xl border border-primary/20 bg-background/70 p-4 text-sm text-muted-foreground">
                We will email you the WhatsApp community link shortly - it will also appear on your
                dashboard.
              </div>
            )}

            <Button
              variant="heroOutline"
              size="lg"
              className="w-full"
              onClick={() => {
                setSuccess(null);
                navigate('/dashboard');
              }}
            >
              View my dashboard
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default EnrollButton;
