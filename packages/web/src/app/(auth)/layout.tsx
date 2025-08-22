import SharePayLogo from '@/components/sharepay-logo';
import type { ReactNode } from 'react';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-gradient-to-br from-sky-50 via-white to-green-50 p-4">
      <div className="flex w-full max-w-sm flex-col items-center">
        <header className="mb-8">
          <SharePayLogo />
        </header>
        <main className="w-full">{children}</main>
        <footer className="mt-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 SharePay. All rights reserved.</p>
        </footer>
      </div>
    </div>
  );
}
