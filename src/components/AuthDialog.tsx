import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/auth-context';
import { getErrorMessage } from '@/lib/errors';
import { useToast } from '@/hooks/use-toast';
import GoogleSignInButton from '@/components/GoogleSignInButton';
import { ShieldCheck, Sparkles, AlertCircle } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
};

const AuthDialog = ({
  open,
  onOpenChange,
  title = 'Sign in to continue',
  description = 'Use your Google account - no password to remember, and your enrolments stay saved.',
}: Props) => {
  const { signInWithGoogle, configured } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);

  const handleSignIn = async () => {
    setBusy(true);
    try {
      await signInWithGoogle();
      onOpenChange(false);
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border-primary/15 bg-gradient-golden">
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-2xl bg-gradient-accent flex items-center justify-center shadow-golden">
            <Sparkles className="w-7 h-7 text-foreground" />
          </div>
          <DialogTitle className="font-display text-2xl">{title}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed">{description}</DialogDescription>
        </DialogHeader>

        {configured ? (
          <div className="space-y-4 pt-2">
            <GoogleSignInButton onClick={handleSignIn} loading={busy} />
            <p className="flex items-start gap-2 text-xs text-muted-foreground leading-relaxed">
              <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              We only read your name, email and profile picture. By continuing you agree to our{' '}
              <a href="/terms-of-use" className="underline hover:text-foreground">
                Terms
              </a>{' '}
              and{' '}
              <a href="/privacy-policy" className="underline hover:text-foreground">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-2xl border border-primary/20 bg-background/70 p-4 text-sm text-muted-foreground">
            <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <span>
              Student login is being set up and will be live shortly. In the meantime, reach us on
              WhatsApp or through the enquiry form and we will get you enrolled.
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthDialog;
