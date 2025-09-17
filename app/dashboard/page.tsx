
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  DollarSign, 
  FileText, 
  TrendingUp, 
  Plus,
  Eye
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // Get current user and business
  const { data: { user } } = await supabase.auth.getUser();
  const { data: businesses } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', user!.id);

  const business = businesses![0];

  // Get some basic stats
  const { data: customers } = await supabase
    .from('customers')
    .select('id')
    .eq('business_id', business.id);

  const { data: transactions } = await supabase
    .from('transactions')
    .select('amount')
    .eq('business_id', business.id);

  const totalRevenue = transactions?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0;
  const customerCount = customers?.length || 0;

  return (
    <div className="flex flex-1 flex-col gap-6 p-6 bg-brand-lightning">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back!</h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening with {business.name} today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customerCount}</div>
            <p className="text-xs text-muted-foreground">
              +5 new this month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transactions</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{transactions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              No pending invoices
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Customers
            </CardTitle>
            <CardDescription>
              Manage your customer database
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Customer
            </Button>
            <Button className="w-full" variant="ghost">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Transactions
            </CardTitle>
            <CardDescription>
              Record sales and payments
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              New Transaction
            </Button>
            <Button className="w-full" variant="ghost">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoices
            </CardTitle>
            <CardDescription>
              Create and send invoices
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full" variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
            <Button className="w-full" variant="ghost">
              <Eye className="h-4 w-4 mr-2" />
              View All
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Business Info */}
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <CardDescription>
            Your business details and subscription status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="font-medium">Business Name</h4>
              <p className="text-sm text-muted-foreground">{business.name}</p>
            </div>
            <div>
              <h4 className="font-medium">Business URL</h4>
              <p className="text-sm text-muted-foreground">binda.app/{business.slug}</p>
            </div>
            <div>
              <h4 className="font-medium">Plan</h4>
              <Badge variant="secondary">{business.subscription_plan}</Badge>
            </div>
            <div>
              <h4 className="font-medium">Status</h4>
              <Badge variant="outline">{business.subscription_status}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
