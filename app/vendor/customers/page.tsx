import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createCustomerAction, requireActiveBusiness } from "@/lib/vendor-actions";
import { formatNaira } from "@/lib/whatsapp";

export default async function VendorCustomersPage() {
  await requireRole("vendor");
  const business = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  const { data: customers } = await supabase
    .from("customers")
    .select("id, full_name, phone_number, notes")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });
  const { data: transactions } = await supabase
    .from("transactions")
    .select("customer_id, total_amount, amount_pending, transaction_date")
    .eq("business_id", business.id);

  const summaries = new Map<
    string,
    { totalSpent: number; pendingBalance: number; lastPurchaseDate: string | null; orders: number }
  >();

  for (const row of transactions ?? []) {
    if (!row.customer_id) continue;

    const current = summaries.get(row.customer_id) ?? {
      totalSpent: 0,
      pendingBalance: 0,
      lastPurchaseDate: null,
      orders: 0
    };

    current.totalSpent += Number(row.total_amount ?? 0);
    current.pendingBalance += Number(row.amount_pending ?? 0);
    current.orders += 1;
    current.lastPurchaseDate =
      !current.lastPurchaseDate || current.lastPurchaseDate < row.transaction_date
        ? row.transaction_date
        : current.lastPurchaseDate;
    summaries.set(row.customer_id, current);
  }

  return (
    <DashboardShell
      role="vendor"
      title="Customers"
      subtitle="See customer history, pending balances, and who buys from you most often."
    >
      <section className="grid two">
        <article className="panel">
          <h2>Add customer</h2>
          <form action={createCustomerAction}>
            <label>
              Full name
              <input name="full_name" placeholder="Mary Yusuf" required />
            </label>
            <label>
              Phone number
              <input name="phone_number" placeholder="+234..." />
            </label>
            <label>
              Email
              <input name="email" placeholder="Optional email" type="email" />
            </label>
            <label>
              Address
              <input name="address_text" placeholder="Optional address" />
            </label>
            <label>
              Notes
              <textarea name="notes" placeholder="Any useful customer note" />
            </label>
            <button type="submit">Save customer</button>
          </form>
        </article>

        <article className="panel">
          <h2>Customer history</h2>
          <div className="list">
            {(customers ?? []).map((customer) => {
              const summary = summaries.get(customer.id);

              return (
                <div className="row" key={customer.id}>
                  <div className="stack">
                    <strong>{customer.full_name}</strong>
                    <span className="muted">{customer.phone_number || "No phone number"}</span>
                    <span className="muted">{customer.notes || "No notes"}</span>
                  </div>
                  <div className="stack" style={{ justifyItems: "end" }}>
                    <strong>{formatNaira(summary?.totalSpent ?? 0)}</strong>
                    <span className="muted">{summary?.orders ?? 0} purchases</span>
                    <span className="status-pending">
                      Pending: {formatNaira(summary?.pendingBalance ?? 0)}
                    </span>
                    <span className="muted">
                      Last purchase:{" "}
                      {summary?.lastPurchaseDate
                        ? new Date(summary.lastPurchaseDate).toLocaleDateString()
                        : "No sales yet"}
                    </span>
                  </div>
                </div>
              );
            })}
            {customers?.length === 0 ? <p className="muted">No customers yet.</p> : null}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
