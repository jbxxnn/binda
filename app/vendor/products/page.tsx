import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createProductAction, requireActiveBusiness, toggleProductAction } from "@/lib/vendor-actions";
import { formatNaira } from "@/lib/whatsapp";

export default async function VendorProductsPage() {
  await requireRole("vendor");
  const business = await requireActiveBusiness();
  const supabase = await createSupabaseServerClient();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, description, unit_price, is_active")
    .eq("business_id", business.id)
    .order("created_at", { ascending: false });

  return (
    <DashboardShell
      role="vendor"
      title="Products and services"
      subtitle="Keep your items ready for quick sale recording from WhatsApp or the dashboard."
    >
      <section className="grid two">
        <article className="panel">
          <h2>Add product or service</h2>
          <form action={createProductAction}>
            <label>
              Name
              <input name="name" placeholder="Small chops tray" required />
            </label>
            <label>
              Description
              <textarea name="description" placeholder="Short note for this item" />
            </label>
            <label>
              Price
              <input min="0" name="unit_price" step="0.01" type="number" required />
            </label>
            <label>
              <input defaultChecked name="is_active" type="checkbox" /> Active and available
            </label>
            <button type="submit">Save item</button>
          </form>
        </article>

        <article className="panel">
          <h2>Current items</h2>
          <div className="list">
            {(products ?? []).map((product) => (
              <div className="row" key={product.id}>
                <div className="stack">
                  <strong>{product.name}</strong>
                  <span className="muted">{product.description || "No description yet"}</span>
                  <span className={product.is_active ? "status-active" : "status-inactive"}>
                    {product.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="stack" style={{ justifyItems: "end" }}>
                  <strong>{formatNaira(Number(product.unit_price ?? 0))}</strong>
                  <form action={toggleProductAction}>
                    <input name="product_id" type="hidden" value={product.id} />
                    <input name="next_state" type="hidden" value={String(!product.is_active)} />
                    <button className="button secondary" type="submit">
                      Mark {product.is_active ? "inactive" : "active"}
                    </button>
                  </form>
                </div>
              </div>
            ))}
            {products?.length === 0 ? <p className="muted">No products yet.</p> : null}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
