import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InfoIcon } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
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

  const business = businesses[0];

  return (
    <div className="flex-1 w-full flex flex-col gap-12 p-6">
      <div className="w-full">
        <div className="bg-accent text-sm p-3 px-5 rounded-md text-foreground flex gap-3 items-center">
          <InfoIcon size="16" strokeWidth={2} />
          Welcome to {business.name}! This is your business dashboard.
        </div>
      </div>
      <div className="flex flex-col gap-2 items-start">
        <h2 className="font-bold text-2xl mb-4">Business Information</h2>
        <div className="space-y-2">
          <p><strong>Business Name:</strong> {business.name}</p>
          <p><strong>Business URL:</strong> binda.app/{business.slug}</p>
          <p><strong>Plan:</strong> {business.subscription_plan}</p>
          <p><strong>Status:</strong> {business.subscription_status}</p>
        </div>
      </div>
      <div>
        <h2 className="font-bold text-2xl mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Customers</h3>
            <p className="text-sm text-muted-foreground">Manage your customers</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Transactions</h3>
            <p className="text-sm text-muted-foreground">Record sales and services</p>
          </div>
          <div className="p-4 border rounded-lg">
            <h3 className="font-semibold">Invoices</h3>
            <p className="text-sm text-muted-foreground">Create and send invoices</p>
          </div>
        </div>
      </div>
    </div>
  );
}
