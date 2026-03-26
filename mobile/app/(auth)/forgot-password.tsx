import { AuthScreen } from '@/components/auth-screen';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export default function ForgotPasswordScreen() {
  return (
    <AuthScreen
      eyebrow="Reset access"
      subtitle="Start the password reset flow and then continue with the reset token from your email."
      title="Recover your password">
      <ForgotPasswordForm />
    </AuthScreen>
  );
}
