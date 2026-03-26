import { AuthScreen } from '@/components/auth-screen';
import { ResetPasswordForm } from '@/components/reset-password-form';

export default function ResetPasswordScreen() {
  return (
    <AuthScreen
      eyebrow="Reset access"
      subtitle="Enter the reset token from your email and choose a new password."
      title="Set a new password">
      <ResetPasswordForm />
    </AuthScreen>
  );
}
