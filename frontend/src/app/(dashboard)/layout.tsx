import { ConsoleTopBar } from '@/components/dashboard/ConsoleTopBar';
import { MobileNav, Sidebar } from '@/components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div
        className="pointer-events-none fixed inset-0 bg-console-grid bg-[length:40px_40px] opacity-100"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-console-vignette"
        aria-hidden
      />
      <div className="relative flex min-h-screen flex-col">
        <MobileNav />
        <div className="flex min-h-0 flex-1">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <ConsoleTopBar />
            <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
              <div className="mx-auto max-w-7xl">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
