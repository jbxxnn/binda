import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { recordSaleAction, requireActiveBusiness } from "@/lib/vendor-actions";

export default async function VendorRecordSalePage({
  searchParams
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  await requireRole("vendor");
  const params = await searchParams;
  const business = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  const [{ data: products }, { data: customers }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, unit_price")
      .eq("business_id", business.id)
      .eq("is_active", true)
      .order("name"),
    supabase.from("customers").select("id, full_name").eq("business_id", business.id).order("full_name")
  ]);

  return (
    <DashboardShell
      role="vendor"
      title="Record sale"
      subtitle="Short and simple. Use this when you want to record a sale from the dashboard."
    >
      <section className="panel" style={{ maxWidth: 760 }}>
        {params.success ? <p className="pill">Sale recorded successfully.</p> : null}
        <form action={recordSaleAction}>
          <label>
            Customer
            <select name="customer_id" defaultValue="">
              <option value="">Walk-in customer</option>
              {(customers ?? []).map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Product or service
            <select name="product_id" defaultValue="">
              <option value="">Select an item</option>
              {(products ?? []).map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Item name
            <input name="item_name" placeholder="Cake delivery" required />
          </label>
          <div className="inline-form">
            <label>
              Quantity
              <input defaultValue="1" min="1" name="quantity" step="0.01" type="number" required />
            </label>
            <label>
              Unit price
              <input min="0" name="unit_price" step="0.01" type="number" required />
            </label>
            <label>
              Amount paid
              <input min="0" name="amount_paid" step="0.01" type="number" required />
            </label>
          </div>
          <div className="inline-form">
            <label>
              Payment status
              <select defaultValue="paid" name="payment_status">
                <option value="paid">Paid</option>
                <option value="partial">Partial</option>
                <option value="pending">Pending</option>
              </select>
            </label>
            <label>
              Payment method
              <select defaultValue="cash" name="payment_method">
                <option value="cash">Cash</option>
                <option value="transfer">Transfer</option>
                <option value="pos">POS</option>
              </select>
            </label>
          </div>
          <label>
            Notes
            <textarea name="notes" placeholder="Optional note" />
          </label>
          <button type="submit">Save sale</button>
        </form>
      </section>
    </DashboardShell>
  );
}
