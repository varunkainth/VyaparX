import { AuthScreen } from '@/components/auth-screen';
import { SignUpForm } from '@/components/sign-up-form';

export default function SignupScreen() {
  return (
    <AuthScreen
      eyebrow="Create account"
      subtitle="The mobile app reuses the same backend signup, token storage, and refresh flow."
      title="Open a VyaparX workspace on mobile">
      <SignUpForm />
    </AuthScreen>
  );
}
