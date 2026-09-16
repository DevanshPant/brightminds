import { useEffect, useState } from 'react';
import { Loader2, UserCircle, ShieldCheck } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/auth-context';
import { useProfile } from '@/hooks/useProfile';
import { apiPost } from '@/lib/api';
import { getErrorMessage } from '@/lib/errors';

/**
 * Google sign-in hands us a name and an email but never a phone number, and
 * BrightMinds needs one to reach students about batch timings. This asks for it
 * once, straight after the first sign-in, and never again afterwards.
 *
 * Mounted globally so it appears wherever the student lands after signing in.
 */
const CompleteProfileDialog = () => {
  const { user, getToken, signOut } = useAuth();
  const { profile, needsPhone, needsEmail, needsProfile } = useProfile();

  const [open, setOpen] = useState(false);
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setOpen(needsProfile);
  }, [needsProfile]);

  useEffect(() => {
    // Pre-fill from the Google account; the student can correct it.
    if (user) setFullName((current) => current || profile?.fullName || user.displayName || '');
  }, [user, profile]);

  if (!user) return null;

  const handleSave = async () => {
    const digits = phone.replace(/\D/g, '');
    if (!fullName.trim() || fullName.trim().length < 2) {
      setError('Please enter your full name.');
      return;
    }
    if (needsPhone && digits.length !== 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }
    if (needsEmail && !/^[^@\s]+@[^@\s.]+\.[^@\s]+$/.test(email.trim())) {
      setError('Please enter a valid email address for your receipt.');
      return;
    }

    setError('');
    setSaving(true);
    try {
      const token = await getToken();
      await apiPost(
        '/api/register-login',
        { phone: digits, fullName: fullName.trim(), email: email.trim() },
        token,
      );
      setOpen(false);
    } catch (err) {
      setError(getErrorMessage(err, 'Could not save your details. Please try again.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* required step - not dismissable */ }}>
      <DialogContent
        className="sm:max-w-md rounded-3xl border-primary/15 bg-gradient-golden"
        hideClose
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-golden">
            <UserCircle className="w-7 h-7 text-foreground" />
          </div>
          <DialogTitle className="font-display text-2xl">One quick detail</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">
            Just so we can reach you about batch timings and send your receipt.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Full name</Label>
            <Input
              id="profile-name"
              autoComplete="name"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setError('');
              }}
              className="h-11"
            />
          </div>

          {needsEmail && (
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email address</Label>
              <Input
                id="profile-email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                className="h-11"
              />
              <p className="text-xs text-muted-foreground">Your payment receipt is sent here.</p>
            </div>
          )}

          {needsPhone && (
          <div className="space-y-2">
            <Label htmlFor="profile-phone">Mobile number</Label>
            <div className="flex items-center gap-2">
              <span className="h-11 px-3 flex items-center rounded-lg border border-input bg-background text-sm text-muted-foreground shrink-0">
                +91
              </span>
              <Input
                id="profile-phone"
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
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                className="h-11"
              />
            </div>
          </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button variant="hero" size="lg" className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving…
              </>
            ) : (
              'Save and continue'
            )}
          </Button>

          <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
            Used only by BrightMinds to contact you about your course. We never share it.
          </p>

          {/* Never trap someone in a modal: if this fails they can still leave. */}
          <button
            type="button"
            onClick={() => signOut()}
            className="w-full text-xs text-muted-foreground hover:text-foreground underline underline-offset-4 transition-colors"
          >
            Sign out instead
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CompleteProfileDialog;
