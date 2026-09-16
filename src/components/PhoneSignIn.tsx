import { useEffect, useRef, useState } from 'react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
} from 'firebase/auth';
import { ArrowLeft, Loader2, MessageSquare, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth } from '@/lib/firebase';
import { useAuth } from '@/contexts/auth-context';
import { getErrorCode, getErrorMessage } from '@/lib/errors';

/** Firebase auth codes turned into something a student can act on. */
const friendlyError = (error: unknown) => {
  switch (getErrorCode(error)) {
    case 'auth/invalid-phone-number':
      return 'That does not look like a valid mobile number.';
    case 'auth/invalid-verification-code':
      return 'That code is not right. Please check and try again.';
    case 'auth/code-expired':
      return 'That code has expired. Please request a new one.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a few minutes and try again.';
    case 'auth/quota-exceeded':
      return 'We cannot send codes right now. Please use Google sign-in, or try later.';
    case 'auth/captcha-check-failed':
      return 'Verification failed. Please reload the page and try again.';
    case 'auth/operation-not-allowed':
      return 'Phone sign-in is not enabled yet. Please use Google sign-in.';
    default:
      return getErrorMessage(error, 'Something went wrong. Please try again.');
  }
};

type Props = { onSignedIn?: () => void };

const PhoneSignIn = ({ onSignedIn }: Props) => {
  const { recordSignIn } = useAuth();

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [confirmation, setConfirmation] = useState<ConfirmationResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [resendIn, setResendIn] = useState(0);

  const verifierRef = useRef<RecaptchaVerifier | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Tear the reCAPTCHA down on unmount, otherwise a second attempt on the same
  // page throws "reCAPTCHA has already been rendered in this element".
  useEffect(() => {
    return () => {
      verifierRef.current?.clear();
      verifierRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const timer = window.setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [resendIn]);

  const resetVerifier = () => {
    verifierRef.current?.clear();
    verifierRef.current = null;
  };

  const getVerifier = () => {
    if (!auth) throw new Error('Login is not configured yet.');
    if (!verifierRef.current && containerRef.current) {
      verifierRef.current = new RecaptchaVerifier(auth, containerRef.current, {
        size: 'invisible',
      });
    }
    return verifierRef.current!;
  };

  const sendCode = async () => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      // reCAPTCHA can hang indefinitely — a blocked script, an offline tab, a
      // challenge that never renders. Without this the button would sit on
      // "Sending code…" forever with no way back.
      const result = await Promise.race([
        signInWithPhoneNumber(auth!, `+91${digits}`, getVerifier()),
        new Promise<never>((_, reject) =>
          window.setTimeout(
            () => reject(new Error('Verification timed out. Please reload the page and try again, or use Google sign-in.')),
            45000,
          ),
        ),
      ]);
      setConfirmation(result);
      setResendIn(30);
    } catch (err) {
      // A failed attempt burns the reCAPTCHA token; start fresh next time.
      resetVerifier();
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    const digits = code.replace(/\D/g, '');
    if (digits.length < 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setError('');
    setBusy(true);
    try {
      const credential = await confirmation!.confirm(digits);
      await recordSignIn(credential.user);
      onSignedIn?.();
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  const startOver = () => {
    setConfirmation(null);
    setCode('');
    setError('');
    resetVerifier();
  };

  return (
    <div className="space-y-4">
      {/* Invisible reCAPTCHA lives here; Firebase requires a real element. */}
      <div ref={containerRef} />

      {!confirmation ? (
        <>
          <div className="space-y-2">
            <Label htmlFor="signin-phone">Mobile number</Label>
            <div className="flex items-center gap-2">
              <span className="h-12 px-3 flex items-center rounded-lg border border-input bg-background text-sm text-muted-foreground shrink-0">
                +91
              </span>
              <Input
                id="signin-phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                maxLength={10}
                placeholder="98765 43210"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10));
                  setError('');
                }}
                onKeyDown={(e) => e.key === 'Enter' && sendCode()}
                className="h-12"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button variant="hero" size="lg" className="w-full" onClick={sendCode} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />}
            {busy ? 'Sending code…' : 'Send verification code'}
          </Button>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            We will text you a 6-digit code. Standard message rates may apply.
          </p>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={startOver}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Change number
          </button>

          <div className="space-y-2">
            <Label htmlFor="signin-otp">
              Enter the code sent to +91 {phone.replace(/(\d{5})(\d{5})/, '$1 $2')}
            </Label>
            <Input
              id="signin-otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.replace(/\D/g, '').slice(0, 6));
                setError('');
              }}
              onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
              className="h-12 text-center text-lg tracking-[0.4em] font-semibold"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button variant="hero" size="lg" className="w-full" onClick={verifyCode} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
            {busy ? 'Verifying…' : 'Verify and sign in'}
          </Button>

          <button
            type="button"
            onClick={sendCode}
            disabled={resendIn > 0 || busy}
            className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors disabled:no-underline disabled:opacity-60"
          >
            {resendIn > 0 ? `Resend code in ${resendIn}s` : 'Resend code'}
          </button>
        </>
      )}
    </div>
  );
};

export default PhoneSignIn;
