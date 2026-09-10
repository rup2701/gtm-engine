import DashboardShell from '../components/DashboardShell';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardLayout({ children }: LayoutProps<'/'>) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  return <DashboardShell>{children}</DashboardShell>;
}
