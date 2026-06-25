import Link from "next/link";

export default function HomePage() {
  return (
    <main className="shell grid" style={{ paddingTop: 40 }}>
      <section className="hero grid">
        <span className="pill">WhatsApp-first business records for Minna vendors</span>
        <div className="grid two">
          <div>
            <h1>Binda helps small vendors record sales, track customers, and see simple reports.</h1>
            <p className="muted">
              The MVP combines Supabase Auth, WhatsApp Cloud API, WhatsApp Flows, vendor dashboards,
              admin oversight, and secure per-business data access.
            </p>
          </div>
          <div className="panel">
            <h2>MVP Modules</h2>
            <div className="list muted">
              <span>Vendor onboarding from WhatsApp Flow</span>
              <span>Sale recording with payment status</span>
              <span>Products, customers, and business reports</span>
              <span>Admin discovery, approval, and enquiry routing</span>
            </div>
          </div>
        </div>
        <div className="row">
          <Link className="button" href="/login">
            Login to dashboard
          </Link>
          <Link className="button secondary" href="/vendor">
            View vendor dashboard shell
          </Link>
        </div>
      </section>
    </main>
  );
}
