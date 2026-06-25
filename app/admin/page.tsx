import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { getAdminOverview } from "@/lib/reports";
import { formatNaira } from "@/lib/whatsapp";

function getCategoryName(value: { name: string } | { name: string }[] | null | undefined) {
  if (Array.isArray(value)) {
    return value[0]?.name ?? "Unassigned";
  }

  return value?.name ?? "Unassigned";
}

export default async function AdminDashboardPage() {
  await requireRole("admin");
  const overview = await getAdminOverview();

  return (
    <DashboardShell
      role="admin"
      title="Platform oversight"
      subtitle="Review businesses, filter vendors by category or location, and manage discovery enquiries."
    >
      <section className="grid three">
        <article className="metric">
          <span className="muted">Total sales</span>
          <strong>{formatNaira(overview.totalSales)}</strong>
        </article>
        <article className="metric">
          <span className="muted">Pending payments</span>
          <strong>{formatNaira(overview.totalPending)}</strong>
        </article>
        <article className="metric">
          <span className="muted">Customer enquiries</span>
          <strong>{overview.enquiriesCount}</strong>
        </article>
      </section>

      <section className="panel">
        <div className="row">
          <div>
            <h2>Businesses</h2>
            <p className="muted">Search, approve, or review active and inactive vendors.</p>
          </div>
          <span className="pill">{overview.businesses.length} businesses</span>
        </div>
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Category</th>
              <th>Location</th>
              <th>Status</th>
              <th>Activity</th>
            </tr>
          </thead>
          <tbody>
            {overview.businesses.map((business) => (
              <tr key={business.id}>
                <td>{business.business_name}</td>
                <td>{getCategoryName(business.business_categories)}</td>
                <td>{business.location_area}</td>
                <td>{business.status}</td>
                <td>{business.is_active ? "Active" : "Inactive"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </DashboardShell>
  );
}
