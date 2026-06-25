import { DashboardShell } from "@/components/dashboard-shell";
import { approveBusinessAction } from "@/lib/admin-actions";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminBusinessesPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; category?: string; location?: string }>;
}) {
  await requireRole("admin");
  const params = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("businesses")
    .select("id, business_name, owner_name, location_area, status, is_active, business_categories(name)")
    .order("created_at", { ascending: false });

  if (params.q) query = query.ilike("business_name", `%${params.q}%`);
  if (params.location) query = query.ilike("location_area", `%${params.location}%`);

  const [{ data: businesses }, { data: categories }] = await Promise.all([
    query,
    supabase.from("business_categories").select("id, name").order("name")
  ]);

  const filteredBusinesses =
    params.category && businesses
      ? businesses.filter((business) => {
          const category = Array.isArray(business.business_categories)
            ? business.business_categories[0]
            : business.business_categories;
          return category?.name === params.category;
        })
      : businesses ?? [];

  return (
    <DashboardShell
      role="admin"
      title="Businesses"
      subtitle="Search vendors, review approval status, and track active or inactive businesses."
    >
      <section className="panel">
        <form className="inline-form" method="get">
          <label>
            Search
            <input defaultValue={params.q ?? ""} name="q" placeholder="Business name" />
          </label>
          <label>
            Location
            <input defaultValue={params.location ?? ""} name="location" placeholder="Tunga, Bosso..." />
          </label>
          <label>
            Category
            <select defaultValue={params.category ?? ""} name="category">
              <option value="">All categories</option>
              {(categories ?? []).map((category) => (
                <option key={category.id} value={category.name}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Filter</button>
        </form>
      </section>

      <section className="panel">
        <table>
          <thead>
            <tr>
              <th>Business</th>
              <th>Owner</th>
              <th>Category</th>
              <th>Location</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredBusinesses.map((business) => {
              const category = Array.isArray(business.business_categories)
                ? business.business_categories[0]
                : business.business_categories;

              return (
                <tr key={business.id}>
                  <td>{business.business_name}</td>
                  <td>{business.owner_name}</td>
                  <td>{category?.name ?? "Unassigned"}</td>
                  <td>{business.location_area}</td>
                  <td>
                    {business.status} / {business.is_active ? "Active" : "Inactive"}
                  </td>
                  <td>
                    <form action={approveBusinessAction}>
                      <input name="business_id" type="hidden" value={business.id} />
                      <input
                        name="status"
                        type="hidden"
                        value={business.status === "approved" ? "inactive" : "approved"}
                      />
                      <input
                        name="is_active"
                        type="hidden"
                        value={business.is_active ? "false" : "true"}
                      />
                      <button className="button secondary" type="submit">
                        {business.status === "approved" ? "Deactivate" : "Approve"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </DashboardShell>
  );
}
