import Link from "next/link";
import { Suspense } from "react";
import { DashboardHeader } from "@/components/dashboard/header";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"


function HeaderSkeleton() {
    return (
        <div className="flex items-center gap-4">
            <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            <div className="h-8 w-8 bg-muted animate-pulse rounded" />
            <div className="h-8 w-20 bg-muted animate-pulse rounded" />
        </div>
    );
}

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-screen w-full flex-col">
            <SidebarProvider>
                <AppSidebar />
                <main className="flex-1 overflow-auto p-6">
                    <header className="flex h-16 items-center border-b px-6 justify-between">
                        <div className="font-bold text-lg">
                            <Link href="/dashboard">Binda Dashboard</Link>
                        </div>
                        <Suspense fallback={<HeaderSkeleton />}>
                            <DashboardHeader />
                        </Suspense>
                    </header>
                    {children}
                </main>
            </SidebarProvider>
        </div>
    );
}
