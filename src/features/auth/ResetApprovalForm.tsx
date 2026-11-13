import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button';
import { Field, inputClass } from '@/shared/ui/Field';
import { completePasswordReset, checkResetContext, RosterError } from '@/features/roster/rosterApi';
import { getBrowserFingerprint, getResetKey } from '@/shared/utils/browserFingerprint';
import { signIn } from '@/shared/auth/firebase';

const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,12}$/;

const schema = z
  .object({
    password: z.string().regex(PASSWORD_PATTERN),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, { path: ['confirm'] });

type ResetValues = z.infer<typeof schema>;

type Phase = 'checking' | 'form' | 'done' | 'unavailable';

/**
 * Shown on the sign-in screen when this browser holds an approved, unused
 * password-reset approval. Lets the requester set a new password without
 * signing in first; on success signs them in automatically.
 */
export function ResetApprovalForm({ onDone }: { onDone: (email: string) => void }) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>('checking');
  const [failure, setFailure] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirm: '' },
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { available } = await checkResetContext(getBrowserFingerprint());
        if (!cancelled) setPhase(available ? 'form' : 'unavailable');
      } catch {
        if (!cancelled) setPhase('unavailable');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onSubmit = async (values: ResetValues) => {
    setFailure(null);
    const rawKey = getResetKey();
    if (!rawKey) {
      setPhase('unavailable');
      return;
    }
    try {
      const { email } = await completePasswordReset({
        resetKey: rawKey,
        browserFingerprint: getBrowserFingerprint(),
        newPassword: values.password,
      });
      setPhase('done');
      // Sign the requester in with the new password — no old password needed.
      await signIn(email, values.password);
      onDone(email);
    } catch (error) {
      if (error instanceof RosterError && error.code === 'invalid_reset_token') {
        setPhase('unavailable');
        return;
      }
      setFailure(error instanceof RosterError ? error.code : 'unknown');
    }
  };

  if (phase === 'checking') {
    return (
      <div role="status" className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-accent-600" aria-hidden="true" />
      </div>
    );
  }

  if (phase === 'unavailable') {
    return (
      <p role="status" className="rounded-lg bg-warning-50 px-3 py-3 text-sm text-warning-700">
        {t('auth.resetApproval.unavailable')}
      </p>
    );
  }

  if (phase === 'done') {
    return (
      <p role="status" className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
        {t('auth.resetApproval.success')}
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <p className="rounded-lg bg-success-50 px-3 py-2 text-sm text-success-700">
        {t('auth.resetApproval.approvedIntro')}
      </p>
      <Field
        id="reset-new-password"
        label={t('auth.changePassword.newPassword')}
        hint={t('auth.changePassword.hint')}
        error={errors.password && t('auth.errors.passwordInvalid')}
      >
        <input
          id="reset-new-password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          className={inputClass}
          {...register('password')}
        />
      </Field>
      <Field
        id="reset-confirm-password"
        label={t('auth.changePassword.confirmPassword')}
        error={errors.confirm && t('auth.errors.passwordMismatch')}
      >
        <input
          id="reset-confirm-password"
          type="password"
          autoComplete="new-password"
          dir="ltr"
          className={inputClass}
          {...register('confirm')}
        />
      </Field>
      {failure && (
        <p role="alert" className="rounded-lg bg-error-50 px-3 py-2 text-sm text-error-700">
          {t('auth.errors.generic')}
        </p>
      )}
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? t('auth.changePassword.submitting') : t('auth.changePassword.submit')}
      </Button>
    </form>
  );
}
