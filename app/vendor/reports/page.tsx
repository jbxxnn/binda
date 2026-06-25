import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { getVendorReport } from "@/lib/reports";
import { requireActiveBusiness } from "@/lib/vendor-actions";
import { formatNaira } from "@/lib/whatsapp";

export default async function VendorReportsPage({
  searchParams
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requireRole("vendor");
  const params = await searchParams;
  const filter = params.filter ?? "today";
  const business = await requireActiveBusiness();
  const report = await getVendorReport(business.id, filter);

  return (
    <DashboardShell
      role="vendor"
      title="Business reports"
      subtitle="Simple numbers for sales, money collected, pending payment, and top products."
    >
      <section className="panel">
        <div className="nav-tabs">
          {["today", "yesterday", "week", "month"].map((option) => (
            <a className="nav-tab" href={`/vendor/reports?filter=${option}`} key={option}>
              {option}
            </a>
          ))}
        </div>
      </section>

      <section className="grid three">
        <article className="metric">
          <span className="muted">Total sales</span>
          <strong>{formatNaira(report?.totalSales ?? 0)}</strong>
        </article>
        <article className="metric">
          <span className="muted">Transactions</span>
          <strong>{report?.transactionsCount ?? 0}</strong>
        </article>
        <article className="metric">
          <span className="muted">Average sale</span>
          <strong>{formatNaira(report?.averageTransactionValue ?? 0)}</strong>
        </article>
      </section>

      <section className="grid two">
        <article className="panel">
          <h2>Money overview</h2>
          <div className="list">
            <div className="row">
              <span className="muted">Money collected</span>
              <strong>{formatNaira(report?.paidAmount ?? 0)}</strong>
            </div>
            <div className="row">
              <span className="muted">Pending payment</span>
              <strong>{formatNaira(report?.pendingAmount ?? 0)}</strong>
            </div>
            <div className="row">
              <span className="muted">Returning customers</span>
              <strong>{report?.returningCustomers ?? 0}</strong>
            </div>
            <div className="row">
              <span className="muted">Best sales day</span>
              <strong>{report?.bestSalesDay ?? "No data"}</strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>Top products</h2>
          <div className="list">
            {(report?.topProducts ?? []).map((product: { name: string; quantity: number; revenue: number }) => (
              <div className="row" key={product.name}>
                <div className="stack">
                  <strong>{product.name}</strong>
                  <span className="muted">{product.quantity} units sold</span>
                </div>
                <strong>{formatNaira(product.revenue)}</strong>
              </div>
            ))}
            {(report?.topProducts?.length ?? 0) === 0 ? (
              <p className="muted">Top products will show after you record more sales.</p>
            ) : null}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
