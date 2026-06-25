import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { getVendorBusinesses, getVendorDashboardSummary } from "@/lib/reports";
import { formatNaira } from "@/lib/whatsapp";

export default async function VendorDashboardPage() {
  const currentUser = await requireRole("vendor");
  const memberships = await getVendorBusinesses();
  const activeBusiness = Array.isArray(memberships[0]?.businesses)
    ? memberships[0]?.businesses[0]
    : memberships[0]?.businesses;
  const summary = activeBusiness ? await getVendorDashboardSummary(activeBusiness.id) : null;

  return (
    <DashboardShell
      role="vendor"
      title={`Welcome back${currentUser?.profile?.full_name ? `, ${currentUser.profile.full_name}` : ""}`}
      subtitle="Track sales, pending payments, products, customers, and simple business reports."
    >
      <section className="grid three">
        <article className="metric">
          <span className="muted">Today&apos;s sales</span>
          <strong>{formatNaira(summary?.todaySales ?? 0)}</strong>
        </article>
        <article className="metric">
          <span className="muted">Monthly sales</span>
          <strong>{formatNaira(summary?.monthlySales ?? 0)}</strong>
        </article>
        <article className="metric">
          <span className="muted">Pending payment</span>
          <strong>{formatNaira(summary?.pendingPayments ?? 0)}</strong>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <h2>Business snapshot</h2>
          {activeBusiness ? (
            <div className="list">
              <div className="row">
                <span className="muted">Business</span>
                <strong>{activeBusiness.business_name}</strong>
              </div>
              <div className="row">
                <span className="muted">Location</span>
                <strong>{activeBusiness.location_area}</strong>
              </div>
              <div className="row">
                <span className="muted">Transactions today</span>
                <strong>{summary?.transactionsToday ?? 0}</strong>
              </div>
              <div className="row">
                <span className="muted">Customers</span>
                <strong>{summary?.customersCount ?? 0}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">No linked business yet. Complete onboarding from WhatsApp to get started.</p>
          )}
        </article>

        <article className="panel">
          <h2>WhatsApp vendor menu</h2>
          <div className="list">
            {["Record Sale", "Products", "Customers", "Reports", "Business Profile", "Settings"].map((item) => (
              <div className="row" key={item}>
                <span>{item}</span>
                <span className="pill">Flow or quick action</span>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <h2>Top products</h2>
          <div className="list">
            {summary?.topProducts.length ? (
              summary.topProducts.map((product) => (
                <div className="row" key={product.name}>
                  <div>
                    <strong>{product.name}</strong>
                    <div className="muted">{product.totalSold} units sold</div>
                  </div>
                  <strong>{formatNaira(product.revenue)}</strong>
                </div>
              ))
            ) : (
              <p className="muted">No product sales yet.</p>
            )}
          </div>
        </article>

        <article className="panel">
          <h2>Recent transactions</h2>
          <div className="list">
            {summary?.recentTransactions.length ? (
              summary.recentTransactions.map((transaction) => (
                <div className="row" key={transaction.id}>
                  <div>
                    <strong>{transaction.customerName}</strong>
                    <div className="muted">{transaction.paymentStatus}</div>
                  </div>
                  <strong>{formatNaira(transaction.totalAmount)}</strong>
                </div>
              ))
            ) : (
              <p className="muted">Sales recorded from WhatsApp will show here.</p>
            )}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
