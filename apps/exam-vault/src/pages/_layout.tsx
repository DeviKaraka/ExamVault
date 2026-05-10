import { Outlet } from 'react-router-dom';
import { Toaster } from '@/components/ui/sonner';

export default function Layout() {
  return (
    <>
      <Toaster richColors position="top-center" />
      <Outlet />
    </>
  );
}
