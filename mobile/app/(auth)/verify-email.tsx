import { AuthScreen } from '@/components/auth-screen';
import { VerifyEmailForm } from '@/components/verify-email-form';

export default function VerifyEmailScreen() {
  return (
    <AuthScreen
      eyebrow="Verify email"
      subtitle="Confirm your email with the verification token sent by the server."
      title="Activate your account">
      <VerifyEmailForm />
    </AuthScreen>
  );
}
