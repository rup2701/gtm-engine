import DashboardShell from '../components/DashboardShell';

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return <DashboardShell>{children}</DashboardShell>;
}
