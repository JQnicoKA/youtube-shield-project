import { CommentsScreen } from '@/components/comments-screen';
import { LoginScreen } from '@/components/login-screen';
import { useAuth } from '@/providers/auth-provider';

export default function Index() {
  const { status, channel } = useAuth();

  if (status === 'loading') return null; // le splash screen reste affiché
  if (status === 'signedOut' || !channel) return <LoginScreen />;
  return <CommentsScreen channel={channel} />;
}
