import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import { AppHeader } from "@/components/dashboard/app-header";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    redirect("/auth/login");
  }

  // Check if user has a business
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user.id);

  if (!businesses || businesses.length === 0) {
    redirect("/onboarding");
  }
  
  return (
    <SidebarProvider 
      style={{ "--sidebar-width": "18rem" } as React.CSSProperties}
      defaultOpen={true}
    >
      <AppSidebar />
      <SidebarInset className="!m-0 bg-brand-lightning">
        <div className="flex flex-1 flex-col h-screen bg-brand-lightning">
          <AppHeader />
          <div className="flex-1 overflow-auto bg-brand-lightning">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
