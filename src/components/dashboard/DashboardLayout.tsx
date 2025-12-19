"use client";

import { SessionProvider } from "next-auth/react";
import { SidebarNav } from "./SidebarNav";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <SessionProvider>
      <div className="relative flex size-full min-h-screen bg-background-light dark:bg-background-dark">
        <SidebarNav />
        <main className="flex-1 p-6 md:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
