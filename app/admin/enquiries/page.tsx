import { DashboardShell } from "@/components/dashboard-shell";
import { createEnquiryAction } from "@/lib/admin-actions";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminEnquiriesPage() {
  await requireRole("admin");
  const supabase = await createSupabaseServerClient();
  const [{ data: enquiries }, { data: categories }] = await Promise.all([
    supabase
      .from("enquiries")
      .select("id, customer_name, customer_phone, location_area, requested_item, status, matched_business_ids, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("business_categories").select("id, name").order("name")
  ]);

  return (
    <DashboardShell
      role="admin"
      title="Customer enquiries"
      subtitle="Capture customer requests and match them to nearby or relevant vendors."
    >
      <section className="grid two">
        <article className="panel">
          <h2>Create enquiry</h2>
          <form action={createEnquiryAction}>
            <label>
              Customer name
              <input name="customer_name" placeholder="Optional name" />
            </label>
            <label>
              Customer phone
              <input name="customer_phone" placeholder="+234..." />
            </label>
            <label>
              Category
              <select name="category_id" required>
                <option value="">Select category</option>
                {(categories ?? []).map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Area in Minna
              <input name="location_area" placeholder="Tunga" required />
            </label>
            <label>
              Requested item or service
              <input name="requested_item" placeholder="Cake" required />
            </label>
            <label>
              Details
              <textarea name="details" placeholder="Extra request details" />
            </label>
            <button type="submit">Save enquiry</button>
          </form>
        </article>

        <article className="panel">
          <h2>Recent enquiries</h2>
          <div className="list">
            {(enquiries ?? []).map((enquiry) => (
              <div className="row" key={enquiry.id}>
                <div className="stack">
                  <strong>{enquiry.requested_item}</strong>
                  <span className="muted">{enquiry.location_area}</span>
                  <span className="muted">{enquiry.customer_name || "Unnamed customer"}</span>
                </div>
                <div className="stack" style={{ justifyItems: "end" }}>
                  <span className={enquiry.status === "matched" ? "status-approved" : "status-pending"}>
                    {enquiry.status}
                  </span>
                  <span className="muted">{enquiry.matched_business_ids.length} vendors matched</span>
                </div>
              </div>
            ))}
            {enquiries?.length === 0 ? <p className="muted">No enquiries yet.</p> : null}
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
