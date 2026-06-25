import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { requireActiveBusiness, updateBusinessProfileAction } from "@/lib/vendor-actions";

export default async function VendorBusinessProfilePage() {
  await requireRole("vendor");
  const business = await requireActiveBusiness();

  return (
    <DashboardShell
      role="vendor"
      title="Business profile"
      subtitle="Update the details customers and admins use to understand your business."
    >
      <section className="panel" style={{ maxWidth: 760 }}>
        <form action={updateBusinessProfileAction}>
          <label>
            Business name
            <input defaultValue={business.business_name} name="business_name" required />
          </label>
          <label>
            Owner name
            <input defaultValue={business.owner_name} name="owner_name" required />
          </label>
          <div className="inline-form">
            <label>
              Phone number
              <input defaultValue={business.phone_number} name="phone_number" required />
            </label>
            <label>
              WhatsApp number
              <input defaultValue={business.whatsapp_phone} name="whatsapp_phone" required />
            </label>
          </div>
          <label>
            Area in Minna
            <input defaultValue={business.location_area} name="location_area" required />
          </label>
          <label>
            Products or services
            <textarea defaultValue={business.products_services} name="products_services" required />
          </label>
          <label>
            <input
              defaultChecked={business.delivery_available}
              name="delivery_available"
              type="checkbox"
            />{" "}
            Delivery available
          </label>
          <button type="submit">Save profile</button>
        </form>
      </section>
    </DashboardShell>
  );
}
