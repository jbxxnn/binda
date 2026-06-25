import { DashboardShell } from "@/components/dashboard-shell";
import { requireRole } from "@/lib/auth";
import { requireActiveBusiness } from "@/lib/vendor-actions";

export default async function VendorSettingsPage() {
  await requireRole("vendor");
  const business = await requireActiveBusiness();

  return (
    <DashboardShell
      role="vendor"
      title="Settings"
      subtitle="Keep the WhatsApp assistant simple and ready for your daily business use."
    >
      <section className="grid two">
        <article className="panel">
          <h2>Assistant setup</h2>
          <div className="list">
            <div className="row">
              <span className="muted">WhatsApp number</span>
              <strong>{business.whatsapp_phone}</strong>
            </div>
            <div className="row">
              <span className="muted">Business status</span>
              <strong>{business.status}</strong>
            </div>
            <div className="row">
              <span className="muted">Delivery</span>
              <strong>{business.delivery_available ? "Available" : "Not available"}</strong>
            </div>
          </div>
        </article>

        <article className="panel">
          <h2>Planned next settings</h2>
          <div className="list muted">
            <span>Daily reminder time</span>
            <span>Weekly summary day and time</span>
            <span>Default payment method</span>
            <span>Notification preferences</span>
          </div>
        </article>
      </section>
    </DashboardShell>
  );
}
